"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";

type ClassHeaderSlideshowProps = {
  images: string[];
  alt: string;
  intervalMs?: number;
  indicatorColor?: string;
  className?: string;
};

function normalizeImageSrc(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;
  return `/${trimmed}`;
}

export default function ClassHeaderSlideshow({
  images,
  alt,
  intervalMs = 4200,
  indicatorColor = "#cb8578",
  className,
}: ClassHeaderSlideshowProps) {
  const preparedImages = Array.from(
    new Set(images.map((item) => normalizeImageSrc(item)).filter((item) => item.length > 0))
  );

  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (preparedImages.length === 0) {
    return (
      <div className="rounded-[2.25rem] bg-white/20 p-8 text-center text-sm text-white/80 backdrop-blur-sm">
        {alt}
      </div>
    );
  }

  if (!hydrated) {
    return (
      <div className={className ? `w-full ${className}` : "w-full"}>
        <div className="group relative overflow-hidden rounded-[2.25rem] border border-white/35 bg-white/15 shadow-[0_34px_90px_rgba(46,27,17,0.24)] backdrop-blur-sm">
          <div className="relative aspect-[3/4] w-full bg-white/20">
            <Image
              src={preparedImages[0]}
              alt={alt}
              fill
              priority
              fetchPriority="high"
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 24rem"
              draggable={false}
              className="object-cover"
            />
          </div>
        </div>
        {preparedImages.length > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2.5">
            {preparedImages.map((src, index) => (
              <span
                key={`${src}-dot-${index}`}
                className="h-3.5 w-3.5 rounded-full"
                style={{
                  backgroundColor: indicatorColor,
                  opacity: index === 0 ? 1 : 0.38,
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <ClassHeaderSlideshowInteractive
      images={preparedImages}
      alt={alt}
      intervalMs={intervalMs}
      indicatorColor={indicatorColor}
      className={className}
    />
  );
}

function ClassHeaderSlideshowInteractive({
  images,
  alt,
  intervalMs,
  indicatorColor,
  className,
}: {
  images: string[];
  alt: string;
  intervalMs: number;
  indicatorColor: string;
  className?: string;
}) {
  const autoplayTimerRef = useRef<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const goToPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const goToNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const goToSlide = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  return (
    <div className={className ? `w-full ${className}` : "w-full"}>
      <div
        className="group relative overflow-hidden rounded-[2.25rem] border border-white/35 bg-white/15 shadow-[0_34px_90px_rgba(46,27,17,0.24)] backdrop-blur-sm"
        onMouseEnter={stopAutoplay}
        onMouseLeave={startAutoplay}
      >
        <div
          ref={emblaRef}
          className="touch-pan-y overflow-hidden select-none"
          role="region"
          aria-roledescription="carousel"
          aria-label={alt}
        >
          <div className="flex">
            {images.map((src, index) => (
              <div key={`${src}-${index}`} className="relative min-w-0 flex-[0_0_100%]">
                <div className="relative aspect-[3/4] w-full bg-white/20">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    priority={index === 0}
                    loading={index <= 1 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 50vw, 24rem"
                    draggable={false}
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
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
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2.5">
          {images.map((src, index) => (
            <button
              key={`${src}-dot-${index}`}
              type="button"
              aria-label={`Slide ${index + 1}`}
              aria-pressed={selectedIndex === index}
              onClick={() => goToSlide(index)}
              className={`h-3.5 w-3.5 rounded-full transition ${selectedIndex === index ? "scale-110" : ""}`}
              style={{
                backgroundColor: indicatorColor,
                opacity: selectedIndex === index ? 1 : 0.38,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
