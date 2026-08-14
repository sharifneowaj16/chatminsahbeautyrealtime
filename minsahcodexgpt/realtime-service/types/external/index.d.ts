declare class Buffer extends Uint8Array {
  static from(value: string | ArrayBuffer | ArrayBufferView, encoding?: string): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  static concat(values: readonly Uint8Array[]): Buffer;
  static alloc(size: number): Buffer;
  readonly byteLength: number;
  toString(encoding?: string): string;
}
declare const process: {
  env: Record<string, string | undefined>;
  uptime(): number;
  exit(code?: number): never;
  on(event: string, listener: (...args: any[]) => void): void;
};
declare const console: { log(...args: any[]): void; error(...args: any[]): void; warn(...args: any[]): void };
declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): { unref(): unknown };
declare function setInterval(handler: (...args: any[]) => void, timeout?: number): { unref(): unknown };
declare function clearInterval(value: unknown): void;
declare class URL {
  constructor(input: string, base?: string);
  readonly searchParams: { set(key: string, value: string): void };
  toString(): string;
}
declare class AbortSignal { static timeout(milliseconds: number): AbortSignal }
declare function fetch(input: string | URL, init?: { method?: string; headers?: Record<string, string>; body?: Buffer; signal?: AbortSignal }): Promise<{ status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

declare module 'dotenv/config' {}
declare module 'node:crypto' {
  export function createHash(algorithm: string): { update(value: string | Buffer): any; digest(encoding: string): string };
  export function createHmac(algorithm: string, key: string): { update(value: string | Buffer): any; digest(encoding: string): string };
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}
declare module 'crypto' {
  const crypto: {
    createHmac(algorithm: string, key: string): { update(value: string): any; digest(encoding: string): string };
    timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
    randomUUID(): string;
  };
  export default crypto;
}
declare module 'http' {
  export interface IncomingMessage { headers: Record<string, string | string[] | undefined> }
  export interface Server {
    listen(port: number, callback?: () => void): void;
    on(event: string, listener: (...args: any[]) => void): void;
    close(callback?: () => void): void;
  }
  const http: { createServer(handler?: unknown): Server };
  export default http;
}
declare module 'express' {
  export interface Request {
    body: unknown;
    query: Record<string, unknown>;
    headers: Record<string, string | string[] | undefined>;
  }
  export interface Response {
    status(code: number): Response;
    type(value: string): Response;
    send(value?: unknown): Response;
    json(value: unknown): Response;
    sendStatus(code: number): Response;
  }
  export type Handler = (req: Request, res: Response) => unknown;
  export interface Router {
    get(path: string, handler: Handler): Router;
    post(path: string, handler: Handler): Router;
    use(handler: Handler): Router;
    use(path: string | readonly string[], router: Router | Handler): Router;
  }
  export interface Application extends Router {
    all(path: string | readonly string[], handler: Handler): Application;
  }
  export function Router(): Router;
  interface ExpressFactory {
    (): Application;
    raw(options?: unknown): Handler;
    json(options?: unknown): Handler;
    Router: typeof Router;
  }
  const express: ExpressFactory;
  namespace express { type Router = import('express').Router }
  export default express;
}
declare module 'ioredis' {
  export default class Redis {
    constructor(url?: string, options?: unknown);
    on(event: string, listener: (...args: any[]) => void): this;
    subscribe(channel: string): Promise<number>;
    unsubscribe(channel: string): Promise<number>;
    quit(): Promise<unknown>;
    set(...args: any[]): Promise<any>;
    get(...args: any[]): Promise<any>;
    eval(...args: any[]): Promise<any>;
    zadd(...args: any[]): Promise<any>;
    zrem(...args: any[]): Promise<any>;
    zcard(...args: any[]): Promise<any>;
    zrange(...args: any[]): Promise<string[]>;
    zrangebyscore(...args: any[]): Promise<string[]>;
    zremrangebyscore(...args: any[]): Promise<number>;
    publish(channel: string, value: string): Promise<number>;
    multi(): { zadd(...args: any[]): any; zremrangebyscore(...args: any[]): any; exec(): Promise<any> };
    expire(...args: any[]): Promise<any>;
    pexpire(...args: any[]): Promise<any>;
    off(event: string, listener: (...args: any[]) => void): this;
  }
}
declare module 'ws' {
  import type { IncomingMessage, Server } from 'http';
  export class WebSocket {
    static readonly OPEN: number;
    readonly readyState: number;
    send(value: string): void;
    close(code?: number, reason?: string): void;
    terminate(): void;
    ping(): void;
    on(event: 'message', listener: (data: { toString(): string }) => void): this;
    on(event: 'pong' | 'close' | 'error', listener: (...args: any[]) => void): this;
  }
  export class WebSocketServer {
    constructor(options: {
      server: Server;
      path?: string;
      maxPayload?: number;
      handleProtocols?: (protocols: Set<string>) => string | false;
      verifyClient?: (info: { req: IncomingMessage }) => boolean;
    });
    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this;
    on(event: 'close', listener: () => void): this;
    close(callback?: () => void): void;
  }
}
declare module 'zod' {
  class Schema<T = any> {
    min(...args: any[]): Schema<T>; max(...args: any[]): Schema<T>; default(...args: any[]): Schema<T>;
    transform<U>(fn: (value: T) => U): Schema<U>; refine(fn: (value: T) => unknown, message?: string): Schema<T>;
    optional(): Schema<T | undefined>; nullable(): Schema<T | null>; regex(value: RegExp): Schema<T>; url(): Schema<T>;
    strict(): Schema<T>; superRefine(fn: (value: T, ctx: { addIssue(issue: unknown): void }) => unknown): Schema<T>;
    safeParse(value: unknown): { success: true; data: T } | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } };
    parse(value: unknown): T;
  }
  export const z: {
    object<T extends Record<string, Schema<any>>>(shape: T): Schema<any>;
    string(): Schema<string>; enum<T extends readonly string[]>(values: T): Schema<T[number]>;
    literal<T extends string>(value: T): Schema<T>; array<T>(schema: Schema<T>): Schema<T[]>;
    discriminatedUnion(...args: any[]): Schema<any>;
    ZodIssueCode: { custom: string };
  };
  export namespace z { type infer<T> = T extends Schema<infer U> ? U : any }
}
