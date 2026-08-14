import { read, runAudit } from './meta-platform-phase31-layer7-audit-lib.mjs';
const csrf = read('lib/auth/admin-csrf.ts');
const jobs = read('app/api/admin/meta/jobs/route.ts');
const actions = read('lib/meta-platform/admin/job-actions.ts');
const dead = read('lib/jobs/dead-letter.ts');
const env = read('.env.example');
runAudit('Layer 7.7 audit', [
  ['same-origin CSRF contract', csrf.includes('ADMIN_CSRF_ORIGIN_MISMATCH') && csrf.includes('x-admin-request')],
  ['bearer automation supported', csrf.includes('BEARER_AUTH')],
  ['RBAC mutation guard', jobs.includes('requireAdminMutationPermission')],
  ['approval-backed action service', jobs.includes('executeMetaAdminAction')],
  ['replay delegated', jobs.includes('replayMetaDeadLetter')],
  ['cancel delegated', jobs.includes('cancelMetaAdminJob') && actions.includes('getMetaQueue') && actions.includes('job.remove()')],
  ['route has no direct provider write', !/fetch\s*\(|new Redis|new Queue/.test(jobs)],
  ['replay kill switch enforced in domain', dead.includes('getMetaAdminActionControls') && dead.includes('controls.replay.enabled')],
  ['kill switches documented', env.includes('META_ADMIN_ACTIONS_KILL_SWITCH') && env.includes('META_ADMIN_REPLAY_KILL_SWITCH')],
]);
