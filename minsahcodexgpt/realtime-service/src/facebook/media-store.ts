import { createHash } from 'crypto'
import { promises as fs } from 'fs'
import { Client as MinioClient } from 'minio'
import path from 'path'
import { getConfig } from '../config'
import type { MessengerAttachmentType } from './attachments'

const DEFAULT_EXTENSION_BY_TYPE: Record<MessengerAttachmentType, string> = {
  image: '.jpg',
  video: '.mp4',
  audio: '.mp3',
  file: '.bin',
}

let ensuredDir: Promise<void> | null = null
let ensuredBucket: Promise<void> | null = null
let minioClient: MinioClient | null = null
const PUBLIC_BUCKET_PREFIXES = [
  'products/*',
  'categories/*',
  'brands/*',
  'avatars/*',
  'banners/*',
  'blog/*',
  'media/*',
  'uploads/*',
  'facebook/*',
]

function sanitizeFileStem(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getStorageRoot(): string {
  return path.resolve(getConfig().MEDIA_STORAGE_DIR, 'facebook')
}

function getPublicBaseUrl(): string {
  return getConfig().REALTIME_PUBLIC_BASE_URL.replace(/\/+$/, '')
}

function getMediaStorageBackend(): 'local' | 'minio' {
  return getConfig().MEDIA_STORAGE_BACKEND
}

function getMinioClient(): MinioClient {
  if (!minioClient) {
    const config = getConfig()
    minioClient = new MinioClient({
      endPoint: config.MINIO_ENDPOINT!,
      port: config.MINIO_PORT,
      useSSL: config.MINIO_USE_SSL!,
      accessKey: config.MINIO_ACCESS_KEY!,
      secretKey: config.MINIO_SECRET_KEY!,
      region: config.MINIO_REGION,
    })
  }

  return minioClient
}

function getMinioBucketName(): string {
  return getConfig().MINIO_BUCKET_NAME!
}

function getMinioPublicBaseUrl(): string {
  return getConfig().MINIO_PUBLIC_BASE_URL!.replace(/\/+$/, '')
}

function getStoredMediaPrefixes(): string[] {
  const prefixes = [`${getPublicBaseUrl()}/media/facebook/`]
  const config = getConfig()

  if (config.MINIO_PUBLIC_BASE_URL && config.MINIO_BUCKET_NAME) {
    const base = config.MINIO_PUBLIC_BASE_URL.replace(/\/+$/, '')
    prefixes.push(`${base}/${encodeURIComponent(config.MINIO_BUCKET_NAME)}/facebook/`)
    prefixes.push(`${base}/${config.MINIO_BUCKET_NAME}/facebook/`)
  }

  return prefixes
}

function stripAttachmentHint(url: string): string {
  const [base, hash = ''] = url.split('#')
  const nextHash = hash
    .split('&')
    .filter((part) => part && !part.startsWith('minsah-fb-type='))
    .join('&')

  return nextHash ? `${base}#${nextHash}` : base
}

function isStoredMediaUrl(url: string): boolean {
  const normalized = stripAttachmentHint(url)
  return getStoredMediaPrefixes().some((prefix) => normalized.startsWith(prefix))
}

function extensionFromContentType(
  contentType: string | null,
  attachmentType: MessengerAttachmentType
): string {
  const normalized = (contentType ?? '').split(';')[0].trim().toLowerCase()

  switch (normalized) {
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/gif':
      return '.gif'
    case 'image/webp':
      return '.webp'
    case 'video/mp4':
      return '.mp4'
    case 'video/quicktime':
      return '.mov'
    case 'video/webm':
      return '.webm'
    case 'audio/mpeg':
      return '.mp3'
    case 'audio/mp4':
      return '.m4a'
    case 'audio/wav':
      return '.wav'
    case 'audio/ogg':
      return '.ogg'
    case 'application/pdf':
      return '.pdf'
    default:
      return DEFAULT_EXTENSION_BY_TYPE[attachmentType]
  }
}

async function ensureStorageDir(): Promise<void> {
  if (!ensuredDir) {
    ensuredDir = fs.mkdir(getStorageRoot(), { recursive: true }).then(() => undefined)
  }

  await ensuredDir
}

async function ensureMinioBucket(): Promise<void> {
  if (!ensuredBucket) {
    ensuredBucket = (async () => {
      const client = getMinioClient()
      const bucket = getMinioBucketName()
      const exists = await client.bucketExists(bucket)
      if (!exists) {
        await client.makeBucket(bucket, getConfig().MINIO_REGION)
      }

      await client.setBucketPolicy(
        bucket,
        JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: PUBLIC_BUCKET_PREFIXES.map(
                (prefix) => `arn:aws:s3:::${bucket}/${prefix}`
              ),
            },
          ],
        })
      )
    })().catch((error) => {
      ensuredBucket = null
      throw error
    })
  }

  await ensuredBucket
}

