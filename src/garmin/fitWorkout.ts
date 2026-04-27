// Hand-rolled encoder for Garmin FIT "workout" files (file type 5).
// Format reference: Garmin FIT SDK, Profile.xlsx (workout / workout_step).
//
// We emit only the three message types a workout file needs:
//   file_id (global #0), workout (#26), workout_step (#27).
// Each phase from buildSchedule becomes one workout_step. Timed phases use
// duration_type=time; manual-finish work uses duration_type=open (lap-button
// to advance on the watch).

import { buildSchedule } from '../timer/buildSchedule';
import type { Phase, Workout } from '../types';

// FIT epoch: 1989-12-31T00:00:00Z = unix 631_065_600.
const FIT_EPOCH_OFFSET_S = 631_065_600;
const UINT32_INVALID = 0xffffffff;

// FIT base type bytes (high bit = endian-dependent).
const BT_ENUM = 0x00;
const BT_UINT16 = 0x84;
const BT_UINT32 = 0x86;
const BT_UINT32Z = 0x8c;
const BT_STRING = 0x07;

// FIT global message numbers.
const MSG_FILE_ID = 0;
const MSG_WORKOUT = 26;
const MSG_WORKOUT_STEP = 27;

// Local message types — distinct per global keeps the records cleanly readable.
const LT_FILE_ID = 0;
const LT_WORKOUT = 1;
const LT_WORKOUT_STEP = 2;

// Enum values from FIT Profile.
const FILE_TYPE_WORKOUT = 5;
const SPORT_RUNNING = 1;
const DURATION_TIME = 0;
const DURATION_OPEN = 5;
const TARGET_OPEN = 2;
const INTENSITY_ACTIVE = 0;
const INTENSITY_REST = 1;
const INTENSITY_WARMUP = 2;
const INTENSITY_COOLDOWN = 3;

const STEP_NAME_LEN = 32;
const WORKOUT_NAME_LEN = 16;

class Buf {
  private parts: number[] = [];
  push(b: number): void {
    this.parts.push(b & 0xff);
  }
  pushU16(v: number): void {
    this.parts.push(v & 0xff, (v >>> 8) & 0xff);
  }
  pushU32(v: number): void {
    this.parts.push(
      v & 0xff,
      (v >>> 8) & 0xff,
      (v >>> 16) & 0xff,
      (v >>> 24) & 0xff,
    );
  }
  pushString(s: string, fixedLen: number): void {
    const enc = new TextEncoder().encode(s);
    const writable = Math.min(enc.length, fixedLen - 1);
    for (let i = 0; i < writable; i++) this.parts.push(enc[i]);
    for (let i = writable; i < fixedLen; i++) this.parts.push(0);
  }
  toUint8Array(): Uint8Array {
    return new Uint8Array(this.parts);
  }
}

type FieldDef = { num: number; size: number; baseType: number };

function emitDefinition(
  buf: Buf,
  localType: number,
  globalMsgNum: number,
  fields: FieldDef[],
): void {
  buf.push(0x40 | (localType & 0x0f));
  buf.push(0); // reserved
  buf.push(0); // architecture: 0 = little-endian
  buf.pushU16(globalMsgNum);
  buf.push(fields.length);
  for (const f of fields) {
    buf.push(f.num);
    buf.push(f.size);
    buf.push(f.baseType);
  }
}

function emitDataHeader(buf: Buf, localType: number): void {
  buf.push(localType & 0x0f);
}

const CRC_TABLE = [
  0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
];

export function fitCrc(bytes: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >>> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[byte & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >>> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(byte >>> 4) & 0xf];
  }
  return crc & 0xffff;
}

function asciiClean(s: string, maxLen: number): string {
  let out = '';
  for (const ch of s) {
    const cc = ch.charCodeAt(0);
    out += cc >= 0x20 && cc < 0x7f ? ch : ' ';
  }
  out = out.replace(/\s+/g, ' ').trim();
  return out.slice(0, maxLen - 1) || ' ';
}

function intensityFor(p: Phase): number {
  switch (p.kind) {
    case 'work':
      return INTENSITY_ACTIVE;
    case 'restRep':
    case 'restSet':
      return INTENSITY_REST;
    case 'warmup':
      return INTENSITY_WARMUP;
    case 'cooldown':
      return INTENSITY_COOLDOWN;
  }
}

