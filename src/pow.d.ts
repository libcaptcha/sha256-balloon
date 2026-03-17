export const CHALLENGE_TTL_MS: number;
export const TOKEN_TTL_MS: number;
export const DEFAULT_SPACE_COST: number;
export const DEFAULT_TIME_COST: number;
export const DEFAULT_DIFFICULTY: number;
export const DELTA: number;

export interface ChallengeOptions {
  spaceCost?: number;
  timeCost?: number;
  difficulty?: number;
  delta?: number;
}

export interface ChallengeData {
  challengeId: string;
  prefix: string;
  difficulty: number;
  spaceCost: number;
  timeCost: number;
  delta: number;
}

export interface ChallengeRecord {
  prefix: string;
  difficulty: number;
  spaceCost: number;
  timeCost: number;
  delta: number;
  createdAt: number;
  expiresAt: number;
}

export interface CreateChallengeResult {
  id: string;
  challenge: ChallengeData;
  record: ChallengeRecord;
}

export interface VerifySuccess {
  valid: true;
  hash: string;
}

export interface VerifyFailure {
  valid: false;
  error: string;
}

export type VerifyResult = VerifySuccess | VerifyFailure;

export function createChallenge(
  secret: string,
  options?: ChallengeOptions
): CreateChallengeResult;

export function verifyChallenge(
  record: ChallengeRecord,
  nonce: number
): VerifyResult;

export function signToken(
  payload: Record<string, unknown>,
  secret: string
): string;

export function verifyToken(
  token: string,
  secret: string
): Record<string, unknown> | null;
