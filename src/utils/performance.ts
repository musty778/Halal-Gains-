/**
 * Performance monitoring utilities
 */

/**
 * Log performance metrics for a component or operation
 */
export const logPerformance = (label: string) => {
  if (import.meta.env.DEV) {
    performance.mark(`${label}-start`)
    return () => {
      performance.mark(`${label}-end`)
      performance.measure(label, `${label}-start`, `${label}-end`)
      const measure = performance.getEntriesByName(label)[0]
      console.log(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`)
      performance.clearMarks()
      performance.clearMeasures()
    }
  }
  return () => {}
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Measure Web Vitals (LCP, FID, CLS)
 */
export const measureWebVitals = () => {
  if (import.meta.env.DEV && 'PerformanceObserver' in window) {
    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('🎨 LCP:', lastEntry.startTime.toFixed(2), 'ms')
      })
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          console.log('⚡ FID:', entry.processingStart - entry.startTime, 'ms')
        })
      })
      fidObserver.observe({ type: 'first-input', buffered: true })
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsScore = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value
            console.log('📐 CLS:', clsScore.toFixed(4))
          }
        }
      })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch (e) {
      // CLS not supported
    }
  }
}

/**
 * Preload critical resources
 */
export const preloadResource = (url: string, as: 'script' | 'style' | 'image' | 'font') => {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = url
  if (as === 'font') {
    link.crossOrigin = 'anonymous'
  }
  document.head.appendChild(link)
}

