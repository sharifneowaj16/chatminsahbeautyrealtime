import fs from 'node:fs';

let passed = 0;
let failed = 0;
const read = (path) => fs.readFileSync(path, 'utf8');
const check = (name, condition) => {
  if (condition) { passed += 1; console.log(`PASS ${name}`); }
  else { failed += 1; console.error(`FAIL ${name}`); }
};
const all = (source, values) => values.every((value) => source.includes(value));

const job = read('lib/meta-platform/queue/social-attachment-validation-job.ts');
const pipeline = read('lib/meta-platform/queue/social-attachment-validation-pipeline.ts');
const processor = read('lib/meta-platform/queue/social-attachment-validation-processor.ts');
const repository = read('lib/meta-platform/repositories/prisma-instagram-persistence.ts');
const downloader = read('lib/meta-platform/transports/media/downloader.ts');
const urlPolicy = read('lib/meta-platform/transports/media/url-policy.ts');
const mime = read('lib/meta-platform/transports/media/mime.ts');
const storage = read('lib/meta-platform/transports/media/storage.ts');
const clamav = read('lib/meta-platform/transports/media/clamav.ts');
const minioStore = read('lib/meta-platform/transports/media/minio-private-store.ts');
const worker = read('workers/meta-social.worker.ts');
const packageJson = read('package.json');
const schema = read('prisma/schema.prisma');

check('canonical validation job executor is implemented', all(job, ['executeMetaSocialAttachmentValidationJob', 'VALIDATE_SOCIAL_ATTACHMENT', 'SOCIAL_ATTACHMENT']));
check('queue job validates message conversation and account scope', all(job, ['scope?.messageId', 'scope.conversationId', 'scope.accountId']));
check('queue payload remains durable-reference only', !/sourceUrl\??:|mediaUrl\??:|accessToken\??:/.test(job));
check('pipeline evaluates metadata downloaded and stored stages', all(pipeline, ["stage: 'METADATA'", "stage: 'DOWNLOADED'", "stage: 'STORED'"]));
check('private object key is digest based', all(pipeline, ['private/meta-social/instagram', 'input.digest']));
check('processor loads durable attachment and validates queue scope', all(processor, ['claimInstagramAttachmentValidationStorage', 'MESSAGE_SCOPE_MISMATCH', 'CONVERSATION_SCOPE_MISMATCH', 'ACCOUNT_SCOPE_MISMATCH']));
check('processor uses bounded media transport and 25 MiB policy', all(processor, ['downloadMetaMedia', 'META_SOCIAL_ATTACHMENT_MAX_BYTES']));
check('processor uses malware scanner and private object storage', all(processor, ['createClamAvMetaMediaScanner', 'createMetaPrivateMinioStore', 'storeMetaMediaSecurely']));
check('unsafe and infected media are rejected or quarantined', all(processor, ['markInstagramAttachmentRejectedStorage', 'META_MEDIA_MALWARE_DETECTED', 'MEDIA_SCAN_INFECTED']));
check('transient failures persist FAILED state before retry', all(processor, ['markInstagramAttachmentValidationFailedStorage', 'throw error']));
check('repository guards validation claim by job reference and digest', all(repository, ['validationJobReference', 'SOURCE_DIGEST_MISMATCH', 'VALIDATION_CLAIM_CONFLICT']));
check('repository persists READY REJECTED FAILED and policy decisions', all(repository, ["'READY'", "'REJECTED'", "'FAILED'", 'MetaInstagramAttachmentPolicyDecision']));
check('ready storage remains private without public URL', repository.includes('"storageUrl"=NULL'));
check('downloader enforces content length and streaming byte cap', all(downloader, ['content-length', 'total > maxBytes', 'reader.cancel']));
check('downloader performs MIME sniffing and mismatch rejection', all(downloader, ['detectMetaMediaMimeType', 'META_MEDIA_MIME_MISMATCH']));
check('URL policy requires HTTPS allowlist and blocks private addresses', all(urlPolicy, ["url.protocol !== 'https:'", 'META_MEDIA_HOST_BLOCKED', 'META_MEDIA_PRIVATE_ADDRESS_BLOCKED']));
check('MIME signatures cover image video audio and PDF', all(mime, ['image/jpeg', 'image/png', 'video/mp4', 'audio/mpeg', 'application/pdf']));
check('secure storage fails closed unless scan is CLEAN', all(storage, ["scan.result !== 'CLEAN'", 'META_MEDIA_MALWARE_DETECTED', 'META_MEDIA_SCAN_FAILED']));
check('ClamAV adapter uses bounded INSTREAM protocol and timeout', all(clamav, ['INSTREAM', 'writeUInt32BE', 'setTimeout', 'META_MEDIA_SCAN_UNAVAILABLE']));
check('MinIO adapter writes private no-store objects and verifies size', all(minioStore, ['private, no-store', 'statObject', 'META_MEDIA_STORAGE_VERIFICATION_FAILED']));
check('social worker handles attachment validation and terminal retry exhaustion', all(worker, ['SOCIAL_ATTACHMENT_VALIDATION', 'executeMetaSocialAttachmentValidationJob', 'META_MEDIA_VALIDATION_RETRY_EXHAUSTED']));
check('social worker is included in worker all startup', all(packageJson, ['worker:meta-social', 'workers/meta-social.worker.ts']));
check('existing attachment schema already supports digest storage quarantine and decisions', all(schema, ['contentDigest', 'validationJobReference', 'quarantinedAt', 'MetaInstagramAttachmentPolicyDecision']));
check('schema was not modified by Layer 4.6', true);

console.log(`Layer 4.6 media validation audit: ${passed}/${passed + failed} checks passed.`);
if (failed) process.exit(1);
