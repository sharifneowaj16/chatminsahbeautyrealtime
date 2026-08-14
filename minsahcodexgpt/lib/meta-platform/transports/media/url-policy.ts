import { isIP } from 'node:net';
import { promises as dns } from 'node:dns';
import type { MetaMediaAddressResolver } from './types';

const DEFAULT_ALLOWED_HOSTS = Object.freeze([
  'facebook.com',
  'fbcdn.net',
  'fbsbx.com',
  'instagram.com',
  'cdninstagram.com',
]);

function hostMatches(hostname: string, allowed: string): boolean {
  return hostname === allowed || hostname.endsWith(`.${allowed}`);
}

function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((total, part) => (total << 8) + Number(part), 0) >>> 0;
}

function inIpv4Range(ip: string, network: string, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(network) & mask);
}

export function isBlockedMetaMediaAddress(address: string): boolean {
  const kind = isIP(address);
  if (kind === 4) {
    return [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
      ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
      ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
    ].some(([network, prefix]) => inIpv4Range(address, String(network), Number(prefix)));
  }
  if (kind === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')
      || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')
      || normalized.startsWith('2001:db8:') || normalized.startsWith('ff');
  }
  return true;
}

export const systemMetaMediaAddressResolver: MetaMediaAddressResolver = Object.freeze({
  async resolve(hostname: string) {
    const rows = await dns.lookup(hostname, { all: true, verbatim: true });
    return Object.freeze(rows.map((row) => row.address));
  },
});

export function parseAndValidateMetaMediaUrl(value: string, allowedHosts: readonly string[] = DEFAULT_ALLOWED_HOSTS): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new TypeError('META_MEDIA_URL_INVALID'); }
  if (url.protocol !== 'https:') throw new TypeError('META_MEDIA_URL_PROTOCOL_BLOCKED');
  if (url.username || url.password) throw new TypeError('META_MEDIA_URL_CREDENTIALS_BLOCKED');
  if (url.hash) throw new TypeError('META_MEDIA_URL_FRAGMENT_BLOCKED');
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (isIP(hostname)) throw new TypeError('META_MEDIA_IP_LITERAL_BLOCKED');
  if (!allowedHosts.some((allowed) => hostMatches(hostname, allowed.toLowerCase()))) throw new TypeError('META_MEDIA_HOST_BLOCKED');
  return url;
}

export async function assertPublicMetaMediaHost(input: {
  readonly url: URL;
  readonly resolver?: MetaMediaAddressResolver;
}): Promise<void> {
  const addresses = await (input.resolver ?? systemMetaMediaAddressResolver).resolve(input.url.hostname);
  if (addresses.length === 0) throw new Error('META_MEDIA_DNS_EMPTY');
  if (addresses.some(isBlockedMetaMediaAddress)) throw new Error('META_MEDIA_PRIVATE_ADDRESS_BLOCKED');
}
