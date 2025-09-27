export class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const tail = this.tails.get(key) ?? Promise.resolve();

    const run = tail.then(() => task());
    const newTail = run.then(
      () => undefined,
      () => undefined,
    );

    this.tails.set(key, newTail);

    try {
      return await run;
    } finally {
      if (this.tails.get(key) === newTail) {
        this.tails.delete(key);
      }
    }
  }
}
