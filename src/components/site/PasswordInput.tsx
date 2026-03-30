'use client';

import { useState } from 'react';
import { sanitizeEnglishPassword } from '@/lib/passwordPolicy';

type PasswordInputProps = {
  locale: 'en' | 'ar';
  name?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
  inputClassName: string;
  restrictEnglish?: boolean;
  onValueChange?: (value: string) => void;
};

export default function PasswordInput({
  locale,
  name,
  value,
  defaultValue,
  required,
  minLength,
  placeholder,
  autoComplete,
  disabled,
  className,
  inputClassName,
  restrictEnglish = false,
  onValueChange,
}: PasswordInputProps) {
  const isArabic = locale === 'ar';
  const [visible, setVisible] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');

  const currentValue = value !== undefined ? value : internalValue;

  const handleValue = (nextRawValue: string) => {
    const nextValue = restrictEnglish ? sanitizeEnglishPassword(nextRawValue) : nextRawValue;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  return (
    <div className={className ?? 'relative'}>
      <input
        type={visible ? 'text' : 'password'}
        name={name}
        value={currentValue}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        dir="ltr"
        lang="en"
        onChange={(event) => handleValue(event.target.value)}
        className={`${inputClassName} pr-20`}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {visible ? (isArabic ? 'إخفاء' : 'Hide') : (isArabic ? 'إظهار' : 'Show')}
      </button>
    </div>
  );
}
