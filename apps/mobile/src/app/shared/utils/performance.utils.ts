/**
 * Performance utilities for FitOS
 *
 * Guidelines:
 * - OnPush change detection on all components
 * - Virtual scrolling for lists >50 items
 * - trackBy on all *ngFor
 * - Only animate transform/opacity
 * - Lazy load all feature modules
 */

/**
 * TrackBy functions for common use cases
 */
export class TrackByUtils {
  /**
   * Track by ID (most common)
   */
  static trackById<T extends { id: string | number }>(index: number, item: T): string | number {
    return item.id;
  }

  /**
   * Track by index (use when items have no ID)
   */
  static trackByIndex(index: number): number {
    return index;
  }

  /**
   * Track by custom property
   */
  static trackByProperty<T>(property: keyof T) {
    return (index: number, item: T): any => item[property];
  }
}

/**
 * Debounce function for search/input
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for scroll events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load image with IntersectionObserver
 */
export function setupLazyImages(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset['src'];
          if (src) {
            img.src = src;
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Safe requestAnimationFrame with fallback
 */
export function safeRequestAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof requestAnimationFrame !== 'undefined') {
    return requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16) as unknown as number; // ~60fps fallback
}

/**
 * Performance monitoring decorator
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    const result = await originalMethod.apply(this, args);
    const end = performance.now();

    if (end - start > 100) {
      console.warn(`Performance: ${propertyKey} took ${(end - start).toFixed(2)}ms`);
    }

    return result;
  };

  return descriptor;
}

/**
 * Virtual scroll configuration for common list sizes
 */
export const VIRTUAL_SCROLL_CONFIG = {
  small: {
    itemHeight: 60,
    bufferAmount: 5,
  },
  medium: {
    itemHeight: 80,
    bufferAmount: 10,
  },
  large: {
    itemHeight: 120,
    bufferAmount: 15,
  },
};

/**
 * Bundle size budget warnings
 */
export const BUNDLE_BUDGETS = {
  initial: 2_000_000, // 2MB
  lazy: 500_000, // 500KB per lazy chunk
  warning: 0.9, // Warn at 90% of budget
};

/**
 * Animation constants for consistent timing
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 250,
  slow: 350,
} as const;

/**
 * Check if animation should run
 */
export function shouldAnimate(): boolean {
  return !prefersReducedMotion();
}
