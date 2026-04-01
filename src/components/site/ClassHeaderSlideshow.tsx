"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";

type ClassHeaderSlideshowProps = {
  images: string[];
  alt: string;
  intervalMs?: number;
  indicatorColor?: string;
  className?: string;
};

export default function ClassHeaderSlideshow({
  images,
  alt,
  intervalMs = 4200,
  indicatorColor = "#cb8578",
  className,
}: ClassHeaderSlideshowProps) {
  const preparedImages = images.map((item) => item.trim()).filter((item) => item.length > 0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayTimerRef = useRef<number | null>(null);
  const displayIndex =
    preparedImages.length > 0 ? Math.min(selectedIndex, preparedImages.length - 1) : 0;

  const stopAutoplay = useCallback(() => {
    if (autoplayTimerRef.current !== null) {
      window.clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (preparedImages.length <= 1) return;
    stopAutoplay();
    autoplayTimerRef.current = window.setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % preparedImages.length);
    }, intervalMs);
  }, [intervalMs, preparedImages.length, stopAutoplay]);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  const goToNext = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % Math.max(preparedImages.length, 1));
  }, [preparedImages.length]);

  const goToPrev = useCallback(() => {
    setSelectedIndex((prev) => (prev - 1 + Math.max(preparedImages.length, 1)) % Math.max(preparedImages.length, 1));
  }, [preparedImages.length]);

  if (preparedImages.length === 0) {
    return (
      <div className="rounded-[2.25rem] bg-white/20 p-8 text-center text-sm text-white/80 backdrop-blur-sm">
        {alt}
      </div>
    );
  }

  return (
    <div className={className ? `w-full ${className}` : "w-full"}>
      <div
        className="group relative overflow-hidden rounded-[2.25rem] border border-white/35 bg-white/15 shadow-[0_34px_90px_rgba(46,27,17,0.24)] backdrop-blur-sm"
        onMouseEnter={stopAutoplay}
        onMouseLeave={startAutoplay}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${displayIndex * 100}%)` }}
        >
          {preparedImages.map((src, index) => (
            <div key={`${src}-${index}`} className="relative min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[3/4] w-full bg-white/20">
                <Image
                  src={src}
                  alt={alt}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 40rem, 50rem"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          ))}
        </div>

        {preparedImages.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={goToPrev}
              className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <HiChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={goToNext}
              className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <HiChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-center gap-2.5">
        {preparedImages.map((src, index) => (
          <button
            key={`${src}-dot-${index}`}
            type="button"
            aria-label={`Slide ${index + 1}`}
            aria-pressed={displayIndex === index}
            onClick={() => setSelectedIndex(index)}
            className={`h-3.5 w-3.5 rounded-full transition ${displayIndex === index ? "scale-110" : ""}`}
            style={{
              backgroundColor: indicatorColor,
              opacity: displayIndex === index ? 1 : 0.38,
            }}
          />
        ))}
      </div>
    </div>
  );
}
