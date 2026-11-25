interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'dark';
  showText?: boolean;
  className?: string;
}

export const MAIN_LOGO_PATH = 'icons/tikatrack-logo.png';

const SIZES: Record<
  NonNullable<LogoProps['size']>,
  { box: number; radius: string; title: string; sub: string }
> = {
  sm: { box: 40, radius: 'rounded-lg', title: 'text-lg', sub: 'text-[10px]' },
  md: { box: 48, radius: 'rounded-xl', title: 'text-xl', sub: 'text-[11px]' },
  lg: { box: 68, radius: 'rounded-2xl', title: 'text-2xl', sub: 'text-xs' },
  xl: { box: 96, radius: 'rounded-2xl', title: 'text-4xl', sub: 'text-sm' },
};

/**
 * TikaTrack main brand logo.
 */
export default function Logo({
  size = 'md',
  variant = 'default',
  showText = true,
  className = '',
}: LogoProps) {
  const currentSize = SIZES[size];
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const logoSrc = `${normalizedBase}${MAIN_LOGO_PATH}`;

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

  const frameClass =
    variant === 'white'
      ? 'ring-1 ring-white/25'
      : 'ring-1 ring-black/15 dark:ring-white/15';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <img
        src={logoSrc}
        alt="TikaTrack logo"
        width={currentSize.box}
        height={currentSize.box}
        decoding="async"
        className={`shrink-0 ${currentSize.radius} bg-[#050c1b] object-cover shadow-xs ${frameClass}`}
        style={{ width: currentSize.box, height: currentSize.box }}
      />

      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`${currentSize.title} font-extrabold tracking-tight ${titleClass}`}>
            Tika
            <span
              className={
                variant === 'white' ? 'text-emerald-200' : 'text-emerald-700 dark:text-emerald-400'
              }
            >
              Track
            </span>
          </span>
          <span
            className={`font-bangla mt-0.5 font-semibold tracking-wide ${currentSize.sub} ${subClass}`}
          >
            টিকাট্র্যাক · EPI &amp; Lifespan
          </span>
        </div>
      )}
    </div>
  );
}
