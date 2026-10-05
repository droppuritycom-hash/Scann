import { getDb, getMongoClient } from '../src/lib/mongodb';

async function resetData() {
  console.log('Connecting to database...');
  const db = await getDb();

  const productsCountBefore = await db.collection('products').countDocuments();
  console.log(`Current Master Catalog Products: ${productsCountBefore} (WILL BE PRESERVED)`);

  const collectionsToClear = [
    'batches',
    'kits',
    'inventoryItems',
    'qrCodes',
    'auditLogs',
    'sequenceCounters',
  ];

  for (const collName of collectionsToClear) {
    const countBefore = await db.collection(collName).countDocuments();
    const result = await db.collection(collName).deleteMany({});
    console.log(`Cleared collection '${collName}': deleted ${result.deletedCount} items (was ${countBefore})`);
  }

  // Verify master catalog is preserved
  const productsCountAfter = await db.collection('products').countDocuments();
  console.log(`\nVerification:`);
  console.log(`- Master Catalog Products: ${productsCountAfter} (Preserved ✓)`);

  for (const collName of collectionsToClear) {
    const countAfter = await db.collection(collName).countDocuments();
    console.log(`- ${collName}: ${countAfter} (Reset to 0 ✓)`);
  }

  console.log('\nDatabase reset completed successfully. You can now start completely fresh!');
  const client = await getMongoClient();
  await client.close();
  process.exit(0);
}

resetData().catch((err) => {
  console.error('Error resetting database:', err);
  process.exit(1);
});
