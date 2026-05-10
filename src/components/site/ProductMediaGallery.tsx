"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const AUTOPLAY_INTERVAL_MS = 4000;

export default function ProductMediaGallery({
  title,
  images,
  noImageLabel,
  galleryLabel,
  mainAspectClass = "aspect-[3/4]",
}: {
  title: string;
  images: string[];
  noImageLabel: string;
  galleryLabel: string;
  mainAspectClass?: string;
}) {
  const preparedImages = useMemo(
    () => Array.from(new Set(images.map((item) => item.trim()).filter(Boolean))),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedActiveIndex = preparedImages.length > 0 ? activeIndex % preparedImages.length : 0;
  const activeImage = preparedImages[normalizedActiveIndex] ?? null;

  useEffect(() => {
    if (preparedImages.length <= 1) return;

    const autoplayTimer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % preparedImages.length);
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(autoplayTimer);
  }, [preparedImages.length]);

  return (
    <div className="space-y-3">
      <div
        className={[
          "relative w-full overflow-hidden border border-[color:var(--border)] bg-[color:var(--muted)]",
          mainAspectClass,
        ].join(" ")}
      >
        {activeImage ? (
          <Image
            src={activeImage}
            alt={title}
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[color:var(--text-subtle)]">
            {noImageLabel}
          </div>
        )}
      </div>

      {preparedImages.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--text-subtle)]">
            {galleryLabel}
          </p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
            {preparedImages.map((imageUrl, index) => {
              const isActive = index === normalizedActiveIndex;
              return (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative aspect-[3/4] overflow-hidden border bg-[color:var(--muted)] transition ${
                    isActive
                      ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]"
                      : "border-[color:var(--border)] hover:border-[color:var(--text-subtle)]"
                  }`}
                  aria-label={`Preview image ${index + 1}`}
                >
                  <Image src={imageUrl} alt={title} fill sizes="96px" className="object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
