"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";

type HeroSlideshowProps = {
  images: string[];
  alt: string;
  intervalMs?: number;
};

export default function HeroSlideshow({
  images,
  alt,
  intervalMs = 3800,
}: HeroSlideshowProps) {
  const autoplayTimerRef = useRef<number | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: images.length > 1,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const stopAutoplay = useCallback(() => {
    if (autoplayTimerRef.current !== null) {
      window.clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!emblaApi || images.length <= 1) return;
    stopAutoplay();
    autoplayTimerRef.current = window.setInterval(() => {
      emblaApi.scrollNext();
    }, intervalMs);
  }, [emblaApi, images.length, intervalMs, stopAutoplay]);

  useEffect(() => {
    if (!emblaApi || images.length <= 1) return;
    startAutoplay();
    return () => stopAutoplay();
  }, [emblaApi, images.length, startAutoplay, stopAutoplay]);

  useEffect(() => {
    if (!emblaApi || images.length <= 1) return;

    const onPointerDown = () => stopAutoplay();
    const onPointerUp = () => startAutoplay();

    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);
    emblaApi.on("settle", onPointerUp);

    return () => {
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
      emblaApi.off("settle", onPointerUp);
    };
  }, [emblaApi, images.length, startAutoplay, stopAutoplay]);

  if (images.length === 0) return null;

  return (
    <div
      ref={emblaRef}
      className="absolute inset-0 touch-pan-y overflow-hidden select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label={alt}
      tabIndex={0}
      onMouseEnter={stopAutoplay}
      onMouseLeave={startAutoplay}
      onFocusCapture={stopAutoplay}
      onBlurCapture={startAutoplay}
      onKeyDown={(event) => {
        if (!emblaApi) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          emblaApi.scrollNext();
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          emblaApi.scrollPrev();
        }
      }}
    >
      <div className="flex h-full">
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="relative h-full min-w-0 flex-[0_0_100%]">
            <Image
              src={src}
              alt={alt}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 90vw, 36vw"
              draggable={false}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
