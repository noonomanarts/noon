"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type PartnerCarouselItem = {
  id: string;
  name: string;
  logoSrc: string;
};

export default function PartnersCarousel({
  items,
  isArabic,
}: {
  items: PartnerCarouselItem[];
  isArabic: boolean;
}) {
  const desktopVisibleSlides = 6;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: items.length > desktopVisibleSlides,
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    direction: isArabic ? "rtl" : "ltr",
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const frameId = window.requestAnimationFrame(() => onSelect());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);

    return () => {
      window.cancelAnimationFrame(frameId);
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden">
      <div className="space-y-4">
        <div
          ref={emblaRef}
          className="touch-pan-y overflow-hidden select-none"
          role="region"
          aria-roledescription="carousel"
          aria-label={isArabic ? "شعارات الشركاء" : "Partner logos"}
        >
          <div className="flex">
            {items.map((item) => (
              <div
                key={item.id}
                className="min-w-0 flex-[0_0_50%] pe-2 sm:flex-[0_0_33.333%] sm:pe-3 md:flex-[0_0_25%] lg:flex-[0_0_16.6667%]"
              >
                <div className="group flex min-h-[9.25rem] items-center justify-center rounded-2xl bg-transparent px-3 py-6 text-center text-sm font-semibold text-[color:var(--text-muted)] transition duration-300">
                  {item.logoSrc ? (
                    <div className="relative h-20 w-full max-w-[210px]">
                      <Image
                        src={item.logoSrc}
                        alt={item.name}
                        fill
                        className="object-contain transition duration-300 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 28vw, (max-width: 1280px) 22vw, 16vw"
                      />
                    </div>
                  ) : (
                    item.name
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {items.length > 1 ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canScrollPrev}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--muted)]/70 text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={isArabic ? "السابق" : "Previous"}
            >
              <FiChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canScrollNext}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--muted)]/70 text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={isArabic ? "التالي" : "Next"}
            >
              <FiChevronRight className="size-5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
