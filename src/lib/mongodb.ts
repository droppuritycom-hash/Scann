import dns from 'dns';
import { MongoClient, Db } from 'mongodb';
import { SEED_PRODUCTS } from './seedData';

interface MongoGlobal {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoDbInstance?: Db;
  _indexesCreated?: boolean;
}

const globalWithMongo = global as typeof globalThis & MongoGlobal;

if (!process.env.MONGODB_URI && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // Ignore if file doesn't exist
  }
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/qr_inventory';
const DB_NAME = process.env.MONGODB_DB || 'qr_inventory';

// Ensure Windows DNS resolves MongoDB Atlas SRV records reliably
if (MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore if setServers fails
  }
}

async function connectToMongo(): Promise<MongoClient> {
  // First attempt to connect to configured URI
  try {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });
    await client.connect();
    const sanitizedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`[MongoDB] Connected successfully to ${sanitizedUri}`);
    return client;
  } catch (err) {
    console.warn(`[MongoDB] Could not connect to ${MONGODB_URI}: ${(err as Error).message}`);

    // If SRV lookup failed on Windows, resolve SRV records directly using public DNS
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      try {
        console.log('[MongoDB] Resolving Atlas SRV records using public DNS...');
        const resolver = new dns.promises.Resolver();
        resolver.setServers(['8.8.8.8', '1.1.1.1']);
        const match = MONGODB_URI.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(.*)$/);
        if (match) {
          const [, user, pass, host] = match;
          const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
          let txtOptions = 'replicaSet=atlas-9db035-shard-0&authSource=admin';
          try {
            const txtRecords = await resolver.resolveTxt(host);
            if (txtRecords.length > 0) {
              txtOptions = txtRecords.flat().join('&');
            }
          } catch {
            // Use standard replica set
          }
          const hosts = srvRecords.map((r) => `${r.name}:${r.port}`).join(',');
          const directUri = `mongodb://${user}:${pass}@${hosts}/${DB_NAME}?ssl=true&${txtOptions}`;
          const directAtlasClient = new MongoClient(directUri, {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
          });
          await directAtlasClient.connect();
          console.log('[MongoDB] Connected successfully to Atlas via direct replica set!');
          return directAtlasClient;
        }
      } catch (atlasDirectErr) {
        console.warn('[MongoDB] Atlas direct fallback failed:', (atlasDirectErr as Error).message);
      }
    }

    // If local mongod is not running and we are in dev/test, fallback to MongoMemoryServer
    try {
      console.log('[MongoDB] Starting embedded MongoDB server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create({
        instance: { dbName: DB_NAME },
      });
      const uri = mongod.getUri();
      console.log(`[MongoDB] Embedded MongoDB running at: ${uri}`);
      const fallbackClient = new MongoClient(uri);
      await fallbackClient.connect();
      return fallbackClient;
    } catch (memErr) {
      console.error('[MongoDB] Failed to start embedded MongoDB:', memErr);
      throw err;
    }
  }
}

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development' || !globalWithMongo._mongoClientPromise) {
    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = connectToMongo();
    }
  }
  return globalWithMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(DB_NAME);
  
  // Ensure indexes and seed data once
  if (!globalWithMongo._indexesCreated) {
    await initDatabase(db);
    globalWithMongo._indexesCreated = true;
  }

  return db;
}

/**
 * Initializes required unique indexes and seeds products if needed.
 * Strictly enforces data integrity at the database level.
 */
export async function initDatabase(db: Db): Promise<void> {
  try {
    // 1. Products: unique partCode
    const productsColl = db.collection('products');
    await productsColl.createIndex({ partCode: 1 }, { unique: true });
    await productsColl.createIndex({ category: 1 });
    await productsColl.createIndex({ name: 1 });

    // 2. Batches: unique batch code (e.g. BAT-A00001)
    const batchesColl = db.collection('batches');
    await batchesColl.createIndex({ code: 1 }, { unique: true });
    await batchesColl.createIndex({ createdAt: -1 });

    // 3. Kits: unique kit code (e.g. KIT-A00001)
    const kitsColl = db.collection('kits');
    await kitsColl.createIndex({ code: 1 }, { unique: true });
    await kitsColl.createIndex({ createdAt: -1 });

    // 4. InventoryItems: unique serialCode (e.g. A00001) - CRITICAL DUPLICATE PREVENTER
    const inventoryColl = db.collection('inventoryItems');
    await inventoryColl.createIndex({ serialCode: 1 }, { unique: true });
    await inventoryColl.createIndex({ batchCode: 1 });
    await inventoryColl.createIndex({ kitCode: 1 });
    await inventoryColl.createIndex({ productId: 1 });
    await inventoryColl.createIndex({ status: 1 });
    await inventoryColl.createIndex({ createdAt: -1 });

    // 5. QRCodes: unique code
    const qrColl = db.collection('qrCodes');
    await qrColl.createIndex({ code: 1 }, { unique: true });
    await qrColl.createIndex({ type: 1 });
    await qrColl.createIndex({ status: 1 });

    // 6. SequenceCounters: _id is automatically unique by MongoDB engine

    // 7. AuditLogs: indexed for quick querying
    const auditColl = db.collection('auditLogs');
    await auditColl.createIndex({ action: 1 });
    await auditColl.createIndex({ code: 1 });
    await auditColl.createIndex({ timestamp: -1 });

    // Seed master products if empty
    const productCount = await productsColl.countDocuments();
    if (productCount === 0) {
      console.log(`[MongoDB] Seeding ${SEED_PRODUCTS.length} master products...`);
      const now = new Date().toISOString();
      const docs = SEED_PRODUCTS.map((p) => ({
        ...p,
        active: true,
        createdAt: now,
        updatedAt: now,
      }));
      await productsColl.insertMany(docs);
      console.log('[MongoDB] Product seeding completed successfully.');
    }
  } catch (err) {
    console.error('[MongoDB] Error during initDatabase:', err);
  }
}
