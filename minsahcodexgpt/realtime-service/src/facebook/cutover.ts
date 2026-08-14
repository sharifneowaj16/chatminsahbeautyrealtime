import {
  resolveFacebookRealtimeCutover,
  type FacebookRealtimeCutoverStatus,
} from '../../../packages/meta-facebook-cutover-contract/src'

export function getRealtimeFacebookCutoverStatus(): FacebookRealtimeCutoverStatus {
  return resolveFacebookRealtimeCutover(process.env, { role: 'REALTIME' })
}
