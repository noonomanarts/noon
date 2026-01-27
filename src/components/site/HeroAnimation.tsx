"use client";

import { useEffect, useRef } from "react";
import lottie, { type AnimationItem } from "lottie-web";

interface HeroAnimationProps {
  animationPath: string;
  className?: string;
  loop?: boolean;
}

export default function HeroAnimation({
  animationPath,
  className,
  loop = true,
}: HeroAnimationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    animationRef.current = lottie.loadAnimation({
      container,
      renderer: "svg",
      loop,
      autoplay: false,
      path: animationPath,
    });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      animationRef.current.goToAndStop(0, true);
      return () => {
        animationRef.current?.destroy();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animationRef.current?.play();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
      animationRef.current?.destroy();
    };
  }, [animationPath, loop]);

  return <div ref={containerRef} className={className} aria-hidden />;
}
