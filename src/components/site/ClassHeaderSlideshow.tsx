"use client";

import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { A11y, Autoplay, Keyboard, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper/types";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

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
  const preparedImages = useMemo(
    () =>
      Array.from(
        new Set(images.map((item) => normalizeImageSrc(item)).filter((item) => item.length > 0)),
      ),
    [images],
  );

  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const sliderId = useId().replace(/:/g, "");
  const navigationPrevClass = `class-header-slideshow-prev-${sliderId}`;
  const navigationNextClass = `class-header-slideshow-next-${sliderId}`;
  const paginationClass = `class-header-slideshow-pagination-${sliderId}`;

  if (preparedImages.length === 0) {
    return (
      <div className="rounded-[2.25rem] bg-white/20 p-8 text-center text-sm text-white/80 backdrop-blur-sm">
        {alt}
      </div>
    );
  }

  const enableSlider = preparedImages.length > 1;

  return (
    <div className={className ? `w-full ${className}` : "w-full"}>
      <div
        className="group relative overflow-hidden rounded-[2.25rem] border border-white/35 bg-white/15 shadow-[0_34px_90px_rgba(46,27,17,0.24)] backdrop-blur-sm"
        onMouseEnter={() => swiper?.autoplay?.stop()}
        onMouseLeave={() => swiper?.autoplay?.start()}
      >
        <Swiper
          modules={[A11y, Autoplay, Keyboard, Navigation, Pagination]}
          className="touch-pan-y select-none"
          slidesPerView={1}
          loop={enableSlider}
          speed={700}
          allowTouchMove={enableSlider}
          grabCursor={enableSlider}
          watchOverflow
          keyboard={{ enabled: enableSlider }}
          autoplay={
            enableSlider
              ? {
                  delay: intervalMs,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: false,
                }
              : false
          }
          navigation={
            enableSlider
              ? {
                  prevEl: `.${navigationPrevClass}`,
                  nextEl: `.${navigationNextClass}`,
                }
              : false
          }
          pagination={
            enableSlider
              ? {
                  el: `.${paginationClass}`,
                  clickable: true,
                  bulletClass:
                    "class-header-slideshow-bullet h-3.5 w-3.5 rounded-full transition-transform duration-200",
                  bulletActiveClass: "class-header-slideshow-bullet-active scale-110",
                  renderBullet: (_, className) =>
                    `<button type="button" class="${className}" aria-label="Go to slide"></button>`,
                }
              : false
          }
          a11y={{
            containerMessage: alt,
            containerRoleDescriptionMessage: "carousel",
            slideRole: "group",
          }}
          onSwiper={setSwiper}
        >
          {preparedImages.map((src, index) => (
            <SwiperSlide key={`${src}-${index}`}>
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
                  className="object-cover"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {enableSlider ? (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              className={`absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${navigationPrevClass}`}
            >
              <HiChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next slide"
              className={`absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${navigationNextClass}`}
            >
              <HiChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {enableSlider ? (
        <>
          <div className={`mt-5 flex items-center justify-center gap-2.5 ${paginationClass}`} />
          <style jsx>{`
            :global(.${paginationClass} .class-header-slideshow-bullet) {
              background-color: ${indicatorColor};
              opacity: 0.38;
            }

            :global(.${paginationClass} .class-header-slideshow-bullet-active) {
              opacity: 1;
            }
          `}</style>
        </>
      ) : null}
    </div>
  );
}
