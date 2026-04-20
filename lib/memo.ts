/**
 * lib/memo.ts — ISO 20022 TIP-20 memo encode/decode
 *
 * 32-byte memo layout:
 *   Bytes  0– 3  Message type      "paic" = 0x70616963 (pain.001)
 *   Bytes  4–11  Employer ID       8 bytes (first 8 bytes of UUID, as hex)
 *   Bytes 12–19  Employee ID       8 bytes (first 8 bytes of UUID, as hex)
 *   Bytes 20–23  Pay period        YYYYMMDD packed big-endian uint32
 *   Bytes 24–27  Cost center       4 bytes big-endian uint32
 *   Bytes 28–31  Record hash       truncated SHA-256 of full payroll record (4 bytes)
 */

export interface MemoFields {
  messageType: string        // e.g. "paic"
  employerId: string         // 8-byte hex prefix of employer UUID
  employeeId: string         // 8-byte hex prefix of employee UUID
  payPeriod: string          // "YYYY-MM-DD"
  costCenter: number         // numeric cost center code
  recordHash: string         // 4-byte hex
}

const MSG_TYPE_BYTES = new Uint8Array([0x70, 0x61, 0x69, 0x63]) // "paic"

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(clean.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Encode a UUID-like ID to its first 8 bytes (drop hyphens, take first 16 hex chars).
 */
function uuidToIdBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '').slice(0, 16) // 16 hex chars = 8 bytes
  return hexToBytes(hex.padEnd(16, '0'))
}

function idBytesToHex(bytes: Uint8Array): string {
  return bytesToHex(bytes)
}

/**
 * Pack a YYYYMMDD date string into a big-endian uint32.
 * e.g. "2026-03-01" → 0x07F60301
 */
function packDate(dateStr: string): number {
  const d = new Date(dateStr)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  return (year << 16) | (month << 8) | day
}

/**
 * Unpack a big-endian uint32 into "YYYY-MM-DD".
 */
function unpackDate(packed: number): string {
  const year = (packed >> 16) & 0xffff
  const month = (packed >> 8) & 0xff
  const day = packed & 0xff
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset]     = (value >>> 24) & 0xff
  buf[offset + 1] = (value >>> 16) & 0xff
  buf[offset + 2] = (value >>> 8)  & 0xff
  buf[offset + 3] =  value         & 0xff
}

function readUint32BE(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset]     << 24) |
     (buf[offset + 1] << 16) |
     (buf[offset + 2] << 8)  |
      buf[offset + 3]) >>> 0
  )
}

/**
 * Encode memo fields into a 32-byte `0x`-prefixed hex string.
 */
export function encodeMemo(fields: Omit<MemoFields, 'messageType'>): `0x${string}` {
  const buf = new Uint8Array(32)

  // Bytes 0–3: message type "paic"
  buf.set(MSG_TYPE_BYTES, 0)

  // Bytes 4–11: employer ID (8 bytes)
  buf.set(uuidToIdBytes(fields.employerId), 4)

  // Bytes 12–19: employee ID (8 bytes)
  buf.set(uuidToIdBytes(fields.employeeId), 12)

  // Bytes 20–23: pay period packed
  writeUint32BE(buf, 20, packDate(fields.payPeriod))

  // Bytes 24–27: cost center
  writeUint32BE(buf, 24, fields.costCenter >>> 0)

  // Bytes 28–31: record hash (4 bytes, caller provides as hex string)
  const hashBytes = hexToBytes(fields.recordHash.padEnd(8, '0').slice(0, 8))
  buf.set(hashBytes, 28)

  return `0x${bytesToHex(buf)}`
}

export function memoHexToBytea(memoHex: `0x${string}`): string {
  return `\\x${memoHex.slice(2)}`
}

export function byteaMemoToHex(memoBytes: string | null | undefined): `0x${string}` | null {
  if (!memoBytes) return null

  const normalized = memoBytes.startsWith('\\x')
    ? `0x${memoBytes.slice(2)}`
    : memoBytes.startsWith('0x')
      ? memoBytes
      : null

  if (!normalized || normalized.length !== 66) {
    return null
  }

  return normalized as `0x${string}`
}

/**
 * Decode a 32-byte `0x`-prefixed hex string into memo fields.
 * Returns null if the buffer is not 32 bytes or the message type is unrecognized.
 */
export function decodeMemo(hex: `0x${string}`): MemoFields | null {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex
  if (raw.length !== 64) return null // not 32 bytes

  const buf = hexToBytes(raw)

  // Verify message type
  const msgType = String.fromCharCode(buf[0], buf[1], buf[2], buf[3])
  if (msgType !== 'paic') return null

  const employerId = idBytesToHex(buf.slice(4, 12))
  const employeeId = idBytesToHex(buf.slice(12, 20))
  const payPeriodPacked = readUint32BE(buf, 20)
  const costCenter = readUint32BE(buf, 24)
  const recordHash = bytesToHex(buf.slice(28, 32))

  return {
    messageType: msgType,
    employerId,
    employeeId,
    payPeriod: unpackDate(payPeriodPacked),
    costCenter,
    recordHash,
  }
}
