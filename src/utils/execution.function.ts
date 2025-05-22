export const isNil = (v: any): v is null | undefined => typeof v === 'undefined' || v === null;

type DebouncedFunction<T extends (...args: any[]) => any> = {
  (this: ThisParameterType<T>, ...args: Parameters<T>): ReturnType<T>;
  cancel: () => void;
  flush: () => ReturnType<T>;
};

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  { leading = true, trailing = true, maxWait }: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): DebouncedFunction<T> {
  let lastArgs: Parameters<T> | undefined,
    lastThis: ThisParameterType<T> | undefined,
    result: ReturnType<T>,
    timerId: NodeJS.Timeout | undefined,
    lastCallTime: number | undefined,
    lastInvokeTime = 0,
    maxing = !isNil(maxWait);

  function invokeFunc(time: number) {
    const args = lastArgs,
      thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args as Parameters<T>);
    return result;
  }

  function leadingEdge(time: number) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastCallTime!,
      timeSinceLastInvoke = time - lastInvokeTime,
      timeWaiting = wait - timeSinceLastCall;

    return maxing ? Math.min(timeWaiting, maxWait! - timeSinceLastInvoke) : timeWaiting;
  }

  function shouldInvoke(time: number) {
    var timeSinceLastCall = time - lastCallTime!,
      timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= maxWait!)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) return trailingEdge(time);

    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
    return undefined;
  }

  function trailingEdge(time: number) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) return invokeFunc(time);

    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) clearTimeout(timerId);
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function debounced(this: any) {
    var time = Date.now(),
      isInvoking = shouldInvoke(time);

    lastArgs = arguments as unknown as Parameters<T>;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

export function throttler<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  {
    leading = true,
    trailing = true,
  }: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): DebouncedFunction<T> {
  return debounce(func, wait, { leading, trailing, maxWait: wait });
}
