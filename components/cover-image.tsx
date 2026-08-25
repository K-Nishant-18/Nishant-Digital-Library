'use client';

import Image from 'next/image';
import type { CSSProperties, ReactEventHandler } from 'react';

interface CoverImageProps {
  src?: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  onError?: ReactEventHandler<HTMLImageElement>;
  fallbackColor?: string;
}

export function CoverImage({
  src,
  alt,
  fill,
  width,
  height,
  sizes,
  className,
  style,
  onError,
  fallbackColor = '#334155',
}: CoverImageProps) {
  if (!src) {
    return (
      <div
        className={className}
        style={{ ...style, backgroundColor: fallbackColor }}
        role="img"
        aria-label={alt}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      {...(fill ? {} : { width, height })}
      sizes={sizes}
      className={className}
      style={style}
      onError={onError}
    />
  );
}
