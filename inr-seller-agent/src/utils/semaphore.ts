export class Semaphore {
  private permits: number;
  private readonly waiters: Array<(release: () => void) => void> = [];

  constructor(maxConcurrency: number) {
    if (maxConcurrency <= 0 || Number.isNaN(maxConcurrency)) {
      throw new Error('Semaphore requires a positive concurrency value');
    }
    this.permits = maxConcurrency;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits -= 1;
        resolve(this.createReleaser());
      } else {
        this.waiters.push(resolve);
      }
    });
  }

  private createReleaser(): () => void {
    return () => {
      if (this.waiters.length > 0) {
        const waiter = this.waiters.shift();
        if (waiter) {
          waiter(this.createReleaser());
        }
      } else {
        this.permits += 1;
      }
    };
  }
}
