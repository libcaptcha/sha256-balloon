export interface SolveProgress {
  hashes: number;
  hashRate: number;
  workers: number;
}

export interface SolveChallengeOptions {
  baseUrl?: string;
  workerUrl?: string;
  onProgress?: (progress: SolveProgress) => void;
}

export interface SolveResult {
  token: string;
  expiresAt: number;
  nonce: number;
  totalHashes: number;
  elapsed: number;
  hashRate: number;
  workerCount: number;
}

export function solveChallenge(
  options?: SolveChallengeOptions
): Promise<SolveResult>;
