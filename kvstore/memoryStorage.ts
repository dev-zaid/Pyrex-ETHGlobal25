import { StorageInterface, StorageConfig } from './types';

export class MemoryStorage<T> implements StorageInterface<T> {
  private storage = new Map<string, T>();
  private config: StorageConfig;

  constructor(config: StorageConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries || 10000,
      ttl: config.ttl || 24 * 60 * 60 * 1000, // 24 hours default
      persistence: config.persistence || false,
      ...config
    };
  }

  async set(key: string, value: T): Promise<void> {
    // Check if we need to clean up old entries
    if (this.storage.size >= this.config.maxEntries!) {
      await this.cleanup();
    }

    this.storage.set(key, value);
  }

  async get(key: string): Promise<T | null> {
    const value = this.storage.get(key);
    return value || null;
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.storage.has(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  private async cleanup(): Promise<void> {
    // If TTL is set, remove expired entries
    if (this.config.ttl) {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, value] of this.storage.entries()) {
        // Check if value has timestamp and is expired
        if (value && typeof value === 'object' && 'updatedAt' in value) {
          const timestamp = (value as any).updatedAt;
          if (now - timestamp > this.config.ttl) {
            keysToDelete.push(key);
          }
        }
      }

      keysToDelete.forEach(key => this.storage.delete(key));
    }

    // If still over limit, remove oldest entries
    if (this.storage.size >= this.config.maxEntries!) {
      const entries = Array.from(this.storage.entries());
      entries.sort((a, b) => {
        const aTime = (a[1] as any).updatedAt || 0;
        const bTime = (b[1] as any).updatedAt || 0;
        return aTime - bTime;
      });

      const toRemove = entries.slice(0, Math.floor(this.config.maxEntries! * 0.1)); // Remove 10%
      toRemove.forEach(([key]) => this.storage.delete(key));
    }
  }

  // Utility methods
  size(): number {
    return this.storage.size;
  }

  getStats(): { size: number; maxEntries: number; ttl: number } {
    return {
      size: this.storage.size,
      maxEntries: this.config.maxEntries!,
      ttl: this.config.ttl!
    };
  }
}
