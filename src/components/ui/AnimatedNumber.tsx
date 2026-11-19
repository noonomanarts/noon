'use client';

import { CountingNumber } from '@animate-ui/react/primitives/texts/counting-number';

/**
 * Counts up to a value when it scrolls into view (Animate UI CountingNumber).
 * Renders the final number on the server, so it is correct without JavaScript.
 */
export function AnimatedNumber({
  value,
  decimalPlaces = 0,
  className,
}: {
  value: number;
  decimalPlaces?: number;
  className?: string;
}) {
  return (
    <CountingNumber
      number={value}
      decimalPlaces={decimalPlaces}
      thousandSeparator=","
      inView
      inViewOnce
      initiallyStable
      className={className}
    />
  );
}
