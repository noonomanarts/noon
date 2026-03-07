'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Map as MapLibreMap, Marker as MapLibreMarker, StyleSpecification } from 'maplibre-gl';

type DeliveryLocation = {
  lat: number;
  lng: number;
};

type MuscatLocationPickerProps = {
  locale: 'en' | 'ar';
  value: DeliveryLocation | null;
  onChange: (location: DeliveryLocation) => void;
};

type MuscatBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

const MUSCAT_CENTER = {
  lng: 58.405922,
  lat: 23.588031,
} as const;

const MUSCAT_BOUNDS: MuscatBounds = {
  west: 58.03,
  south: 23.2,
  east: 58.95,
  north: 23.9,
};

const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

function clampToMuscat(location: DeliveryLocation): DeliveryLocation {
  const lng = Math.min(MUSCAT_BOUNDS.east, Math.max(MUSCAT_BOUNDS.west, location.lng));
  const lat = Math.min(MUSCAT_BOUNDS.north, Math.max(MUSCAT_BOUNDS.south, location.lat));
  return { lat, lng };
}

export function MuscatLocationPicker({ locale, value, onChange }: MuscatLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);
  const maplibreRef = useRef<typeof import('maplibre-gl') | null>(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  const mapTexts = useMemo(() => {
    const isArabic = locale === 'ar';
    return {
      title: isArabic ? 'لوكيشن التوصيل على الخريطة' : 'Delivery Location on Map',
      hint: isArabic
        ? 'اختَر نقطة التوصيل بدقة داخل مسقط عبر النقر على الخريطة، ثم يمكنك سحب العلامة.'
        : 'Pick the exact delivery point inside Muscat by clicking the map, then drag the marker if needed.',
      selected: isArabic ? 'النقطة المحددة' : 'Selected point',
      waiting: isArabic ? 'لم يتم تحديد النقطة بعد' : 'No location selected yet',
      lat: isArabic ? 'خط العرض' : 'Lat',
      lng: isArabic ? 'خط الطول' : 'Lng',
    };
  }, [locale]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    let active = true;

    const setupMap = async () => {
      const maplibregl = await import('maplibre-gl');
      if (!active || !mapContainerRef.current) return;

      maplibreRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: OSM_STYLE,
        center: [MUSCAT_CENTER.lng, MUSCAT_CENTER.lat],
        zoom: 10.6,
        minZoom: 9.7,
        maxZoom: 18,
        maxBounds: [
          [MUSCAT_BOUNDS.west, MUSCAT_BOUNDS.south],
          [MUSCAT_BOUNDS.east, MUSCAT_BOUNDS.north],
        ],
        attributionControl: false,
        dragRotate: false,
        touchPitch: false,
      });

      mapRef.current = map;

      const ensureMarker = (nextLocation: DeliveryLocation) => {
        const markerLocation = clampToMuscat(nextLocation);

        if (!markerRef.current) {
          const markerEl = document.createElement('div');
          markerEl.style.width = '18px';
          markerEl.style.height = '18px';
          markerEl.style.borderRadius = '9999px';
          markerEl.style.background = 'var(--noon-coral)';
          markerEl.style.border = '2px solid #ffffff';
          markerEl.style.boxShadow = '0 0 0 6px rgba(247, 125, 107, 0.28)';

          markerRef.current = new maplibregl.Marker({
            element: markerEl,
            draggable: true,
          })
            .setLngLat([markerLocation.lng, markerLocation.lat])
            .addTo(map);

          markerRef.current.on('dragend', () => {
            const dragged = markerRef.current?.getLngLat();
            if (!dragged) return;
            const clamped = clampToMuscat({ lat: dragged.lat, lng: dragged.lng });
            markerRef.current?.setLngLat([clamped.lng, clamped.lat]);
            onChangeRef.current(clamped);
          });
        } else {
          markerRef.current.setLngLat([markerLocation.lng, markerLocation.lat]);
        }

        onChangeRef.current(markerLocation);
      };

      map.on('click', (event) => {
        ensureMarker({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      });

    };

    void setupMap();

    return () => {
      active = false;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      maplibreRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const maplibregl = maplibreRef.current;
    if (!map || !maplibregl) return;

    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const clamped = clampToMuscat(value);

    if (!markerRef.current) {
      const markerEl = document.createElement('div');
      markerEl.style.width = '18px';
      markerEl.style.height = '18px';
      markerEl.style.borderRadius = '9999px';
      markerEl.style.background = 'var(--noon-coral)';
      markerEl.style.border = '2px solid #ffffff';
      markerEl.style.boxShadow = '0 0 0 6px rgba(247, 125, 107, 0.28)';

      markerRef.current = new maplibregl.Marker({
        element: markerEl,
        draggable: true,
      })
        .setLngLat([clamped.lng, clamped.lat])
        .addTo(map);

      markerRef.current.on('dragend', () => {
        const dragged = markerRef.current?.getLngLat();
        if (!dragged) return;
        const next = clampToMuscat({ lat: dragged.lat, lng: dragged.lng });
        markerRef.current?.setLngLat([next.lng, next.lat]);
        onChangeRef.current(next);
      });
    } else {
      markerRef.current.setLngLat([clamped.lng, clamped.lat]);
    }
  }, [value]);

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[color:var(--text)]">{mapTexts.title}</span>
        <span className="text-xs text-[color:var(--text-subtle)]">{mapTexts.hint}</span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]">
        <div ref={mapContainerRef} className="h-72 w-full" />
      </div>
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-2 text-xs text-[color:var(--text-muted)]">
        {value ? (
          <span>
            {mapTexts.selected}: {mapTexts.lat} {value.lat.toFixed(6)}, {mapTexts.lng} {value.lng.toFixed(6)}
          </span>
        ) : (
          <span>{mapTexts.waiting}</span>
        )}
      </div>
    </div>
  );
}