function buildPublicUrl(fileName: string): string {
  return `${getPublicBaseUrl()}/media/facebook/${encodeURIComponent(fileName)}`
}

function encodeObjectPath(pathname: string): string {
  return pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function buildMinioObjectName(fileName: string): string {
  return `facebook/${fileName}`
}

function buildMinioPublicUrl(objectName: string): string {
  return `${getMinioPublicBaseUrl()}/${encodeURIComponent(getMinioBucketName())}/${encodeObjectPath(objectName)}`
}

async function persistToLocalStorage(input: {
  buffer: Buffer
  fileName: string
}): Promise<string> {
  await ensureStorageDir()
  await fs.writeFile(path.join(getStorageRoot(), input.fileName), input.buffer)
  return buildPublicUrl(input.fileName)
}

async function persistToMinio(input: {
  buffer: Buffer
  fileName: string
  contentType: string | null
}): Promise<string> {
  await ensureMinioBucket()

  const objectName = buildMinioObjectName(input.fileName)
  await getMinioClient().putObject(getMinioBucketName(), objectName, input.buffer, input.buffer.length, {
    'Content-Type': input.contentType ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
  })

  return buildMinioPublicUrl(objectName)
}

export async function persistIncomingFacebookMedia(input: {
  sourceUrl?: string
  messageId: string
  attachmentType?: MessengerAttachmentType
}): Promise<{ url?: string; persisted: boolean }> {
  if (!input.sourceUrl || !input.attachmentType) {
    return { url: input.sourceUrl, persisted: false }
  }

  if (isStoredMediaUrl(input.sourceUrl)) {
    return { url: input.sourceUrl, persisted: true }
  }

  const sourceUrl = stripAttachmentHint(input.sourceUrl)

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Authorization: `Bearer ${getConfig().FB_PAGE_ACCESS_TOKEN}`,
      },
    })

    if (!response.ok) {
      throw new Error(`download failed with status ${response.status}`)
    }

    const contentLengthHeader = response.headers.get('content-length')
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null
    if (
      contentLength !== null &&
      Number.isFinite(contentLength) &&
      contentLength > getConfig().FB_MEDIA_MAX_BYTES
    ) {
      throw new Error(`media too large: ${contentLength}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > getConfig().FB_MEDIA_MAX_BYTES) {
      throw new Error(`media too large after download: ${buffer.length}`)
    }

    const extension = extensionFromContentType(
      response.headers.get('content-type'),
      input.attachmentType
    )
    const contentType = response.headers.get('content-type')
    const digest = createHash('sha1').update(buffer).digest('hex').slice(0, 12)
    const fileName = `${sanitizeFileStem(input.messageId)}-${digest}${extension}`
    const url =
      getMediaStorageBackend() === 'minio'
        ? await persistToMinio({ buffer, fileName, contentType })
        : await persistToLocalStorage({ buffer, fileName })

    return {
      url,
      persisted: true,
    }
  } catch (error) {
    console.warn('[facebook/media-store] persist failed', {
      messageId: input.messageId,
      sourceUrl,
      error,
    })
    return {
      url: input.sourceUrl,
      persisted: false,
    }
  }
}
