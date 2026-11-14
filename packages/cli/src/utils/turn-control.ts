import type { GemieTurnControl } from '@gemies/server';

export interface ConversationControl {
  readonly lifetimeSignal: AbortSignal;
  readonly activitySignal: AbortSignal;
  readonly stopped: boolean;
  readonly stopAcknowledged: boolean;
  readonly stopRequested: boolean;
  bindAccount(subscribe: () => () => void): void;
  attach(turn: GemieTurnControl, controller: AbortController): boolean;
  finish(turn: GemieTurnControl): Promise<void>;
  stop(): Promise<void>;
  /** Resolves once a Stop in flight has been acknowledged or refused; never rejects. */
  stopSettled(): Promise<void>;
  dispose(): void;
}

/** One CLI submission, potentially containing several independently controlled tool rounds. */
export function createConversationControl(): ConversationControl {
  const lifetime = new AbortController();
  const activity = new AbortController();
  let removeAccountListener: (() => void) | undefined;
  let current: { turn: GemieTurnControl; controller: AbortController } | undefined;
  let stopping: Promise<void> | undefined;
  let acknowledged = false;
  return {
    lifetimeSignal: lifetime.signal,
    activitySignal: activity.signal,
    bindAccount(subscribe: () => () => void): void {
      if (!removeAccountListener && !lifetime.signal.aborted) removeAccountListener = subscribe();
    },
    /** Only an acknowledged Stop stops: while it is in flight, or after it fails, the answer streams on. */
    get stopped() {
      return acknowledged || lifetime.signal.aborted;
    },
    get stopAcknowledged() {
      return acknowledged;
    },
    get stopRequested() {
      return stopping !== undefined || acknowledged;
    },
    attach(turn: GemieTurnControl, controller: AbortController): boolean {
      if (acknowledged || lifetime.signal.aborted) return false;
      current = { turn, controller };
      return true;
    },
    async finish(turn: GemieTurnControl): Promise<void> {
      await turn.finish();
      if (current?.turn === turn) current = undefined;
    },
    /**
     * Stop takes effect when the server acknowledges it: then tools and approvals are blocked and
     * the stream detaches. A refused Stop leaves the turn running, so it can be pressed again.
     */
    stop(): Promise<void> {
      if (acknowledged || lifetime.signal.aborted) return Promise.resolve();
      stopping ??= (async () => {
        try {
          await current?.turn.stop();
          if (!lifetime.signal.aborted) {
            acknowledged = true;
            activity.abort();
          }
        } finally {
          stopping = undefined;
        }
      })();
      return stopping;
    },
    async stopSettled(): Promise<void> {
      await stopping?.catch(() => undefined);
    },
    /** Account change, unmount or a broken output pipe is detach, never remote Stop. */
    dispose(): void {
      lifetime.abort();
      activity.abort();
      removeAccountListener?.();
      removeAccountListener = undefined;
      current?.controller.abort();
    },
  };
}
