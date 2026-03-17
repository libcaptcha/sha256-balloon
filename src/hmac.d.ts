import { HashInput } from "./sha256.js";

export function hmacSha256(
  key: HashInput,
  message: HashInput
): Uint8Array;

export function hmacSha256Hex(
  key: HashInput,
  message: HashInput
): string;
