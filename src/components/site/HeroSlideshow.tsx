"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useEffect } from "react";

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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: images.length > 1,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  useEffect(() => {
    if (!emblaApi || images.length <= 1) return;

    const timer = window.setInterval(() => {
      emblaApi.scrollNext();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [emblaApi, images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div
      ref={emblaRef}
      className="absolute inset-0 touch-pan-y overflow-hidden select-none"
      role="region"
      aria-label={alt}
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
