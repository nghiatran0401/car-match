import { useEffect, useMemo, useState } from 'react';

interface VehicleImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSources?: string[];
  loading?: 'lazy' | 'eager';
  sizes?: string;
  fetchPriority?: 'high' | 'low' | 'auto';
}

function makeFallbackDataUri(label: string): string {
  const safe = label.replace(/[<>&"]/g, '').slice(0, 32) || 'CarMatch';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#0f172a"/>
    <stop offset="100%" stop-color="#1e293b"/>
  </linearGradient>
</defs>
<rect width="1200" height="800" fill="url(#g)"/>
<text x="60" y="700" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="64" font-weight="700">${safe}</text>
<text x="60" y="760" fill="#94a3b8" font-family="Arial, sans-serif" font-size="28">CarMatch visual placeholder</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function VehicleImage({
  src,
  alt,
  className,
  fallbackSources = [],
  loading = 'lazy',
  sizes,
  fetchPriority = 'auto',
}: VehicleImageProps) {
  const fallbackSrc = useMemo(() => makeFallbackDataUri(alt), [alt]);
  const sources = useMemo(() => [src, ...fallbackSources], [fallbackSources, src]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(sources[0] ?? fallbackSrc);

  useEffect(() => {
    setSourceIndex(0);
    setCurrentSrc(sources[0] ?? fallbackSrc);
  }, [fallbackSrc, sources]);

  const handleError = () => {
    const nextIndex = sourceIndex + 1;
    if (nextIndex < sources.length) {
      setSourceIndex(nextIndex);
      setCurrentSrc(sources[nextIndex]);
      return;
    }
    setCurrentSrc(fallbackSrc);
  };

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      sizes={sizes}
      onError={handleError}
      className={className}
    />
  );
}

