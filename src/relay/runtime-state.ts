import type { RelayRuntimeState } from './messages';

export interface RelayRuntimeDiscardCursor {
  lastSequence: number;
  lastSentAt: number;
}

export const defaultRelayRuntimeStaleMs = 250;

export function shouldDiscardRelayRuntimeState(
  nextState: RelayRuntimeState,
  cursor: RelayRuntimeDiscardCursor,
  now = Date.now(),
  staleMs = defaultRelayRuntimeStaleMs,
): boolean {
  if (now - nextState.sentAt > staleMs) {
    return true;
  }

  return nextState.sequence <= cursor.lastSequence && nextState.sentAt <= cursor.lastSentAt;
}

export function createRelayRuntimeState(
  sequence: number,
  sentAt: number,
  state: Omit<RelayRuntimeState, 'sequence' | 'sentAt'>,
): RelayRuntimeState {
  return {
    sequence,
    sentAt,
    expressions: { ...state.expressions },
    pose: state.pose,
  };
}
