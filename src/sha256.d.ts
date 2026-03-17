export type HashInput = string | Uint8Array | ArrayBufferView;

export function sha256(input: HashInput): Uint32Array;
export function sha256Hex(input: HashInput): string;
export function sha256Bytes(input: HashInput): Uint8Array;

export function sha256Raw(
  data: Uint8Array,
  length: number
): Uint32Array;

export function digestToBytes(
  state: Uint32Array,
  target: Uint8Array,
  offset: number
): void;

export function countLeadingZeroBits(
  state: Uint32Array
): number;

export function countLeadingZeroBitsBytes(
  bytes: Uint8Array
): number;

export function writeLE32(
  buffer: Uint8Array,
  offset: number,
  value: number
): void;

export function toBytes(input: HashInput): Uint8Array;
