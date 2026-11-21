import { useId } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<LogoProps['size']>, { box: number; title: string; sub: string }> = {
  sm: { box: 36, title: 'text-lg', sub: 'text-[10px]' },
  md: { box: 44, title: 'text-xl', sub: 'text-[11px]' },
  lg: { box: 58, title: 'text-2xl', sub: 'text-xs' },
  xl: { box: 76, title: 'text-4xl', sub: 'text-sm' },
};

/**
 * TikaTrack precision medical monogram.
 *
 * Combines a faceted clinical protection shield, a negative-space immunization
 * droplet core, an ascending verification trajectory arc, and a crimson
 * vital-care node — crisp at 16px favicon scale and 76px hero scale without
 * decorative blur glows or floating stickers.
 */
export default function Logo({
  size = 'md',
  variant = 'default',
  showText = true,
  className = '',
}: LogoProps) {
  const uid = useId().replace(/:/g, '');
  const gradId = `tt-shield-${uid}`;
  const facetId = `tt-facet-${uid}`;
  const currentSize = SIZES[size];

  const shieldStops =
    variant === 'white'
      ? { top: '#ffffff', mid: '#f8fafc', bot: '#e2e8f0', stroke: '#cbd5e1', glyph: '#047857', accent: '#e11d48', bevel: '#ffffff' }
      : variant === 'dark'
        ? { top: '#1e293b', mid: '#0f172a', bot: '#020617', stroke: '#334155', glyph: '#34d399', accent: '#fb7185', bevel: '#475569' }
        : { top: '#10b981', mid: '#059669', bot: '#065f46', stroke: '#047857', glyph: '#ffffff', accent: '#fda4af', bevel: '#a7f3d0' };

  const titleClass =
    variant === 'white'
      ? 'text-white'
      : variant === 'dark'
        ? 'text-neutral-900 dark:text-white'
        : 'text-neutral-900 dark:text-white';

  const subClass =
    variant === 'white'
      ? 'text-emerald-100/80'
      : 'text-neutral-500 dark:text-neutral-400';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={currentSize.box}
        height={currentSize.box}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="TikaTrack emblem"
        className="shrink-0 drop-shadow-xs"
      >
        <defs>
          <linearGradient id={gradId} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={shieldStops.top} />
            <stop offset="0.55" stopColor={shieldStops.mid} />
            <stop offset="1" stopColor={shieldStops.bot} />
          </linearGradient>
          <linearGradient id={facetId} x1="32" y1="6" x2="56" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#022c22" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Architectural shield body */}
        <path
          d="M32 4.5 9 13.2v17.3c0 14.3 9.7 25.4 23 29.4 13.3-4 23-15.1 23-29.4V13.2L32 4.5Z"
          fill={`url(#${gradId})`}
          stroke={shieldStops.stroke}
          strokeWidth="1.25"
        />

        {/* Right geometric facet for depth without blurry glow */}
        <path
          d="M32 4.5v55.4c13.3-4 23-15.1 23-29.4V13.2L32 4.5Z"
          fill={`url(#${facetId})`}
        />

        {/* Inner precision hairline */}
        <path
          d="M32 8.8 13.2 16v14.5c0 12 8.1 21.4 18.8 25 10.7-3.6 18.8-13 18.8-25V16L32 8.8Z"
          stroke={shieldStops.bevel}
          strokeOpacity="0.34"
          strokeWidth="1.2"
        />

        {/* Immunization droplet core + negative-space verification trajectory */}
        <path
          d="M32 16.5c-5.4 6.7-10.2 12-10.2 18a10.2 10.2 0 1 0 20.4 0c0-6-4.8-11.3-10.2-18Z"
          fill={shieldStops.glyph}
          fillOpacity="0.18"
          stroke={shieldStops.glyph}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />

        {/* Crisp ascending clinical checkmark bisecting the droplet */}
        <path
          d="m24.5 34.8 5 5.1 11.4-12.1"
          stroke={shieldStops.glyph}
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Vital protection node */}
        <circle cx="43.5" cy="21" r="3.4" fill={shieldStops.accent} />
        <circle cx="43.5" cy="21" r="1.4" fill="#ffffff" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${currentSize.title} font-extrabold tracking-tight ${titleClass}`}>
            Tika<span className={variant === 'white' ? 'text-emerald-200' : 'text-emerald-700 dark:text-emerald-400'}>Track</span>
          </span>
          <span className={`font-bangla mt-0.5 font-semibold tracking-wide ${currentSize.sub} ${subClass}`}>
            টিকাট্র্যাক · EPI &amp; Lifespan
          </span>
        </div>
      )}
    </div>
  );
}
