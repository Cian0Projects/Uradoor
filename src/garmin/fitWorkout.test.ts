import { describe, expect, it } from 'vitest';
import { fitCrc, fitFilename, workoutToFit } from './fitWorkout';
import { buildSchedule } from '../timer/buildSchedule';
import type { Workout } from '../types';

const tabata: Workout = {
  id: 't',
  name: 'Tabata',
  sets: 1,
  repsPerSet: 8,
  work: { kind: 'timed', seconds: 20 },
  restBetweenRepsSec: 10,
  restBetweenSetsSec: 0,
};

const distanceSession: Workout = {
  id: 'r',
  name: '3 × (5 × 400m)',
  sets: 3,
  repsPerSet: 5,
  work: { kind: 'manual' },
  restBetweenRepsSec: 90,
  restBetweenSetsSec: 180,
  warmupSec: 600,
  cooldownSec: 300,
};

function readU16LE(b: Uint8Array, off: number): number {
  return b[off] | (b[off + 1] << 8);
}
function readU32LE(b: Uint8Array, off: number): number {
  return (
    (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0
  );
}

describe('workoutToFit', () => {
  it('emits a valid 14-byte FIT header with .FIT signature and matching data_size', () => {
    const bytes = workoutToFit(tabata);
    expect(bytes[0]).toBe(14); // header size
    expect(bytes[1]).toBe(0x20); // protocol 2.0
    expect(String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])).toBe('.FIT');
    const dataSize = readU32LE(bytes, 4);
    // Header (14) + data + CRC (2)
    expect(dataSize).toBe(bytes.length - 14 - 2);
  });

  it('appends a correct trailing CRC over header + body', () => {
    const bytes = workoutToFit(tabata);
    const body = bytes.slice(0, bytes.length - 2);
    const expected = fitCrc(body);
    const got = readU16LE(bytes, bytes.length - 2);
    expect(got).toBe(expected);
  });

  it('produces one workout_step per phase from buildSchedule', () => {
    const phases = buildSchedule(distanceSession);
    const bytes = workoutToFit(distanceSession);
    // num_valid_steps lives in the workout message. Easiest: parse records linearly.
    // Walk records using definitions we know we emit. Local types: 0=fileId, 1=workout, 2=step.
    const sizes: Record<number, number> = {};
    let i = 14;
    const end = bytes.length - 2;
    let stepDataCount = 0;
    let workoutNumValidSteps = -1;
    while (i < end) {
      const header = bytes[i];
      const isDef = (header & 0x40) !== 0;
      const localType = header & 0x0f;
      if (isDef) {
        // skip 5 bytes of header (incl. global msg num + nFields), then nFields*3 bytes.
        const nFields = bytes[i + 5];
        // sum sizes
        let total = 0;
        for (let f = 0; f < nFields; f++) {
          total += bytes[i + 6 + f * 3 + 1];
        }
        sizes[localType] = total;
        i += 6 + nFields * 3;
      } else {
        const recSize = sizes[localType];
        if (recSize == null) throw new Error('data record before definition');
        if (localType === 1) {
          // workout: fields in our defined order are sport(1) capabilities(4) num_valid_steps(2) name(16)
          // num_valid_steps offset = 1 (after data header) + 1 (sport) + 4 (capabilities) = 6
          workoutNumValidSteps = readU16LE(bytes, i + 1 + 1 + 4);
        } else if (localType === 2) {
          stepDataCount++;
        }
        i += 1 + recSize;
      }
    }
    expect(workoutNumValidSteps).toBe(phases.length);
    expect(stepDataCount).toBe(phases.length);
  });
});

describe('fitFilename', () => {
  it('slugifies common workout names', () => {
    expect(fitFilename(tabata)).toBe('uradoor-tabata.fit');
    expect(fitFilename(distanceSession)).toBe('uradoor-3-5-400m.fit');
  });
});
