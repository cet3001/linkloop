export class UsageTracker {
  private static readonly SCAN_LIMIT = 3;
  private static readonly STORAGE_KEY = 'll_usage_stats';

  public static async canScan(): Promise<{ allowed: boolean, remaining: number }> {
    const data = await chrome.storage.local.get([this.STORAGE_KEY, 'is_pro']);
    if (data.is_pro) {
      return { allowed: true, remaining: Infinity };
    }

    const now = Date.now();
    const stats = data[this.STORAGE_KEY] || { count: 0, firstScanTime: now };

    // Reset if 24h passed
    if (now - stats.firstScanTime > 24 * 60 * 60 * 1000) {
      stats.count = 0;
      stats.firstScanTime = now;
    }

    if (stats.count >= this.SCAN_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: this.SCAN_LIMIT - stats.count };
  }

  public static async recordScan(): Promise<void> {
    const data = await chrome.storage.local.get([this.STORAGE_KEY, 'is_pro']);
    if (data.is_pro) return;

    const now = Date.now();
    const stats = data[this.STORAGE_KEY] || { count: 0, firstScanTime: now };

    // Reset if 24h passed
    if (now - stats.firstScanTime > 24 * 60 * 60 * 1000) {
      stats.count = 1;
      stats.firstScanTime = now;
    } else {
      stats.count++;
    }

    await chrome.storage.local.set({ [this.STORAGE_KEY]: stats });
  }
}
