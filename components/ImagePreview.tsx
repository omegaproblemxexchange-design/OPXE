'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type ImagePreviewProps = {
  src: string;
  alt: string;
  thumbnailClassName: string;
  width: number;
  height: number;
  sizes?: string;
};

export default function ImagePreview({
  src,
  alt,
  thumbnailClassName,
  width,
  height,
  sizes,
}: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`View full image: ${alt}`}
        className="block cursor-zoom-in rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      >
        <Image src={src} alt={alt} width={width} height={height} sizes={sizes} unoptimized className={thumbnailClassName} />
      </button>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Full image: ${alt}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={() => setIsOpen(false)}
        >
          <button
            type="button"
            autoFocus
            onClick={() => setIsOpen(false)}
            aria-label="Close full image"
            className="absolute right-4 top-4 z-10 rounded-full border border-white/30 bg-slate-950/80 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-300 hover:text-cyan-200"
          >
            Close ×
          </button>
          <div className="relative flex h-[88vh] w-[94vw] items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <Image src={src} alt={alt} fill sizes="94vw" unoptimized className="object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
