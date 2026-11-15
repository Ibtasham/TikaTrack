import { useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';

import { useDebouncedValue } from '../hooks';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { allVaccinationCentres, type VaccinationCentre } from '../data/vaccinationCentres';
import { copyToClipboard, downloadCSV } from '../lib/exporters';
import { formatDistanceKm, haversineDistanceKm, type Coordinates } from '../lib/geo';

const TYPES = ['government', 'private', 'ngo', 'hospital'] as const;
type CentreType = (typeof TYPES)[number];

const TYPE_ICONS: Record<CentreType, typeof Building2> = {
  government: Building2,
  private: ShieldCheck,
  ngo: CheckCircle2,
  hospital: Building2,
};

type SortKey = 'name' | 'district' | 'type' | 'distance';

const BASE_SORT_KEYS: SortKey[] = ['name', 'district', 'type'];

/** Google Maps query — coordinates when we have them, otherwise the address. */
function mapsUrl(centre: VaccinationCentre, language: 'en' | 'bn'): string {
  const base = 'https://www.google.com/maps/search/?api=1&query=';
  if (centre.coordinates) {
    return `${base}${centre.coordinates.lat},${centre.coordinates.lng}`;
  }
  return `${base}${encodeURIComponent(centre.address[language] || centre.name.en)}`;
}

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/**
 * `/centres` — the centre finder.
 *
 * Filtering is a single pass where the free-text query is AND-ed with the
 * division, district, type and verified switches. The original app applied the
 * query *instead of* the dropdowns, so picking "Khulna" and then typing a name
 * silently searched the whole country again.
 */
export default function CentresPage() {
  const { t, language } = useI18n();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [query, setQuery] = useState('');
  const [division, setDivision] = useState('all');
  const [district, setDistrict] = useState('all');
  const [type, setType] = useState<CentreType | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('name');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 200);

  const divisions = useMemo(
    () =>
      [...new Set(allVaccinationCentres.map((centre) => centre.division).filter(Boolean))].sort(),
    [],
  );

  const divisionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const centre of allVaccinationCentres) {
      if (!centre.division) continue;
      counts.set(centre.division, (counts.get(centre.division) ?? 0) + 1);
    }
    return counts;
  }, []);

  const districts = useMemo(() => {
    const pool =
      division === 'all'
        ? allVaccinationCentres
        : allVaccinationCentres.filter((centre) => centre.division === division);
    return [...new Set(pool.map((centre) => centre.district).filter(Boolean))].sort();
  }, [division]);

  const results = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();

    const filtered = allVaccinationCentres.filter((centre) => {
      if (division !== 'all' && centre.division !== division) return false;
      if (district !== 'all' && centre.district !== district) return false;
      if (type !== 'all' && centre.type !== type) return false;
      if (verifiedOnly && !centre.verified) return false;
      if (!needle) return true;
      return (
        centre.name.en.toLowerCase().includes(needle) ||
        centre.name.bn.includes(debouncedQuery.trim()) ||
        centre.address.en.toLowerCase().includes(needle) ||
        centre.address.bn.includes(debouncedQuery.trim()) ||
        centre.district.toLowerCase().includes(needle) ||
        centre.division.toLowerCase().includes(needle) ||
        centre.services.some((service) => service.toLowerCase().includes(needle))
      );
    });

    const collator = new Intl.Collator(language === 'bn' ? 'bn' : 'en');
    const withDistance = filtered.map((centre) => ({
      centre,
      distanceKm:
        userCoords && centre.coordinates
          ? haversineDistanceKm(userCoords, centre.coordinates)
          : null,
    }));

    return withDistance.sort((a, b) => {
      if (sort === 'distance' && userCoords) {
        const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
        const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      if (sort === 'type') {
        const byType = a.centre.type.localeCompare(b.centre.type);
        if (byType !== 0) return byType;
      }
      if (sort === 'district') {
        const byDistrict = collator.compare(a.centre.district, b.centre.district);
        if (byDistrict !== 0) return byDistrict;
      }
      return collator.compare(a.centre.name[language], b.centre.name[language]);
    });
  }, [debouncedQuery, division, district, language, sort, type, userCoords, verifiedOnly]);

  const activeFilters =
    (division !== 'all' ? 1 : 0) +
    (district !== 'all' ? 1 : 0) +
    (type !== 'all' ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setQuery('');
    setDivision('all');
    setDistrict('all');
    setType('all');
    setVerifiedOnly(false);
    setSort(userCoords ? 'distance' : 'name');
  };

  const handleUseLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error(t('centres.locationUnsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort('distance');
        setLocating(false);
        toast.success(t('centres.locationActive'));
      },
      () => {
        setLocating(false);
        toast.warning(t('centres.locationDenied'));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  const handleClearLocation = () => {
    setUserCoords(null);
    if (sort === 'distance') setSort('name');
  };

  const handleExport = () => {
    const rows: unknown[][] = [
      [
        'Name (EN)',
        'Name (BN)',
        'Type',
        'Division',
        'District',
        'Address (EN)',
        'Phone',
        'Verified',
        'Source',
      ],
      ...results.map(({ centre }) => [
        centre.name.en,
        centre.name.bn,
        centre.type,
        centre.division,
        centre.district,
        centre.address.en,
        centre.phone.join(' / '),
        centre.verified ? 'yes' : 'no',
        centre.source,
      ]),
    ];
    downloadCSV(`tikatrack-centres-${results.length}.csv`, rows);
    toast.success(t('common.actions.download'), t('common.label.results', results.length));
  };

  const handleCopyPhone = async (phone: string) => {
    const copied = await copyToClipboard(phone);
    if (copied) toast.success(t('common.actions.copied'), phone);
    else toast.error(t('common.status.error'));
  };

  return (
    <div className="page-shell">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {t('nav.centres')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('centres.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('centres.subtitle')}
        </p>
      </header>

      {/* --- Controls ------------------------------------------------------ */}
      <div className="card-padded mt-8 no-print">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <label className="sr-only" htmlFor="centre-search">
              {t('centres.searchPlaceholder')}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <input
                id="centre-search"
                type="search"
                className="input-field pl-9"
                placeholder={t('centres.searchPlaceholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="centre-division">
              {t('centres.filter.division')}
            </label>
            <select
              id="centre-division"
              className="input-field"
              value={division}
              onChange={(event) => {
                setDivision(event.target.value);
                // Districts are scoped to the division; a stale choice would
                // otherwise silently hide every result.
                setDistrict('all');
              }}
            >
              <option value="all">{t('centres.allDivisions')}</option>
              {divisions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="centre-district">
              {t('centres.filter.district')}
            </label>
            <select
              id="centre-district"
              className="input-field"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
            >
              <option value="all">{t('centres.allDistricts')}</option>
              {districts.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="centre-type">
              {t('centres.filter.type')}
            </label>
            <select
              id="centre-type"
              className="input-field"
              value={type}
              onChange={(event) => setType(event.target.value as CentreType | 'all')}
            >
              <option value="all">{t('centres.allTypes')}</option>
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`centres.type.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="centre-sort">
              {t('vaccines.filter.sort')}
            </label>
            <select
              id="centre-sort"
              className="input-field"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {(userCoords ? (['distance', ...BASE_SORT_KEYS] as SortKey[]) : BASE_SORT_KEYS).map(
                (value) => (
                  <option key={value} value={value}>
                    {t(`centres.sort.${value}`)}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* Quick division chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setDivision('all');
              setDistrict('all');
            }}
            className={`chip ${
              division === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200'
            }`}
          >
            {t('centres.allDivisions')}
          </button>
          {divisions.map((div) => (
            <button
              key={div}
              type="button"
              onClick={() => {
                setDivision(div);
                setDistrict('all');
              }}
              className={`chip ${
                division === div
                  ? 'bg-emerald-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200'
              }`}
            >
              {div} ({divisionCounts.get(div) ?? 0})
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!userCoords ? (
            <button
              type="button"
              className="btn-secondary btn-sm whitespace-nowrap shrink-0"
              onClick={handleUseLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {locating ? t('centres.locating') : t('centres.nearMe')}
            </button>
          ) : (
            <button
              type="button"
              className="btn-ghost btn-sm whitespace-nowrap shrink-0 text-emerald-700 dark:text-emerald-300"
              onClick={handleClearLocation}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('centres.locationClear')}
            </button>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500"
              checked={verifiedOnly}
              onChange={(event) => setVerifiedOnly(event.target.checked)}
            />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t('centres.filter.verifiedOnly')}
            </span>
          </label>

          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            {t('centres.totalFound', results.length)}
          </span>

          {activeFilters > 0 && (
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('vaccines.clearFilters')}
            </button>
          )}

          <button type="button" className="btn-secondary btn-sm ml-auto" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t('centres.export')}
          </button>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className={isBangla ? 'font-bangla' : undefined}>{t('centres.disclaimer')}</span>
      </p>

      {/* --- Results ------------------------------------------------------- */}
      {results.length === 0 ? (
        <div className="card-padded mt-6 text-center">
          <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('centres.noData')}
          </p>
          <a href="tel:16263" className="btn-primary mt-4">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t('centres.callHelpline')}: 16263
          </a>
          <button type="button" className="btn-ghost mt-2" onClick={clearFilters}>
            {t('vaccines.clearFilters')}
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {results.map(({ centre, distanceKm }) => {
            const Icon = TYPE_ICONS[centre.type] ?? Building2;
            return (
              <li key={centre.id} className="card-padded flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2
                      className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {centre.name[language] || centre.name.en}
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="badge-neutral">{t(`centres.type.${centre.type}`)}</span>
                      <span>
                        {centre.district} · {centre.division}
                      </span>
                      {distanceKm !== null && (
                        <span className="badge-upcoming tabular-nums">
                          {t('centres.away', formatDistanceKm(distanceKm, language))}
                        </span>
                      )}
                      {centre.verified ? (
                        <span className="badge-done">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          {t('centres.verified')}
                        </span>
                      ) : (
                        <span className="badge-due">{t('centres.unverified')}</span>
                      )}
                    </p>
                  </div>
                </div>

                <address className="flex items-start gap-2 text-sm not-italic text-neutral-600 dark:text-neutral-300">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                  <span className={isBangla ? 'font-bangla' : undefined}>
                    {centre.address[language] || centre.address.en}
                  </span>
                </address>

                {centre.phone.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    {centre.phone.map((phone) => (
                      <span key={phone} className="flex items-center gap-1">
                        <a className="link text-sm" href={telHref(phone)}>
                          {phone}
                        </a>
                        <button
                          type="button"
                          className="text-neutral-400 transition-colors hover:text-emerald-600"
                          onClick={() => void handleCopyPhone(phone)}
                          aria-label={`${t('centres.copyPhone')}: ${phone}`}
                          title={t('centres.copyPhone')}
                        >
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {centre.hotline && (
                  <p className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <Phone className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {t('centres.hotline')}:
                    </span>
                    <a className="link" href={telHref(centre.hotline)}>
                      {centre.hotline}
                    </a>
                  </p>
                )}

                {centre.workingHours && (
                  <p className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <Clock
                      className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400"
                      aria-hidden="true"
                    />
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {centre.workingHours[language] || centre.workingHours.en}
                    </span>
                  </p>
                )}

                {centre.email && (
                  <p className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
                    <a className="link break-all" href={`mailto:${centre.email}`}>
                      {centre.email}
                    </a>
                  </p>
                )}

                {centre.services.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {t('centres.services')}
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {centre.services.map((service) => (
                        <li key={service} className="badge-neutral">
                          {service}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <a
                    className="btn-secondary btn-sm"
                    href={mapsUrl(centre, language)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('centres.openMaps')}
                  </a>
                  {centre.website && (
                    <a
                      className="btn-ghost btn-sm"
                      href={centre.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('vaccines.detail.viewSource')}
                    </a>
                  )}
                  <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
                    {t('centres.source')}: {centre.source}
                    {centre.lastUpdated && ` · ${centre.lastUpdated}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
