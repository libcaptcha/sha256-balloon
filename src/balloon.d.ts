import { HashInput } from "./sha256.js";

export const DELTA: number;

export function balloon(
  input: HashInput,
  spaceCost: number,
  timeCost: number,
  delta?: number
): Uint8Array;

export function balloonHex(
  input: HashInput,
  spaceCost: number,
  timeCost: number,
  delta?: number
): string;

export function balloonRaw(
  inputBuffer: Uint8Array,
  inputLength: number,
  spaceCost: number,
  timeCost: number,
  delta: number,
  outputBuffer: Uint8Array | null,
  outputOffset: number
): Uint32Array;

export { countLeadingZeroBits } from "./sha256.js";
