import assert from 'assert';
import { intToPrefix, formatCode, MAX_NUM, allocateSequentialCodes } from '../src/lib/sequence';
import { validateQRCode } from '../src/lib/validation';
import { getDb } from '../src/lib/mongodb';
import { InventoryItem, Batch, Kit } from '../src/types';

async function runAllTests() {
  console.log('====================================================');
  console.log('STARTING QR INVENTORY & SEQUENCE TESTS (Section 50)');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // 1. SEQUENCE & BIJECTIVE BASE-26 TESTS
  // ----------------------------------------------------
  console.log('[Test 1] Testing sequence algorithm & rollovers...');
  
  // A00001 & A00002
  assert.strictEqual(formatCode(0, 'serial'), 'A00001');
  assert.strictEqual(formatCode(1, 'serial'), 'A00002');
  console.log('  ✓ A00001 and A00002 match exact format');

  // A99999
  assert.strictEqual(formatCode(MAX_NUM - 1, 'serial'), 'A99999');
  console.log('  ✓ A99999 matches');

  // Rollover A99999 -> B00001
  assert.strictEqual(formatCode(MAX_NUM, 'serial'), 'B00001');
  console.log('  ✓ Rollover: A99999 -> B00001 matches');

  // Z99999
  const zEndIndex = 26 * MAX_NUM - 1;
  assert.strictEqual(formatCode(zEndIndex, 'serial'), 'Z99999');
  console.log('  ✓ Z99999 matches');

  // Rollover Z99999 -> AA00001
  assert.strictEqual(formatCode(zEndIndex + 1, 'serial'), 'AA00001');
  console.log('  ✓ Rollover: Z99999 -> AA00001 matches');

  // AB00001
  const abStartIndex = 27 * MAX_NUM;
  assert.strictEqual(formatCode(abStartIndex, 'serial'), 'AB00001');
  console.log('  ✓ AB00001 matches');

  // ----------------------------------------------------
  // 2. QR PAYLOAD FORMAT TESTS
  // ----------------------------------------------------
  console.log('\n[Test 2] Testing exact QR payload formatting...');
  assert.strictEqual(formatCode(0, 'batch'), 'BAT-A00001');
  assert.strictEqual(formatCode(0, 'kit'), 'KIT-A00001');
  assert.strictEqual(formatCode(0, 'serial'), 'A00001');
  console.log('  ✓ Exact payloads BAT-A00001, KIT-A00001, A00001 verified');

  // ----------------------------------------------------
  // 3. INVALID QR REJECTION TESTS
  // ----------------------------------------------------
  console.log('\n[Test 3] Testing invalid QR inputs rejection...');
  const invalidCodes = ['hello', '123456', 'BAT-hello', 'KIT-123', 'A123', '   ', 'KIT-'];
  for (const code of invalidCodes) {
    const val = validateQRCode(code);
    assert.strictEqual(val.valid, false, `Expected "${code}" to be rejected`);
  }
  console.log('  ✓ All invalid QR formats correctly rejected');

  // Valid inputs
  assert.strictEqual(validateQRCode('A00001').valid, true);
  assert.strictEqual(validateQRCode('BAT-A00001').valid, true);
  assert.strictEqual(validateQRCode('KIT-A00001').valid, true);
  // Case insensitivity & normalization
  assert.strictEqual(validateQRCode(' bat-a00001 ').normalizedCode, 'BAT-A00001');
  console.log('  ✓ Valid QR formats correctly recognized and normalized');

  // ----------------------------------------------------
  // 4. MONGODB ATOMIC SEQUENCE CONCURRENCY TEST
  // ----------------------------------------------------
  console.log('\n[Test 4] Connecting to MongoDB and verifying collections...');
  const db = await getDb();
  console.log('  ✓ Database connected');

  // Verify master product seeding
  const productCount = await db.collection('products').countDocuments();
  console.log(`  ✓ Master products count in DB: ${productCount} (expected 146)`);
  assert.ok(productCount >= 146, 'Master products should have at least 146 seeded items');

  console.log('\n[Test 5] Testing concurrent atomic sequence generation...');
  // Simulate 10 simultaneous workers generating batches of 5 serials each
  const concurrentWorkers = 10;
  const codesPerWorker = 5;
  const promises = Array.from({ length: concurrentWorkers }, () =>
    allocateSequentialCodes(db, 'serial', codesPerWorker)
  );

  const results = await Promise.all(promises);
  const allGeneratedCodes = results.flat();

  // Verify no duplicates generated across concurrent requests
  const uniqueGenerated = new Set(allGeneratedCodes);
  assert.strictEqual(allGeneratedCodes.length, uniqueGenerated.size, 'No duplicates in concurrent allocation');
  console.log(`  ✓ Concurrently allocated ${allGeneratedCodes.length} serial codes with 0 collisions`);

  // ----------------------------------------------------
  // 5. BATCH AND SERIAL DUPLICATE PREVENTION TEST
  // ----------------------------------------------------
  console.log('\n[Test 6] Testing Batch Creation & Duplicate Product Scan...');
  const inventoryColl = db.collection<InventoryItem>('inventoryItems');
  const batchesColl = db.collection<Batch>('batches');
  const kitsColl = db.collection<Kit>('kits');

  const testSerial = `TEST${Date.now().toString().slice(-5)}`;
  const testBatch = `BAT-T${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  // Create Batch
  await batchesColl.insertOne({
    code: testBatch,
    baseCode: testBatch.replace('BAT-', ''),
    status: 'open',
    productCount: 0,
    createdAt: now,
    updatedAt: now,
  });

  // First product scan: add to batch
  const testItem: InventoryItem = {
    serialCode: testSerial,
    productId: 'test_prod_1',
    productName: 'Pump (Gen Pure)',
    partCode: 'Pump (Gen Pure)',
    category: 'Pumps',
    batchId: 'test_batch_id',
    batchCode: testBatch,
    kitId: null,
    kitCode: null,
    status: 'in_batch',
    createdAt: now,
    updatedAt: now,
  };

  await inventoryColl.insertOne(testItem);
  console.log(`  ✓ Successfully registered serial ${testSerial} into batch ${testBatch}`);

  // Duplicate scan attempt: scan same serial again
  let duplicateRejected = false;
  try {
    // Attempt duplicate insert with same serialCode
    await inventoryColl.insertOne({
      ...testItem,
      _id: undefined,
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: number }).code === 11000) {
      duplicateRejected = true;
    }
  }
  assert.strictEqual(duplicateRejected, true, 'Duplicate serial MUST be rejected by MongoDB unique index');
  console.log('  ✓ Duplicate scan attempt blocked at database unique constraint level');

  // ----------------------------------------------------
  // 6. KIT ASSIGNMENT & SINGLE-KIT DUPLICATE ENFORCEMENT
  // ----------------------------------------------------
  console.log('\n[Test 7] Testing Kit Assignment & Kit Duplicate Rejection...');
  const testKit1 = `KIT-K${Date.now().toString().slice(-4)}1`;
  const testKit2 = `KIT-K${Date.now().toString().slice(-4)}2`;

  await kitsColl.insertMany([
    { code: testKit1, status: 'open', itemCount: 0, createdAt: now, updatedAt: now },
    { code: testKit2, status: 'open', itemCount: 0, createdAt: now, updatedAt: now },
  ]);

  // Assign serial to Kit 1 atomically
  const assignResult = await inventoryColl.findOneAndUpdate(
    { serialCode: testSerial, kitCode: null },
    { $set: { kitCode: testKit1, status: 'in_kit', updatedAt: now } },
    { returnDocument: 'after' }
  );
  assert.ok(assignResult !== null, 'Serial should successfully assign to Kit 1');
  console.log(`  ✓ Assigned serial ${testSerial} to kit ${testKit1}`);

  // Attempt to assign same serial to Kit 2
  const reassignResult = await inventoryColl.findOneAndUpdate(
    { serialCode: testSerial, kitCode: null }, // Concurrency guard: kitCode must be null
    { $set: { kitCode: testKit2, status: 'in_kit', updatedAt: now } },
    { returnDocument: 'after' }
  );
  assert.strictEqual(reassignResult, null, 'Serial already in kit 1 cannot be added to kit 2');
  console.log('  ✓ Second kit assignment attempt successfully rejected (Already assigned to kit)');

  // ----------------------------------------------------
  // 7. CONCURRENT RACE-CONDITION REGISTRATION SIMULATION
  // ----------------------------------------------------
  console.log('\n[Test 8] Simulating concurrent scan requests for same serial...');
  const raceSerial = `RACE${Date.now().toString().slice(-5)}`;
  const raceItem = {
    serialCode: raceSerial,
    productId: 'test_prod_1',
    productName: 'RO Membrane',
    partCode: 'RO Membrane',
    batchId: 'test_batch_id',
    batchCode: testBatch,
    kitId: null,
    kitCode: null,
    status: 'in_batch' as const,
    createdAt: now,
    updatedAt: now,
  };

  const resultsSim = await Promise.allSettled([
    inventoryColl.insertOne({ ...raceItem }),
    inventoryColl.insertOne({ ...raceItem }),
  ]);

  const fulfilled = resultsSim.filter((r) => r.status === 'fulfilled');
  const rejected = resultsSim.filter((r) => r.status === 'rejected');

  assert.strictEqual(fulfilled.length, 1, 'Exactly ONE request must succeed in race condition');
  assert.strictEqual(rejected.length, 1, 'The competing concurrent request must be rejected');
  console.log('  ✓ Race condition handled: Exactly 1 registered, competing request cleanly rejected');

  console.log('\n====================================================');
  console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ✓✓✓');
  console.log('====================================================');

  process.exit(0);
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