export function workoutToFit(workout: Workout): Uint8Array {
  const phases = buildSchedule(workout);
  if (phases.length === 0) {
    throw new Error('Workout has no steps to export.');
  }

  const records = new Buf();

  // ---- file_id ----
  emitDefinition(records, LT_FILE_ID, MSG_FILE_ID, [
    { num: 0, size: 1, baseType: BT_ENUM },     // type
    { num: 1, size: 2, baseType: BT_UINT16 },   // manufacturer
    { num: 2, size: 2, baseType: BT_UINT16 },   // product
    { num: 3, size: 4, baseType: BT_UINT32Z },  // serial_number
    { num: 4, size: 4, baseType: BT_UINT32 },   // time_created
  ]);
  emitDataHeader(records, LT_FILE_ID);
  records.push(FILE_TYPE_WORKOUT);
  records.pushU16(255); // manufacturer = development
  records.pushU16(0);   // product
  records.pushU32(1);   // serial_number (uint32z: must be non-zero)
  const fitNow = Math.max(
    0,
    Math.floor(Date.now() / 1000) - FIT_EPOCH_OFFSET_S,
  );
  records.pushU32(fitNow);

  // ---- workout ----
  emitDefinition(records, LT_WORKOUT, MSG_WORKOUT, [
    { num: 4, size: 1, baseType: BT_ENUM },                    // sport
    { num: 5, size: 4, baseType: BT_UINT32Z },                 // capabilities
    { num: 6, size: 2, baseType: BT_UINT16 },                  // num_valid_steps
    { num: 8, size: WORKOUT_NAME_LEN, baseType: BT_STRING },   // wkt_name
  ]);
  emitDataHeader(records, LT_WORKOUT);
  records.push(SPORT_RUNNING);
  records.pushU32(0);
  records.pushU16(phases.length);
  records.pushString(asciiClean(workout.name, WORKOUT_NAME_LEN), WORKOUT_NAME_LEN);

  // ---- workout_step ----
  emitDefinition(records, LT_WORKOUT_STEP, MSG_WORKOUT_STEP, [
    { num: 254, size: 2, baseType: BT_UINT16 },                 // message_index
    { num: 0, size: STEP_NAME_LEN, baseType: BT_STRING },       // wkt_step_name
    { num: 1, size: 1, baseType: BT_ENUM },                     // duration_type
    { num: 2, size: 4, baseType: BT_UINT32 },                   // duration_value
    { num: 3, size: 1, baseType: BT_ENUM },                     // target_type
    { num: 7, size: 1, baseType: BT_ENUM },                     // intensity
  ]);
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    emitDataHeader(records, LT_WORKOUT_STEP);
    records.pushU16(i);
    records.pushString(asciiClean(p.label, STEP_NAME_LEN), STEP_NAME_LEN);
    if (p.durationSec != null) {
      records.push(DURATION_TIME);
      records.pushU32(p.durationSec * 1000); // ms
    } else {
      records.push(DURATION_OPEN);
      records.pushU32(UINT32_INVALID);
    }
    records.push(TARGET_OPEN);
    records.push(intensityFor(p));
  }

  // ---- header (14 bytes) + body + CRC (2 bytes) ----
  const recordsBytes = records.toUint8Array();
  const header = new Buf();
  header.push(14);                    // header size
  header.push(0x20);                  // protocol version 2.0
  header.pushU16(2140);               // profile version 21.40
  header.pushU32(recordsBytes.length); // data size
  header.push(0x2e);                  // '.'
  header.push(0x46);                  // 'F'
  header.push(0x49);                  // 'I'
  header.push(0x54);                  // 'T'
  header.pushU16(0);                  // header CRC = 0 (allowed by spec)

  const headerBytes = header.toUint8Array();
  const all = new Uint8Array(headerBytes.length + recordsBytes.length);
  all.set(headerBytes, 0);
  all.set(recordsBytes, headerBytes.length);
  const crc = fitCrc(all);

  const out = new Uint8Array(all.length + 2);
  out.set(all, 0);
  out[all.length] = crc & 0xff;
  out[all.length + 1] = (crc >>> 8) & 0xff;
  return out;
}

export function fitFilename(workout: Workout): string {
  const slug =
    workout.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'workout';
  return `uradoor-${slug}.fit`;
}

export function downloadFit(workout: Workout): void {
  const bytes = workoutToFit(workout);
  // Copy into a fresh ArrayBuffer for Blob — current TS lib types reject
  // Uint8Array<ArrayBufferLike> (which can be SharedArrayBuffer-backed).
  const ab = new ArrayBuffer(bytes.length);
  new Uint8Array(ab).set(bytes);
  const blob = new Blob([ab], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fitFilename(workout);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
