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
