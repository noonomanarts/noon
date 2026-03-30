"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

type ClassHeaderSlideshowProps = {
  images: string[];
  alt: string;
  intervalMs?: number;
  indicatorColor?: string;
};

export default function ClassHeaderSlideshow({
  images,
  alt,
  intervalMs = 4200,
  indicatorColor = "#cb8578",
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

  if (preparedImages.length === 0) {
    return (
      <div className="rounded-[2.25rem] bg-white/20 p-8 text-center text-sm text-white/80 backdrop-blur-sm">
        {alt}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="overflow-hidden rounded-[2.25rem] border border-white/35 bg-white/15 shadow-[0_34px_90px_rgba(46,27,17,0.24)] backdrop-blur-sm"
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
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
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
