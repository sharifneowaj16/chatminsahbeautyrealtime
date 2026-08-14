import 'server-only';

import net from 'node:net';
import type { MetaMediaMalwareScanner } from './types';

const DEFAULT_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_CLAMAV_CHUNK_BYTES = 64 * 1024;
type MetaMediaScanOutcome = Awaited<ReturnType<MetaMediaMalwareScanner['scan']>>;

function positiveInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max ? parsed : fallback;
}

function parseClamAvResponse(value: string): { result: 'CLEAN' | 'INFECTED' | 'ERROR'; signature?: string } {
  const response = value.replace(/\0/g, '').trim();
  if (/\bOK$/i.test(response)) return { result: 'CLEAN' };
  const found = response.match(/:\s*(.+?)\s+FOUND$/i);
  if (found) return { result: 'INFECTED', signature: found[1]?.slice(0, 160) };
  return { result: 'ERROR' };
}

export function createClamAvMetaMediaScanner(input: Readonly<{
  host?: string;
  port?: number;
  timeoutMs?: number;
}> = {}): MetaMediaMalwareScanner {
  const host = input.host?.trim() || process.env.META_MEDIA_CLAMAV_HOST?.trim();
  const port = input.port ?? positiveInteger(process.env.META_MEDIA_CLAMAV_PORT, DEFAULT_PORT, 65_535);
  const timeoutMs = input.timeoutMs ?? positiveInteger(process.env.META_MEDIA_CLAMAV_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 120_000);

  const scanner: MetaMediaMalwareScanner = {
    async scan({ bytes }): Promise<MetaMediaScanOutcome> {
      if (!host) {
        const error = new Error('META_MEDIA_SCANNER_NOT_CONFIGURED');
        Object.assign(error, { code: 'META_MEDIA_SCANNER_NOT_CONFIGURED', retryable: true });
        throw error;
      }

      return new Promise<MetaMediaScanOutcome>((resolve, reject) => {
        let settled = false;
        let response = '';
        const socket = net.createConnection({ host, port });

        const finishError = (code: string, cause?: unknown) => {
          if (settled) return;
          settled = true;
          socket.destroy();
          const error = new Error(code);
          Object.assign(error, { code, retryable: true, cause });
          reject(error);
        };

        socket.setTimeout(timeoutMs, () => finishError('META_MEDIA_SCAN_TIMEOUT'));
        socket.on('error', (error) => finishError('META_MEDIA_SCAN_UNAVAILABLE', error));
        socket.on('data', (chunk) => { response += chunk.toString('utf8'); });
        socket.on('end', () => {
          if (settled) return;
          settled = true;
          const parsed = parseClamAvResponse(response);
          resolve(Object.freeze({ ...parsed, engine: 'clamav' }));
        });
        socket.on('connect', () => {
          socket.write(Buffer.from('zINSTREAM\0'));
          for (let offset = 0; offset < bytes.length; offset += MAX_CLAMAV_CHUNK_BYTES) {
            const chunk = bytes.subarray(offset, Math.min(offset + MAX_CLAMAV_CHUNK_BYTES, bytes.length));
            const length = Buffer.allocUnsafe(4);
            length.writeUInt32BE(chunk.length, 0);
            socket.write(length);
            socket.write(chunk);
          }
          socket.write(Buffer.alloc(4));
        });
      });
    },
  };
  return Object.freeze(scanner);
}
