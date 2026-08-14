import type {
  MetaWebhookEventGroup,
  MetaWebhookEventKind,
  MetaWebhookRoutingTarget,
} from '../../contracts/webhook';

export type MetaWebhookRouteDecision = Readonly<{
  eventKind: MetaWebhookEventKind;
  routingTarget: MetaWebhookRoutingTarget;
}>;

function normalized(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function routeMetaWebhookEvent(input: {
  readonly objectType: string;
  readonly eventGroup: MetaWebhookEventGroup;
  readonly field: string | null;
}): MetaWebhookRouteDecision {
  const objectType = normalized(input.objectType);
  const field = normalized(input.field);

  if (objectType === 'page' && input.eventGroup === 'changes' && field === 'leadgen') {
    return Object.freeze({ eventKind: 'LEADGEN', routingTarget: 'LEAD_ADS' });
  }

  if (objectType === 'instagram') {
    if (input.eventGroup === 'messaging') {
      return Object.freeze({ eventKind: 'MESSAGE', routingTarget: 'INSTAGRAM' });
    }
    if (input.eventGroup === 'standby') {
      return Object.freeze({ eventKind: 'STANDBY', routingTarget: 'INSTAGRAM' });
    }
    return Object.freeze({
      eventKind: field === 'comments' ? 'COMMENT' : 'CHANGE',
      routingTarget: 'INSTAGRAM',
    });
  }

  if (objectType === 'page') {
    if (input.eventGroup === 'messaging') {
      return Object.freeze({ eventKind: 'MESSAGE', routingTarget: 'FACEBOOK_PAGE' });
    }
    if (input.eventGroup === 'standby') {
      return Object.freeze({ eventKind: 'STANDBY', routingTarget: 'FACEBOOK_PAGE' });
    }
    return Object.freeze({
      eventKind: field === 'comments' ? 'COMMENT' : 'CHANGE',
      routingTarget: 'FACEBOOK_PAGE',
    });
  }

  return Object.freeze({ eventKind: 'UNKNOWN', routingTarget: 'UNSUPPORTED' });
}
