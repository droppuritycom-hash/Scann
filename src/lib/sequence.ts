import { Db } from 'mongodb';
import { EntityType } from '@/types';

export const MAX_NUM = 99999;

/**
 * Bijective base-26 conversion (1 -> A, 2 -> B, ..., 26 -> Z, 27 -> AA)
 */
export function intToPrefix(num: number): string {
  let prefix = '';
  let n = num;

  while (n > 0) {
    const rem = (n - 1) % 26;
    prefix = String.fromCharCode(65 + rem) + prefix;
    n = Math.floor((n - 1) / 26);
  }

  return prefix;
}

/**
 * Converts a 0-based global sequence index to standard ERP code
 * Examples:
 * index 0, type 'serial' -> A00001
 * index 0, type 'batch'  -> BAT-A00001
 * index 0, type 'kit'    -> KIT-A00001
 */
export function formatCode(globalIndex: number, type: EntityType = 'serial'): string {
  const prefixVal = Math.floor(globalIndex / MAX_NUM) + 1;
  const num = (globalIndex % MAX_NUM) + 1;

  const base = `${intToPrefix(prefixVal)}${num.toString().padStart(5, '0')}`;

  if (type === 'batch') return `BAT-${base}`;
  if (type === 'kit') return `KIT-${base}`;

  return base;
}

/**
 * Atomically allocates next sequential code(s) from MongoDB.
 * Thread-safe and race-condition free using atomic $inc.
 *
 * @param db MongoDB database instance
 * @param type 'serial' | 'batch' | 'kit'
 * @param count Number of codes to allocate (default 1)
 * @returns Array of generated codes
 */
export async function allocateSequentialCodes(
  db: Db,
  type: EntityType,
  count: number = 1
): Promise<string[]> {
  if (count < 1) {
    throw new Error('Count must be at least 1');
  }

  const sequenceColl = db.collection('sequenceCounters');

  // Atomically increment the sequence counter
  const result = await sequenceColl.findOneAndUpdate(
    { _id: type as unknown as import('mongodb').ObjectId },
    {
      $inc: { globalIndex: count },
      $set: { updatedAt: new Date().toISOString() },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  const newIndex = result?.globalIndex ?? count;
  const startIndex = newIndex - count;

  const codes: string[] = [];
  for (let i = startIndex; i < newIndex; i++) {
    codes.push(formatCode(i, type));
  }

  return codes;
}

/**
 * Reads the current global index without incrementing it, returning the upcoming code.
 */
export async function peekNextSequentialCode(
  db: Db,
  type: EntityType
): Promise<{ nextIndex: number; nextCode: string }> {
  const sequenceColl = db.collection('sequenceCounters');
  const doc = await sequenceColl.findOne({ _id: type as unknown as import('mongodb').ObjectId });
  const nextIndex = doc?.globalIndex ?? 0;
  return {
    nextIndex,
    nextCode: formatCode(nextIndex, type),
  };
}
