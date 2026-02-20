import { describe, expect, it } from 'vitest'
import { detectBrowser, detectOs } from '@/lib/report-contract'

describe('report-contract UA detection', () => {
  it('detects browser family', () => {
    expect(detectBrowser('Mozilla/5.0 Chrome/145.0.0.0 Safari/537.36')).toBe(
      'Chrome'
    )
    expect(detectBrowser('Mozilla/5.0 Edg/124.0.0.0')).toBe('Edge')
    expect(detectBrowser('Mozilla/5.0 Version/17.0 Safari/605.1.15')).toBe(
      'Safari'
    )
    expect(detectBrowser('Mozilla/5.0 Firefox/123.0')).toBe('Firefox')
  })

  it('detects operating system family', () => {
    expect(detectOs('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe(
      'macOS'
    )
    expect(detectOs('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(
      'Windows'
    )
    expect(detectOs('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux')
    expect(detectOs('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('Android')
    expect(detectOs('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(
      'iOS'
    )
  })
})
