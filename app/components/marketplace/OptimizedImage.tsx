/**
 * Optimized Image Component
 * 
 * Provides lazy loading, responsive images, and blur-up placeholders
 */

import { useState, useEffect, useRef } from 'react';
import { cn } from '~/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
  priority?: boolean;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with lazy loading and blur-up effect
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  aspectRatio,
  priority = false,
  sizes,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate placeholder (low-quality placeholder)
  const placeholder = generatePlaceholder(width, height);

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden bg-gray-100', className)}
      style={{
        aspectRatio: aspectRatio || (width && height ? `${width}/${height}` : undefined),
      }}
    >
      {/* Blur placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"
          aria-hidden="true"
        />
      )}

      {/* Main image */}
      {isInView && !hasError && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Image not available</p>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generate a simple placeholder
 */
function generatePlaceholder(width?: number, height?: number): string {
  const w = width || 400;
  const h = height || 300;
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'%3E%3Crect width='${w}' height='${h}' fill='%23f3f4f6'/%3E%3C/svg%3E`;
}

/**
 * Responsive image component with srcset
 */
export function ResponsiveImage({
  src,
  alt,
  className,
  sizes = '100vw',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  // Generate srcset for different sizes
  const srcset = generateSrcSet(src);

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      sizes={sizes}
      priority={priority}
    />
  );
}

/**
 * Generate srcset for responsive images
 * This is a placeholder - in production, you'd use a CDN or image service
 */
function generateSrcSet(src: string): string {
  // For now, just return the original src
  // In production, you'd generate multiple sizes:
  // return `${src}?w=400 400w, ${src}?w=800 800w, ${src}?w=1200 1200w`;
  return src;
}

/**
 * Avatar image with fallback
 */
export function AvatarImage({
  src,
  alt,
  fallback,
  className,
  size = 'md',
}: {
  src?: string | null;
  alt: string;
  fallback?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  if (!src || hasError) {
    const initials = fallback || alt.charAt(0).toUpperCase();
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-white font-semibold',
          sizeClasses[size],
          className
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={cn('rounded-full object-cover', sizeClasses[size], className)}
    />
  );
}

/**
 * Thumbnail image with consistent aspect ratio
 */
export function ThumbnailImage({
  src,
  alt,
  className,
  aspectRatio = '16/9',
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      aspectRatio={aspectRatio}
      priority={priority}
    />
  );
}