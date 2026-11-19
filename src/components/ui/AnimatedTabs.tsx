'use client';

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  Tabs,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
} from '@animate-ui/react/primitives/tabs';

export type AnimatedTabItem<T extends string = string> = {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
};

type AnimatedTabsVariant = 'segmented' | 'underline' | 'solid';

type AnimatedTabsProps<T extends string> = {
  items: ReadonlyArray<AnimatedTabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  /** segmented: sliding card on a muted track. underline: sliding bar. solid: sliding brand-colour pill. */
  variant?: AnimatedTabsVariant;
  size?: 'sm' | 'md';
  /** Stretch the tabs to share the full width equally. */
  fullWidth?: boolean;
  ariaLabel?: string;
  className?: string;
};

const listStyles: Record<AnimatedTabsVariant, string> = {
  segmented: 'gap-1 rounded-xl bg-[color:var(--muted)] p-1',
  underline: 'gap-1 border-b border-[color:var(--border)]',
  solid: 'gap-2',
};

const highlightStyles: Record<AnimatedTabsVariant, string> = {
  segmented:
    'absolute inset-0 rounded-lg bg-[color:var(--surface)] shadow-sm ring-1 ring-[color:var(--border)]',
  underline: 'absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[color:var(--primary)]',
  solid: 'absolute inset-0 rounded-full bg-[color:var(--primary)]',
};

const triggerStyles: Record<AnimatedTabsVariant, string> = {
  segmented:
    'rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--text)] data-[state=active]:text-[color:var(--text)]',
  underline:
    'text-[color:var(--text-muted)] hover:text-[color:var(--text)] data-[state=active]:text-[color:var(--primary)]',
  solid:
    'rounded-full text-[color:var(--text-muted)] ring-1 ring-inset ring-[color:var(--border)] hover:text-[color:var(--text)] data-[state=active]:text-[color:var(--primary-foreground)] data-[state=active]:ring-transparent',
};

const sizeStyles = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-10 px-4 text-sm',
} as const;

/**
 * App-wide tab bar built on Animate UI's Tabs primitive: the active indicator
 * slides between tabs, arrow keys move the selection (mirrored in RTL) and the
 * triggers carry the tab ARIA roles.
 *
 * It is controlled and only renders the bar. Panels stay with the caller, so a
 * tab's content (and its data fetching) still mounts only while it is active;
 * wrap it in <AnimatedTabPanel> for the enter transition.
 */
export function AnimatedTabs<T extends string>({
  items,
  value,
  onValueChange,
  variant = 'segmented',
  size = 'md',
  fullWidth = false,
  ariaLabel,
  className,
}: AnimatedTabsProps<T>) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      className={['min-w-0', fullWidth ? 'w-full' : 'max-w-full', className ?? ''].join(' ')}
    >
      <TabsHighlight className={highlightStyles[variant]}>
        <TabsList
          aria-label={ariaLabel}
          className={[
            'relative max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            fullWidth ? 'flex w-full' : 'inline-flex',
            listStyles[variant],
          ].join(' ')}
        >
          {items.map((item) => (
            <TabsHighlightItem
              key={item.value}
              value={item.value}
              className={['relative shrink-0', fullWidth ? 'grow basis-auto' : ''].join(' ')}
            >
              <TabsTrigger
                value={item.value}
                disabled={item.disabled}
                whileTap={{ scale: 0.97 }}
                className={[
                  'relative z-10 inline-flex w-full items-center justify-center gap-2 whitespace-nowrap font-semibold outline-none transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] disabled:cursor-not-allowed disabled:opacity-50',
                  sizeStyles[size],
                  triggerStyles[variant],
                ].join(' ')}
              >
                {item.icon ? <span className="inline-flex shrink-0" aria-hidden="true">{item.icon}</span> : null}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== null ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[color:var(--muted)] px-1.5 text-[11px] font-bold leading-5 text-[color:var(--text)]">
                    {item.badge}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsHighlightItem>
          ))}
        </TabsList>
      </TabsHighlight>
    </Tabs>
  );
}

/**
 * Enter transition for the content of the active tab. Give it the active tab
 * value as `tabKey` so it replays when the tab changes.
 */
export function AnimatedTabPanel({
  tabKey,
  children,
  className,
}: {
  tabKey: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={tabKey}
      role="tabpanel"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
