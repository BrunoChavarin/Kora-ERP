class LocalDatabase {
  private getStorage<T>(key: string, defaultValue: T): T {
    const val = localStorage.getItem(`kora_${key}`);
    if (!val) {
      this.setStorage(key, defaultValue);
      return defaultValue;
    }
    try {
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, data: T): void {
    localStorage.setItem(`kora_${key}`, JSON.stringify(data));
  }

  // Clear mock session dependency
  public init() {
    this.getStorage('session', null);
  }

  public get(key: string): any {
    return this.getStorage(key, []);
  }

  public save(key: string, data: any): void {
    this.setStorage(key, data);
  }

  public clear(): void {
    localStorage.clear();
    this.init();
  }
}

export const db = new LocalDatabase();
db.init();
