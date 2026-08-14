export const META_MEDIA_SCAN_RESULTS = ['CLEAN', 'INFECTED', 'ERROR'] as const;
export type MetaMediaScanResult = (typeof META_MEDIA_SCAN_RESULTS)[number];

export interface MetaMediaAddressResolver {
  resolve(hostname: string): Promise<readonly string[]>;
}

export interface MetaMediaMalwareScanner {
  scan(input: { readonly bytes: Buffer; readonly mimeType: string; readonly fileName: string }): Promise<{ readonly result: MetaMediaScanResult; readonly engine?: string; readonly signature?: string }>;
}

export interface MetaPrivateMediaStore {
  put(input: { readonly key: string; readonly bytes: Buffer; readonly mimeType: string; readonly metadata: Readonly<Record<string, string>> }): Promise<{ readonly key: string; readonly size: number }>;
}

export interface MetaMediaDownloadOptions {
  readonly url: string;
  readonly authorization?: string;
  readonly fetchImpl?: typeof fetch;
  readonly resolver?: MetaMediaAddressResolver;
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
  readonly maxRedirects?: number;
  readonly allowedMimeTypes?: readonly string[];
  readonly allowedMimePrefixes?: readonly string[];
  readonly allowedHosts?: readonly string[];
  readonly signal?: AbortSignal;
}

export interface MetaDownloadedMedia {
  readonly sourceUrl: string;
  readonly finalUrl: string;
  readonly bytes: Buffer;
  readonly mimeType: string;
  readonly detectedMimeType: string | null;
  readonly fileName: string;
  readonly size: number;
  readonly digest: string;
}

export interface MetaStoredMedia {
  readonly storageKey: string;
  readonly size: number;
  readonly mimeType: string;
  readonly digest: string;
  readonly scanResult: 'CLEAN';
}
