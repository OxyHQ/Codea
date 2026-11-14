import type { GemieTurnControl } from '@gemies/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Stopping between the tools of one round must not leave tool calls without results in the
 * session that gets saved, and only an acknowledged Stop stops the answer.
 */

interface Handlers {
  onContent: (content: string) => void;
  onDone: (content: string, calls?: unknown[]) => void;
}
type Stream = (handlers: Handlers, control?: ConversationControl) => Promise<void>;

const threeToolCalls: Stream = async (handlers) => {
  handlers.onDone('', [
    { id: 'a', type: 'function', function: { name: 'read_file', arguments: '{}' } },
    { id: 'b', type: 'function', function: { name: 'read_file', arguments: '{}' } },
    { id: 'c', type: 'function', function: { name: 'read_file', arguments: '{}' } },
  ]);
};

const world = vi.hoisted(() => ({ active: true, stream: undefined as Stream | undefined }));
vi.mock('../api.js', () => ({
  streamChat: (
    _messages: unknown,
    _system: string,
    _model: string,
    handlers: Handlers,
    _signal: unknown,
    control?: ConversationControl,
  ) => (world.stream ?? threeToolCalls)(handlers, control),
}));
vi.mock('../../tools/executor.js', () => ({
  executeTool: async () => {
    world.active = false; // Ctrl+C while the first tool runs
    return { success: true, result: 'ok' };
  },
}));

import { type Message, processConversation } from '../conversation.js';
import { type ConversationControl, createConversationControl } from '../turn-control.js';

afterEach(() => {
  world.active = true;
  world.stream = undefined;
});

describe('processConversation stopped mid-round', () => {
  it('answers every tool call it asked for', async () => {
    const messages: Message[] = [{ role: 'user', content: 'go' }];
    await processConversation({
      messages,
      systemMessage: '',
      model: 'm',
      approvalMode: 'full-auto',
      onEvent: () => {},
      requestApproval: async () => true,
      isActive: () => world.active,
    });

    const asked = messages.find((m) => m.tool_calls)?.tool_calls?.map((c) => c.id);
    const answered = messages.filter((m) => m.role === 'tool').map((m) => m.tool_call_id);
    expect(asked).toEqual(['a', 'b', 'c']);
    expect(answered).toEqual(['a', 'b', 'c']);
  });
});

describe('processConversation when Stop is refused', () => {
  it('keeps streaming and saving the answer, and a retried Stop still stops it', async () => {
    let refuse!: (error: Error) => void;
    const refusal = new Promise<void>((_resolve, reject) => {
      refuse = reject;
    });
    const turn = {
      id: 'turn',
      stop: vi.fn<() => Promise<void>>().mockReturnValueOnce(refusal).mockResolvedValue(undefined),
      finish: async () => {},
    } as unknown as GemieTurnControl;
    const control = createConversationControl();
    world.stream = async (handlers, ctl) => {
      if (!ctl?.attach(turn, new AbortController())) return;
      handlers.onContent('Before Stop. ');
      const refused = expect(ctl.stop()).rejects.toThrow('Stop refused');
      // Not acknowledged yet: the answer is still shown, and nothing is blocked.
      expect(ctl.stopped).toBe(false);
      handlers.onContent('While Stop is pending. ');
      refuse(new Error('Stop refused'));
      await refused;
      expect(ctl.stopped).toBe(false);
      expect(ctl.stopRequested).toBe(false);
      expect(ctl.activitySignal.aborted).toBe(false);
      handlers.onContent('After the refusal.');
      // Pressed again, the server acknowledges: what follows is neither shown nor saved.
      await ctl.stop();
      expect(ctl.stopped).toBe(true);
      handlers.onContent(' Never shown.');
      await ctl.finish(turn);
    };

    const messages: Message[] = [{ role: 'user', content: 'go' }];
    const shown: string[] = [];
    await processConversation({
      messages,
      systemMessage: '',
      model: 'm',
      approvalMode: 'full-auto',
      onEvent: (event) => {
        if (event.type === 'content') shown.push(event.text);
      },
      requestApproval: async () => true,
      isActive: () => true,
      control,
    });

    const answer = 'Before Stop. While Stop is pending. After the refusal.';
    expect(shown.join('')).toBe(answer);
    expect(messages).toEqual([
      { role: 'user', content: 'go' },
      { role: 'assistant', content: answer },
    ]);
    expect(turn.stop).toHaveBeenCalledTimes(2);
  });
});
