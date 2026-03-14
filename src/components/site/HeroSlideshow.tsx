"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

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
  const preparedImages = useMemo(
    () => images.map((item) => item.trim()).filter((item) => item.length > 0),
    [images]
  );
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (preparedImages.length === 0) return null;

  // Keep server HTML identical to first client render to avoid hydration mismatch.
  if (!hydrated) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <div className="relative h-full w-full">
          <Image
            src={preparedImages[0]}
            alt={alt}
            fill
            priority
            fetchPriority="high"
            quality={76}
            sizes="100vw"
            draggable={false}
            className="object-cover"
          />
        </div>
      </div>
    );
  }

  return <HeroSlideshowInteractive images={preparedImages} alt={alt} intervalMs={intervalMs} />;
}

function HeroSlideshowInteractive({
  images,
  alt,
  intervalMs,
}: {
  images: string[];
  alt: string;
  intervalMs: number;
}) {
  const preparedImages = images;
  const autoplayTimerRef = useRef<number | null>(null);
  const preloadTimerRef = useRef<number | null>(null);
  const preloadedSourcesRef = useRef<Set<string>>(new Set());
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: preparedImages.length > 1,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  const warmImage = useCallback((src: string, highPriority = false) => {
    if (!src || preloadedSourcesRef.current.has(src)) return;
    preloadedSourcesRef.current.add(src);
    const image = new window.Image();
    image.decoding = "async";
    if (highPriority) {
      (image as HTMLImageElement & { fetchPriority?: "high" | "low" | "auto" }).fetchPriority = "high";
    }
    image.src = src;
  }, []);

  useEffect(() => {
    if (preparedImages.length === 0) return;

    // Warm the first slides immediately for a fast first transition.
    const immediateCount = Math.min(preparedImages.length, 2);
    for (let index = 0; index < immediateCount; index += 1) {
      warmImage(preparedImages[index], index === 0);
    }

    // Warm the rest shortly after first paint to reduce jank on later slides.
    if (preloadTimerRef.current !== null) {
      window.clearTimeout(preloadTimerRef.current);
    }
    preloadTimerRef.current = window.setTimeout(() => {
      for (let index = immediateCount; index < preparedImages.length; index += 1) {
        warmImage(preparedImages[index]);
      }
    }, 260);

    return () => {
      if (preloadTimerRef.current !== null) {
        window.clearTimeout(preloadTimerRef.current);
        preloadTimerRef.current = null;
      }
    };
  }, [preparedImages, warmImage]);

  const stopAutoplay = useCallback(() => {
    if (autoplayTimerRef.current !== null) {
      window.clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!emblaApi || preparedImages.length <= 1) return;
    stopAutoplay();
    autoplayTimerRef.current = window.setInterval(() => {
      emblaApi.scrollNext();
    }, intervalMs);
  }, [emblaApi, preparedImages.length, intervalMs, stopAutoplay]);

  useEffect(() => {
    if (!emblaApi || preparedImages.length <= 1) return;
    startAutoplay();
    return () => stopAutoplay();
  }, [emblaApi, preparedImages.length, startAutoplay, stopAutoplay]);

  useEffect(() => {
    if (!emblaApi || preparedImages.length <= 1) return;

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
  }, [emblaApi, preparedImages.length, startAutoplay, stopAutoplay]);

  useEffect(() => {
    if (!emblaApi || preparedImages.length <= 1) return;

    const preloadUpcomingSlides = () => {
      const activeIndex = emblaApi.selectedScrollSnap();
      const nextIndex = (activeIndex + 1) % preparedImages.length;
      const secondNextIndex = (activeIndex + 2) % preparedImages.length;
      warmImage(preparedImages[nextIndex]);
      warmImage(preparedImages[secondNextIndex]);
    };

    preloadUpcomingSlides();
    emblaApi.on("select", preloadUpcomingSlides);
    return () => {
      emblaApi.off("select", preloadUpcomingSlides);
    };
  }, [emblaApi, preparedImages, warmImage]);

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
        {preparedImages.map((src, index) => (
          <div key={`${src}-${index}`} className="relative h-full min-w-0 flex-[0_0_100%]">
            <Image
              src={src}
              alt={alt}
              fill
              priority={index === 0}
              loading={index <= 1 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : "auto"}
              decoding="async"
              quality={76}
              sizes="100vw"
              draggable={false}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
