/**
 * MemoryMonitor - Cross-browser memory tracking
 * 
 * Detects memory usage patterns and calculates leak rates.
 * Uses performance.memory (Chrome) or provides user-friendly fallbacks.
 */

export interface MemoryInfo {
  used: number;  // MB
  total: number; // MB
  limit: number; // MB
}

export interface MemorySnapshot {
  round: number;
  heapUsed: number | null;
  heapTotal: number | null;
  timestamp: number;
}

export interface BrowserInfo {
  name: string;
  version: string;
  supportsMemoryAPI: boolean;
}

/**
 * Detect the current browser
 */
export function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  
  // Chrome detection (must check before Safari since Chrome includes Safari in UA)
  if (/Chrome\/([\d.]+)/.test(ua) && !/Edg\/|OPR\//.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return {
      name: 'Chrome',
      version: match?.[1] || 'unknown',
      supportsMemoryAPI: true
    };
  }
  
  // Edge detection
  if (/Edg\/([\d.]+)/.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/);
    return {
      name: 'Edge',
      version: match?.[1] || 'unknown',
      supportsMemoryAPI: true
    };
  }
  
  // Opera detection
  if (/OPR\/([\d.]+)|Opera\/([\d.]+)/.test(ua)) {
    const match = ua.match(/OPR\/([\d.]+)|Opera\/([\d.]+)/);
    return {
      name: 'Opera',
      version: match?.[1] || match?.[2] || 'unknown',
      supportsMemoryAPI: false
    };
  }
  
  // Firefox detection
  if (/Firefox\/([\d.]+)/.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    return {
      name: 'Firefox',
      version: match?.[1] || 'unknown',
      supportsMemoryAPI: false
    };
  }
  
  // Safari detection
  if (/Safari\/([\d.]+)/.test(ua) && /Apple Computer/.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/);
    return {
      name: 'Safari',
      version: match?.[1] || 'unknown',
      supportsMemoryAPI: false
    };
  }
  
  return {
    name: 'Unknown',
    version: 'unknown',
    supportsMemoryAPI: false
  };
}

/**
 * Get a user-friendly message about memory monitoring support
 */
export function getMemorySupportMessage(): { 
  supported: boolean; 
  message: string; 
  recommendation?: string;
} {
  const browser = detectBrowser();
  
  if (browser.supportsMemoryAPI) {
    return {
      supported: true,
      message: `Memory monitoring active (${browser.name} ${browser.version})`
    };
  }
  
  const recommendations: Record<string, string> = {
    'Firefox': 'For full memory monitoring, use Chrome or Edge.',
    'Safari': 'For full memory monitoring, use Chrome or Edge.',
    'Opera': 'For full memory monitoring, use Chrome or Edge.',
    'Unknown': 'For full memory monitoring, use Chrome or Edge.'
  };
  
  return {
    supported: false,
    message: `Memory monitoring limited (${browser.name} ${browser.version})`,
    recommendation: recommendations[browser.name]
  };
}

/**
 * Get current memory info if available
 * Chrome and Edge expose performance.memory (non-standard)
 */
export function getCurrentMemory(): MemoryInfo | null {
  const perf = performance as any;
  
  if (perf.memory) {
    return {
      used: Math.round(perf.memory.usedJSHeapSize / 1048576),
      total: Math.round(perf.memory.totalJSHeapSize / 1048576),
      limit: Math.round(perf.memory.jsHeapSizeLimit / 1048576)
    };
  }
  
  // Firefox/Safari/Opera - memory API not available
  return null;
}

/**
 * Check if memory API is available
 */
export function isMemoryAvailable(): boolean {
  return !!(performance as any).memory;
}

/**
 * Calculate memory leak rate using linear regression
 * Returns MB per round
 */
export function calculateLeakRate(snapshots: MemorySnapshot[]): number {
  if (snapshots.length < 2) return 0;
  
  const validSnapshots = snapshots.filter(s => s.heapUsed !== null);
  if (validSnapshots.length < 2) return 0;
  
  const n = validSnapshots.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  for (const snap of validSnapshots) {
    const x = snap.round;
    const y = snap.heapUsed!;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  
  // Linear regression slope: (n*sumXY - sumX*sumY) / (n*sumXX - sumX*sumX)
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return 0;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return Math.round(slope * 100) / 100; // Round to 2 decimals
}

/**
 * Detect memory anomaly
 * Returns true if current memory is > threshold times baseline
 */
export function detectAnomaly(
  current: MemoryInfo | null,
  baseline: number,
  threshold: number = 2.0
): boolean {
  if (!current) return false;
  return current.used > baseline * threshold;
}

/**
 * Get memory warning level
 * Returns: 'normal' | 'warning' | 'critical'
 */
export function getMemoryWarningLevel(
  current: MemoryInfo | null,
  baseline: number
): 'normal' | 'warning' | 'critical' {
  if (!current) return 'normal';
  
  const ratio = current.used / baseline;
  
  if (ratio > 2.0) return 'critical';
  if (ratio > 1.5) return 'warning';
  return 'normal';
}

/**
 * Format memory for display
 */
export function formatMemory(mb: number | null): string {
  if (mb === null) return 'N/A';
  return `${mb} MB`;
}

/**
 * Estimate memory from other metrics (fallback for unsupported browsers)
 * This is a rough estimate based on performance.now() timing data
 */
export function estimateMemoryUsage(): MemoryInfo | null {
  // This is a placeholder for future implementation
  // Could use timing APIs or other heuristics to estimate memory
  // Currently returns null as we don't have reliable estimation
  return null;
}
