"use client";

import { useEffect, useState } from "react";

interface Bubble {
  id: number;
  size: number;
  left: number;
  delay: number;
  duration: number;
  opacity: number;
}

interface BubblesAnimationProps {
  count?: number;
  className?: string;
}

export default function BubblesAnimation({
  count = 20,
  className = "",
}: BubblesAnimationProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    setIsReducedMotion(prefersReducedMotion);

    if (prefersReducedMotion) return;

    // Generate random bubbles
    const generatedBubbles: Bubble[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      size: Math.random() * 20 + 6, // 6px to 26px
      left: Math.random() * 100, // 0% to 100%
      delay: Math.random() * 8, // 0s to 8s delay
      duration: Math.random() * 10 + 12, // 12s to 22s
      opacity: Math.random() * 0.15 + 0.03, // 0.03 to 0.18 (very subtle)
    }));

    setBubbles(generatedBubbles);
  }, [count]);

  if (isReducedMotion || bubbles.length === 0) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute animate-bubble-rise rounded-full"
          style={{
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            left: `${bubble.left}%`,
            bottom: `-${bubble.size + 10}px`,
            animationDelay: `${bubble.delay}s`,
            animationDuration: `${bubble.duration}s`,
            opacity: bubble.opacity,
            background: `radial-gradient(circle at 30% 30%, 
              rgba(255, 255, 255, 0.9), 
              rgba(45, 212, 191, 0.4) 40%, 
              rgba(20, 184, 166, 0.2) 60%,
              transparent 70%)`,
            boxShadow: `
              inset 0 0 ${bubble.size * 0.3}px rgba(255, 255, 255, 0.5),
              inset ${bubble.size * 0.1}px ${bubble.size * 0.1}px ${bubble.size * 0.2}px rgba(255, 255, 255, 0.4),
              0 0 ${bubble.size * 0.5}px rgba(45, 212, 191, 0.1)
            `,
          }}
        />
      ))}

      {/* Additional floating particles */}
      {bubbles.slice(0, Math.floor(count / 3)).map((bubble) => (
        <div
          key={`particle-${bubble.id}`}
          className="absolute animate-bubble-rise-slow rounded-full"
          style={{
            width: `${bubble.size * 0.4}px`,
            height: `${bubble.size * 0.4}px`,
            left: `${(bubble.left + 15) % 100}%`,
            bottom: `-${bubble.size}px`,
            animationDelay: `${bubble.delay + 2}s`,
            animationDuration: `${bubble.duration + 5}s`,
            opacity: bubble.opacity * 0.6,
            background: `radial-gradient(circle at 40% 40%, 
              rgba(255, 255, 255, 0.8), 
              rgba(167, 139, 250, 0.3) 50%,
              transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
