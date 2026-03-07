"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <>
      {images.map((src, index) => (
        <Image
          key={`${src}-${index}`}
          src={src}
          alt={alt}
          fill
          priority={index === 0}
          sizes="(max-width: 1024px) 90vw, 36vw"
          className={`object-cover transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
        />
      ))}

      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/25 px-2 py-1 backdrop-blur">
        {images.map((_, index) => (
          <span
            key={`dot-${index}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === activeIndex ? "w-4 bg-white" : "w-1.5 bg-white/55"}`}
          />
        ))}
      </div>
    </>
  );
}
