export class Cache {
  private static cache = new Map<string, { data: any; timestamp: number }>();
  private static TTL = 5 * 60 * 1000; // 5 minutes default TTL

  static get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  static set(key: string, data: any, ttl: number = this.TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  static clear() {
    this.cache.clear();
  }
}
