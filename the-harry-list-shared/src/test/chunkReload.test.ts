import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installChunkReload } from '../lib/chunkReload';

function setup() {
  const events = new EventTarget();
  const reload = vi.fn();
  installChunkReload({
    addEventListener: events.addEventListener.bind(events),
    sessionStorage: window.sessionStorage,
    location: { reload } as unknown as Location,
  } as Pick<Window, 'addEventListener' | 'sessionStorage' | 'location'>);
  const failChunk = () => {
    const event = new Event('vite:preloadError', { cancelable: true });
    events.dispatchEvent(event);
    return event;
  };
  return { reload, failChunk };
}

describe('installChunkReload', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('reloads once when a chunk from a previous build fails to load', () => {
    const { reload, failChunk } = setup();
    const event = failChunk();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not reload in a loop when the new build fails too', () => {
    const { reload, failChunk } = setup();
    failChunk();
    vi.advanceTimersByTime(3_000);
    const second = failChunk();
    expect(reload).toHaveBeenCalledTimes(1);
    // Not prevented, so the error reaches the error screen instead.
    expect(second.defaultPrevented).toBe(false);
  });

  it('reloads again for a later deploy, once the guard window has passed', () => {
    const { reload, failChunk } = setup();
    failChunk();
    vi.advanceTimersByTime(60_000);
    failChunk();
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
