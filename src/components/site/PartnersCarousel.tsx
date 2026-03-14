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
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: items.length > 3,
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
    <div className="space-y-3">
      <div
        ref={emblaRef}
        className="touch-pan-y overflow-hidden select-none"
        role="region"
        aria-roledescription="carousel"
        aria-label={isArabic ? "شعارات الشركاء" : "Partner logos"}
      >
        <div className="flex">
          {items.map((item) => (
            <div key={item.id} className="min-w-0 flex-[0_0_82%] pe-3 sm:flex-[0_0_48%] lg:flex-[0_0_32%]">
              <div className="flex min-h-24 items-center justify-center rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-5 text-center text-sm font-semibold text-[color:var(--text-muted)] shadow-sm">
                {item.logoSrc ? (
                  <div className="relative h-12 w-full max-w-[170px]">
                    <Image
                      src={item.logoSrc}
                      alt={item.name}
                      fill
                      className="object-contain"
                      sizes="(max-width: 640px) 70vw, (max-width: 1024px) 40vw, 28vw"
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
            disabled={!canScrollPrev && items.length <= 3}
            className="inline-flex h-8 w-8 items-center justify-center rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isArabic ? "السابق" : "Previous"}
          >
            <FiChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            disabled={!canScrollNext && items.length <= 3}
            className="inline-flex h-8 w-8 items-center justify-center rounded-none border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] transition hover:bg-[color:var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isArabic ? "التالي" : "Next"}
          >
            <FiChevronRight className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
