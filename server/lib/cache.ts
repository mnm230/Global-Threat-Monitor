export class TtlCache<T> {
  private data: T | null = null;
  private fetchedAt = 0;

  constructor(private ttlMs: number) {}

  get(): T | null {
    if (this.data !== null && Date.now() - this.fetchedAt < this.ttlMs) {
      return this.data;
    }
    return null;
  }

  set(value: T): void {
    this.data = value;
    this.fetchedAt = Date.now();
  }

  clear(): void {
    this.data = null;
    this.fetchedAt = 0;
  }

  has(): boolean {
    return this.data !== null && Date.now() - this.fetchedAt < this.ttlMs;
  }

  age(): number {
    return this.data !== null ? Date.now() - this.fetchedAt : Infinity;
  }
}
