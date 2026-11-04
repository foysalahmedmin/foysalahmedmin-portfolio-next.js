/**
 * Layout reads and style writes, batched into one frame: every read of the frame runs first, then every
 * write. A read after a write forces the browser to lay the page out again on the spot, and on a long page
 * several of those in a row at mount cost a few hundred milliseconds of main thread on a phone. Effects that
 * need a measurement ask here instead of measuring themselves, so the page is laid out once.
 */
const reads: Array<() => void> = [];
const writes: Array<() => void> = [];
let scheduled = false;

const flush = () => {
  scheduled = false;
  const pendingReads = reads.splice(0);
  for (const run of pendingReads) run();
  // A write may queue another measurement; that goes to the next frame
  const pendingWrites = writes.splice(0);
  for (const run of pendingWrites) run();
};

export function measureThenMutate<T>(
  read: () => T,
  write: (value: T) => void
): void {
  reads.push(() => {
    const value = read();
    writes.push(() => write(value));
  });
  if (!scheduled) {
    scheduled = true;
    window.requestAnimationFrame(flush);
  }
}
