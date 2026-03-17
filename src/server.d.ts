import type { ChallengeOptions } from "./pow.js";

export interface PowMiddlewareOptions extends ChallengeOptions {
  secret?: string;
}

export interface PowRequest {
  params: Record<string, string>;
  body: Record<string, unknown>;
  headers: Record<string, string | undefined>;
  powPayload?: Record<string, unknown>;
}

export interface PowResponse {
  json(data: unknown): void;
  status(code: number): PowResponse;
}

export type NextFunction = (err?: unknown) => void;

export interface Router {
  post(path: string, handler: Function): void;
}

export interface PowMiddleware {
  handleChallenge(
    request: PowRequest,
    response: PowResponse
  ): void;

  handleSolve(
    request: PowRequest,
    response: PowResponse
  ): void;

  requireToken(
    request: PowRequest,
    response: PowResponse,
    next: NextFunction
  ): void;

  mountRoutes<T extends Router>(router: T): T;
}

export function powMiddleware(
  options?: PowMiddlewareOptions
): PowMiddleware;
