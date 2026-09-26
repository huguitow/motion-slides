import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { watchFile, type WatchedFile } from './file-watch';

const INTERVAL = 500;

/** A file handle whose content and failures the test controls. */
function fakeFile(initial: string) {
  let text = initial;
  let lastModified = 1;
  let failing = false;
  let contentFailing = false;
  const handle: WatchedFile = {
    getFile: async () => {
      if (failing) throw new DOMException('gone', 'NotFoundError');
      const file = new File([text], 'talk.deck.html', { lastModified });
      if (contentFailing) file.text = () => Promise.reject(new DOMException('unreadable', 'NotReadableError'));
      return file;
    },
  };
  return {
    handle,
    write(next: string) {
      text = next;
      lastModified++;
    },
    setFailing: (value: boolean) => (failing = value),
    setContentFailing: (value: boolean) => (contentFailing = value),
  };
}

/** Lets every poll due in `ms` run, including the awaited file reads. */
async function elapse(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
}

describe('watchFile', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('does not report the content it started with', async () => {
    const file = fakeFile('v1');
    const onChange = vi.fn();
    const stop = watchFile(file.handle, { onChange, onLost: vi.fn(), intervalMs: INTERVAL });

    await elapse(INTERVAL * 5);

    expect(onChange).not.toHaveBeenCalled();
    stop();
  });

  test('reports a change once the file stopped moving for one poll', async () => {
    const file = fakeFile('v1');
    const onChange = vi.fn();
    const stop = watchFile(file.handle, { onChange, onLost: vi.fn(), intervalMs: INTERVAL });
    await elapse(0);

    file.write('v2');
    await elapse(INTERVAL);
    expect(onChange).not.toHaveBeenCalled();

    await elapse(INTERVAL);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('v2');
    stop();
  });

  test('waits while the file keeps being written', async () => {
    const file = fakeFile('v1');
    const onChange = vi.fn();
    const stop = watchFile(file.handle, { onChange, onLost: vi.fn(), intervalMs: INTERVAL });
    await elapse(0);

    file.write('half');
    await elapse(INTERVAL);
    file.write('done');
    await elapse(INTERVAL);
    expect(onChange).not.toHaveBeenCalled();

    await elapse(INTERVAL);
    expect(onChange).toHaveBeenCalledExactlyOnceWith('done');
    stop();
  });

  test('tolerates a file briefly missing while it is being replaced', async () => {
    const file = fakeFile('v1');
    const onLost = vi.fn();
    const onChange = vi.fn();
    const stop = watchFile(file.handle, { onChange, onLost, intervalMs: INTERVAL });
    await elapse(0);

    file.setFailing(true);
    await elapse(INTERVAL * 2);
    file.setFailing(false);
    file.write('v2');
    await elapse(INTERVAL * 2);

    expect(onLost).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith('v2');
    stop();
  });

  test('gives up and reports the loss when the file stays unreadable', async () => {
    const file = fakeFile('v1');
    const onLost = vi.fn();
    watchFile(file.handle, { onChange: vi.fn(), onLost, intervalMs: INTERVAL });
    await elapse(0);

    file.setFailing(true);
    await elapse(INTERVAL * 10);

    expect(onLost).toHaveBeenCalledOnce();
  });

  test('reports the loss when the file is listed but its content stays unreadable', async () => {
    const file = fakeFile('v1');
    const onLost = vi.fn();
    watchFile(file.handle, { onChange: vi.fn(), onLost, intervalMs: INTERVAL });
    await elapse(0);

    file.setContentFailing(true);
    file.write('v2');
    await elapse(INTERVAL * 10);

    expect(onLost).toHaveBeenCalledOnce();
  });

  test('stops polling once stopped', async () => {
    const file = fakeFile('v1');
    const getFile = vi.spyOn(file.handle, 'getFile');
    const stop = watchFile(file.handle, { onChange: vi.fn(), onLost: vi.fn(), intervalMs: INTERVAL });
    await elapse(0);

    stop();
    const calls = getFile.mock.calls.length;
    await elapse(INTERVAL * 5);

    expect(getFile.mock.calls.length).toBe(calls);
  });
});
