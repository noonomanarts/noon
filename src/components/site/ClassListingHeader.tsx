import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import type { Locale } from "@/lib/locale";

import ClassHeaderSlideshow from "./ClassHeaderSlideshow";

type ClassListingHeaderProps = {
  locale: Locale;
  title: string;
  subtitle?: string;
  backgroundColor: string;
  textColor?: string;
  slideImages: string[];
  autoplayMs?: number;
  backLabel: string;
};

export default function ClassListingHeader({
  locale,
  title,
  subtitle,
  backgroundColor,
  textColor = "#ffffff",
  slideImages,
  autoplayMs,
  backLabel,
}: ClassListingHeaderProps) {
  const titleFont = locale === "ar" ? "var(--font-hero-ar)" : "var(--font-home-title-en)";

  return (
    <section
      className="mb-14 overflow-x-clip md:mb-20"
      style={{
        background: `linear-gradient(180deg, ${backgroundColor} 0%, ${backgroundColor} 60%, #ffffff 60%, #ffffff 100%)`,
      }}
    >
      <div className="mx-auto max-w-6xl px-4 pt-2 pb-0 md:pt-4">
        <div className="mb-5">
          <Link
            href={`/${locale}/classes`}
            className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/12 px-4 py-2 text-sm font-semibold shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            style={{ color: textColor }}
          >
            <FiArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div className="flex items-center md:min-h-[18rem]">
            <h1
              className="whitespace-nowrap text-3xl font-bold leading-[1] tracking-[0.03em] sm:text-4xl md:text-[2.75rem] lg:text-[3.25rem]"
              style={{ color: textColor, fontFamily: titleFont }}
            >
              {title}
            </h1>
          </div>

          <div className="w-full max-w-[14rem] justify-self-center sm:max-w-[16rem] md:max-w-none md:-translate-y-2 md:justify-self-end lg:-translate-y-4">
            <ClassHeaderSlideshow
              images={slideImages}
              alt={title}
              intervalMs={autoplayMs}
              indicatorColor={backgroundColor}
            />
          </div>
        </div>

        {subtitle ? (
          <p className="mt-10 max-w-3xl text-sm leading-7 text-[color:var(--text-muted)] sm:text-base md:mt-24 lg:mt-28">
            {subtitle}
          </p>
        ) : null}
      </div>
    </section>
  );
}
