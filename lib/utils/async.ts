export async function runWithConcurrency<T>(
  taskFactories: Array<() => Promise<T>>,
  maxConcurrency: number
): Promise<T[]> {
  if (taskFactories.length === 0) {
    return [];
  }

  const concurrency = Math.max(1, Math.min(maxConcurrency, taskFactories.length));
  const results = new Array<T>(taskFactories.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= taskFactories.length) {
        return;
      }

      results[currentIndex] = await taskFactories[currentIndex]!();
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return results;
}

interface SettledTaskResult<T> {
  index: number;
  status: 'fulfilled' | 'rejected';
  value?: T;
  reason?: unknown;
}

export async function runWithConcurrencySettled<T>(
  taskFactories: Array<() => Promise<T>>,
  maxConcurrency: number,
  onSettled?: (result: SettledTaskResult<T>) => void
): Promise<Array<PromiseSettledResult<T>>> {
  if (taskFactories.length === 0) {
    return [];
  }

  const concurrency = Math.max(1, Math.min(maxConcurrency, taskFactories.length));
  const results = new Array<PromiseSettledResult<T>>(taskFactories.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= taskFactories.length) {
        return;
      }

      try {
        const value = await taskFactories[currentIndex]!();
        results[currentIndex] = {
          status: 'fulfilled',
          value,
        };
        onSettled?.({
          index: currentIndex,
          status: 'fulfilled',
          value,
        });
      } catch (error) {
        results[currentIndex] = {
          status: 'rejected',
          reason: error,
        };
        onSettled?.({
          index: currentIndex,
          status: 'rejected',
          reason: error,
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return results;
}
