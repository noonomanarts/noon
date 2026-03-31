"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface CountryCode {
  code: string;   // ISO 3166-1 alpha-2
  name: string;
  nameAr: string;
  dial: string;   // e.g. "+968"
  flag: string;   // emoji flag
}

// Gulf + major countries — ordered: Gulf first, then alphabetical
const COUNTRY_CODES: CountryCode[] = [
  // Gulf countries (priority)
  { code: "OM", name: "Oman",                  nameAr: "عُمان",              dial: "+968", flag: "🇴🇲" },
  { code: "AE", name: "United Arab Emirates",  nameAr: "الإمارات",           dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia",          nameAr: "السعودية",           dial: "+966", flag: "🇸🇦" },
  { code: "BH", name: "Bahrain",               nameAr: "البحرين",            dial: "+973", flag: "🇧🇭" },
  { code: "KW", name: "Kuwait",                nameAr: "الكويت",             dial: "+965", flag: "🇰🇼" },
  { code: "QA", name: "Qatar",                 nameAr: "قطر",               dial: "+974", flag: "🇶🇦" },
  // Middle East & North Africa
  { code: "IQ", name: "Iraq",                  nameAr: "العراق",             dial: "+964", flag: "🇮🇶" },
  { code: "JO", name: "Jordan",                nameAr: "الأردن",             dial: "+962", flag: "🇯🇴" },
  { code: "LB", name: "Lebanon",               nameAr: "لبنان",              dial: "+961", flag: "🇱🇧" },
  { code: "PS", name: "Palestine",             nameAr: "فلسطين",             dial: "+970", flag: "🇵🇸" },
  { code: "SY", name: "Syria",                 nameAr: "سوريا",              dial: "+963", flag: "🇸🇾" },
  { code: "YE", name: "Yemen",                 nameAr: "اليمن",              dial: "+967", flag: "🇾🇪" },
  { code: "EG", name: "Egypt",                 nameAr: "مصر",               dial: "+20",  flag: "🇪🇬" },
  { code: "SD", name: "Sudan",                 nameAr: "السودان",            dial: "+249", flag: "🇸🇩" },
  { code: "LY", name: "Libya",                 nameAr: "ليبيا",              dial: "+218", flag: "🇱🇾" },
  { code: "TN", name: "Tunisia",               nameAr: "تونس",              dial: "+216", flag: "🇹🇳" },
  { code: "DZ", name: "Algeria",               nameAr: "الجزائر",            dial: "+213", flag: "🇩🇿" },
  { code: "MA", name: "Morocco",               nameAr: "المغرب",             dial: "+212", flag: "🇲🇦" },
  // Asia
  { code: "IN", name: "India",                 nameAr: "الهند",              dial: "+91",  flag: "🇮🇳" },
  { code: "PK", name: "Pakistan",              nameAr: "باكستان",            dial: "+92",  flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh",            nameAr: "بنغلاديش",           dial: "+880", flag: "🇧🇩" },
  { code: "PH", name: "Philippines",           nameAr: "الفلبين",            dial: "+63",  flag: "🇵🇭" },
  { code: "ID", name: "Indonesia",             nameAr: "إندونيسيا",          dial: "+62",  flag: "🇮🇩" },
  { code: "LK", name: "Sri Lanka",             nameAr: "سريلانكا",           dial: "+94",  flag: "🇱🇰" },
  { code: "NP", name: "Nepal",                 nameAr: "نيبال",              dial: "+977", flag: "🇳🇵" },
  { code: "CN", name: "China",                 nameAr: "الصين",              dial: "+86",  flag: "🇨🇳" },
  { code: "JP", name: "Japan",                 nameAr: "اليابان",            dial: "+81",  flag: "🇯🇵" },
  { code: "KR", name: "South Korea",           nameAr: "كوريا الجنوبية",     dial: "+82",  flag: "🇰🇷" },
  { code: "TR", name: "Turkey",                nameAr: "تركيا",              dial: "+90",  flag: "🇹🇷" },
  { code: "IR", name: "Iran",                  nameAr: "إيران",              dial: "+98",  flag: "🇮🇷" },
  // Europe
  { code: "GB", name: "United Kingdom",        nameAr: "المملكة المتحدة",    dial: "+44",  flag: "🇬🇧" },
  { code: "DE", name: "Germany",               nameAr: "ألمانيا",            dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "France",                nameAr: "فرنسا",              dial: "+33",  flag: "🇫🇷" },
  { code: "IT", name: "Italy",                 nameAr: "إيطاليا",            dial: "+39",  flag: "🇮🇹" },
  { code: "ES", name: "Spain",                 nameAr: "إسبانيا",            dial: "+34",  flag: "🇪🇸" },
  { code: "NL", name: "Netherlands",           nameAr: "هولندا",             dial: "+31",  flag: "🇳🇱" },
  { code: "PT", name: "Portugal",              nameAr: "البرتغال",           dial: "+351", flag: "🇵🇹" },
  { code: "SE", name: "Sweden",                nameAr: "السويد",             dial: "+46",  flag: "🇸🇪" },
  { code: "CH", name: "Switzerland",           nameAr: "سويسرا",             dial: "+41",  flag: "🇨🇭" },
  // Americas
  { code: "US", name: "United States",         nameAr: "الولايات المتحدة",   dial: "+1",   flag: "🇺🇸" },
  { code: "CA", name: "Canada",                nameAr: "كندا",              dial: "+1",   flag: "🇨🇦" },
  { code: "BR", name: "Brazil",                nameAr: "البرازيل",           dial: "+55",  flag: "🇧🇷" },
  { code: "MX", name: "Mexico",                nameAr: "المكسيك",            dial: "+52",  flag: "🇲🇽" },
  // Africa
  { code: "ET", name: "Ethiopia",              nameAr: "إثيوبيا",            dial: "+251", flag: "🇪🇹" },
  { code: "KE", name: "Kenya",                 nameAr: "كينيا",              dial: "+254", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria",               nameAr: "نيجيريا",            dial: "+234", flag: "🇳🇬" },
  { code: "ZA", name: "South Africa",          nameAr: "جنوب أفريقيا",       dial: "+27",  flag: "🇿🇦" },
  // Oceania
  { code: "AU", name: "Australia",             nameAr: "أستراليا",           dial: "+61",  flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand",           nameAr: "نيوزيلندا",          dial: "+64",  flag: "🇳🇿" },
];

const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // Oman

interface Props {
  locale: string;
  name?: string;          // hidden input name for full phone (e.g. "phone")
  required?: boolean;
  defaultDialCode?: string;
  defaultNumber?: string;
  inputClassName?: string;
}

export default function CountryCodeSelect({
  locale,
  name = "phone",
  required = false,
  defaultDialCode,
  defaultNumber = "",
  inputClassName = "",
}: Props) {
  const isAr = locale === "ar";
  const initialCountry = defaultDialCode
    ? COUNTRY_CODES.find((c) => c.dial === defaultDialCode) ?? DEFAULT_COUNTRY
    : DEFAULT_COUNTRY;

  const [selected, setSelected] = useState<CountryCode>(initialCountry);
  const [phoneNumber, setPhoneNumber] = useState(defaultNumber);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Full value sent to the server
  const fullPhone = `${selected.dial} ${phoneNumber}`.trim();

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open]);

  // Filter countries
  const filtered = search.trim()
    ? COUNTRY_CODES.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.nameAr.includes(q) ||
          c.dial.includes(q) ||
          c.code.toLowerCase().includes(q)
        );
      })
    : COUNTRY_CODES;

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll("[data-country-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  const selectCountry = useCallback(
    (country: CountryCode) => {
      setSelected(country);
      setOpen(false);
      setSearch("");
    },
    []
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[highlightIndex]) selectCountry(filtered[highlightIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  }

  const baseInput =
    inputClassName ||
    "w-full rounded-xl border border-zinc-300 bg-[color:var(--surface)] px-4 py-2.5 text-sm text-[color:var(--text)] shadow-sm transition-all placeholder:text-zinc-400 hover:border-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-[color:var(--text-subtle)] dark:hover:border-zinc-600 dark:focus:border-white dark:focus:ring-white/10";

  return (
    <div ref={containerRef} className="relative" dir="ltr">
      {/* Hidden input carries the full phone value to the server */}
      <input type="hidden" name={name} value={fullPhone} />

      <div className="flex">
        {/* Country code button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-s-xl border border-e-0 border-zinc-300 bg-zinc-50 px-3 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus:outline-none focus:ring-4 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus:ring-white/10"
        >
          <span className="text-lg leading-none">{selected.flag}</span>
          <span className="font-mono text-sm">{selected.dial}</span>
          <svg
            className={`h-3.5 w-3.5 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Phone number input */}
        <input
          type="tel"
          lang="en"
          dir="ltr"
          required={required}
          value={phoneNumber}
          onChange={(e) => {
            // Allow only digits, spaces, dashes
            const val = e.target.value.replace(/[^\d\s-]/g, "");
            setPhoneNumber(val);
          }}
          placeholder={isAr ? "رقم الهاتف" : "Phone number"}
          className={`${baseInput} rounded-s-none border-s-0 !rounded-e-xl`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          onKeyDown={handleKeyDown}
        >
          {/* Search */}
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAr ? "ابحث عن دولة..." : "Search country..."}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
            />
          </div>

          {/* Country list */}
          <div
            ref={dropdownRef}
            role="listbox"
            className="max-h-60 overflow-y-auto overscroll-contain"
          >
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-center text-sm text-zinc-400">
                {isAr ? "لا توجد نتائج" : "No results found"}
              </div>
            ) : (
              filtered.map((country, idx) => {
                const isSelected = country.code === selected.code;
                const isHighlighted = idx === highlightIndex;
                return (
                  <button
                    key={country.code + country.dial}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-country-item
                    onClick={() => selectCountry(country)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-start text-sm transition-colors ${
                      isHighlighted
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    } ${isSelected ? "font-medium text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}
                  >
                    <span className="text-lg leading-none">{country.flag}</span>
                    <span className="flex-1 truncate">
                      {isAr ? country.nameAr : country.name}
                    </span>
                    <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                      {country.dial}
                    </span>
                    {isSelected && (
                      <svg className="h-4 w-4 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
