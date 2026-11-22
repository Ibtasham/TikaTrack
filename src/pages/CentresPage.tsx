import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  List,
  Loader2,
  LocateFixed,
  Mail,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';

import { CentresMap } from '../components/CentresMap';
import { useDebouncedValue } from '../hooks';
import { useI18n } from '../i18n';
import { useToast } from '../contexts/ToastContext';
import { allVaccinationCentres, type VaccinationCentre } from '../data/vaccinationCentres';
import { copyToClipboard, downloadCSV } from '../lib/exporters';
import { formatDistanceKm, haversineDistanceKm, type Coordinates } from '../lib/geo';
import {
  getGoogleMapsApiKey,
  type RouteOrigin,
  type RouteSummary,
  type TravelModeKey,
} from '../lib/googleMaps';

const TYPES = ['government', 'private', 'ngo', 'hospital'] as const;
type CentreType = (typeof TYPES)[number];

const TYPE_ICONS: Record<CentreType, typeof Building2> = {
  government: Building2,
  private: ShieldCheck,
  ngo: CheckCircle2,
  hospital: Building2,
};

type SortKey = 'name' | 'district' | 'type' | 'distance';
type ViewMode = 'split' | 'map' | 'list';

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

const INITIAL_VISIBLE_COUNT = 60;
const PAGE_STEP = 60;

interface CentreCardProps {
  centre: VaccinationCentre;
  distanceKm: number | null;
  isSelected: boolean;
  activeRouteForCard: RouteSummary | null;
  mapsApiKey: string;
  language: 'en' | 'bn';
  isBangla: boolean;
  t: (key: string, ...args: Array<string | number>) => string;
  onFocusOnMap: (centre: VaccinationCentre) => void;
  onRequestRoute: (centre: VaccinationCentre) => void;
  onCopyPhone: (phone: string) => void;
}

const CentreCard = memo(function CentreCard({
  centre,
  distanceKm,
  isSelected,
  activeRouteForCard,
  mapsApiKey,
  language,
  isBangla,
  t,
  onFocusOnMap,
  onRequestRoute,
  onCopyPhone,
}: CentreCardProps) {
  const Icon = TYPE_ICONS[centre.type] ?? Building2;
  return (
    <li
      className={`card-padded flex flex-col gap-3 transition-colors ${
        isSelected ? 'border-emerald-600 dark:border-emerald-400' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300"
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
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">
              {t(`centres.type.${centre.type}`)}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {centre.district}, {centre.division}
            </span>
            {distanceKm !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-sky-700 tabular-nums dark:text-sky-400">
                  {t('centres.away', formatDistanceKm(distanceKm, language))}
                </span>
              </>
            )}
            {activeRouteForCard && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                  <Navigation className="h-3 w-3" aria-hidden="true" />
                  {activeRouteForCard.durationText} ({activeRouteForCard.distanceText})
                </span>
              </>
            )}
            <span aria-hidden="true">·</span>
            {centre.verified ? (
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                {t('centres.verified')}
              </span>
            ) : (
              <span className="font-medium text-amber-700 dark:text-amber-400">
                {t('centres.unverified')}
              </span>
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
                onClick={() => onCopyPhone(phone)}
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
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true" />
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
        <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">
            {t('centres.services')}:{' '}
          </span>
          {centre.services.join(' · ')}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
        {mapsApiKey && (
          <>
            <button
              type="button"
              className="btn-secondary btn-sm whitespace-nowrap shrink-0"
              onClick={() => onFocusOnMap(centre)}
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {t('centres.map.focus')}
            </button>
            <button
              type="button"
              className="btn-primary btn-sm whitespace-nowrap shrink-0"
              onClick={() => onRequestRoute(centre)}
            >
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
              {t('centres.map.getRoute')}
            </button>
          </>
        )}
        <a
          className="btn-secondary btn-sm whitespace-nowrap shrink-0"
          href={mapsUrl(centre, language)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {t('centres.openMaps')}
        </a>
        {centre.website && (
          <a
            className="btn-ghost btn-sm whitespace-nowrap shrink-0"
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
});

interface CentreDirectoryListProps {
  results: Array<{ centre: VaccinationCentre; distanceKm: number | null }>;
  viewMode: ViewMode;
  mapsApiKey: string;
  selectedCentreId: string | null;
  routeSummary: RouteSummary | null;
  language: 'en' | 'bn';
  isBangla: boolean;
  t: (key: string, ...args: Array<string | number>) => string;
  onClearFilters: () => void;
  onFocusOnMap: (centre: VaccinationCentre) => void;
  onRequestRoute: (centre: VaccinationCentre) => void;
  onCopyPhone: (phone: string) => void;
}

const CentreDirectoryList = memo(function CentreDirectoryList({
  results,
  viewMode,
  mapsApiKey,
  selectedCentreId,
  routeSummary,
  language,
  isBangla,
  t,
  onClearFilters,
  onFocusOnMap,
  onRequestRoute,
  onCopyPhone,
}: CentreDirectoryListProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="card-padded text-center">
        <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
          {t('centres.noData')}
        </p>
        <a href="tel:16263" className="btn-primary mt-4">
          <Phone className="h-4 w-4" aria-hidden="true" />
          {t('centres.callHelpline')}: 16263
        </a>
        <button type="button" className="btn-ghost mt-2" onClick={onClearFilters}>
          {t('vaccines.clearFilters')}
        </button>
      </div>
    );
  }

  const visibleResults = results.slice(0, visibleCount);
  const remaining = results.length - visibleResults.length;

  return (
    <div className="space-y-4">
      <ul
        className={`grid gap-4 ${
          viewMode === 'split' && mapsApiKey ? 'grid-cols-1' : 'lg:grid-cols-2'
        }`}
      >
        {visibleResults.map(({ centre, distanceKm }) => (
          <CentreCard
            key={centre.id}
            centre={centre}
            distanceKm={distanceKm}
            isSelected={selectedCentreId === centre.id}
            activeRouteForCard={
              routeSummary && routeSummary.centreId === centre.id ? routeSummary : null
            }
            mapsApiKey={mapsApiKey}
            language={language}
            isBangla={isBangla}
            t={t}
            onFocusOnMap={onFocusOnMap}
            onRequestRoute={onRequestRoute}
            onCopyPhone={onCopyPhone}
          />
        ))}
      </ul>

      {remaining > 0 && (
        <div className="card-padded flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-neutral-600 dark:text-neutral-300">
            {t('centres.showingOf', visibleResults.length, results.length)}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => setVisibleCount((prev) => prev + PAGE_STEP)}
            >
              {t('centres.loadMore', Math.min(PAGE_STEP, remaining))}
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setVisibleCount(results.length)}
            >
              {t('centres.showAll', results.length)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * `/centres` — the centre finder with interactive Google Maps, Places
 * Autocomplete neighbourhood search, nearby hospital discovery, and Routes API
 * ETA calculation alongside offline filtering & CSV export.
 */
export default function CentresPage() {
  const { t, language } = useI18n();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const isBangla = language === 'bn';

  const mapsApiKey = useMemo(() => getGoogleMapsApiKey(), []);

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      setQuery(qParam);
    }
  }, [searchParams]);
  const [division, setDivision] = useState('all');
  const [district, setDistrict] = useState('all');
  const [type, setType] = useState<CentreType | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('name');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [areaOrigin, setAreaOrigin] = useState<RouteOrigin | null>(null);
  const [locating, setLocating] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [selectedCentreId, setSelectedCentreId] = useState<string | null>(null);
  const [focusTrigger, setFocusTrigger] = useState(0);
  const [routeTarget, setRouteTarget] = useState<VaccinationCentre | null>(null);
  const [travelMode, setTravelMode] = useState<TravelModeKey>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);

  const debouncedQuery = useDebouncedValue(query, 200);

  // Unified distance/route origin: live GPS location takes precedence if enabled, otherwise selected Google Place area.
  const activeOrigin: RouteOrigin | null = useMemo(() => {
    if (userCoords) {
      return {
        coords: userCoords,
        label: t('centres.map.userLocation'),
        kind: 'gps',
      };
    }
    return areaOrigin;
  }, [userCoords, areaOrigin, t]);

  const divisions = useMemo(
    () =>
      [...new Set(allVaccinationCentres.map((centre) => centre.division).filter(Boolean))].sort(),
    [],
  );

  const divisionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const centre of allVaccinationCentres) {
      if (!centre.division) continue;
      counts[centre.division] = (counts[centre.division] ?? 0) + 1;
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
        activeOrigin && centre.coordinates
          ? haversineDistanceKm(activeOrigin.coords, centre.coordinates)
          : null,
    }));

    return withDistance.sort((a, b) => {
      if (sort === 'distance' && activeOrigin) {
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
  }, [activeOrigin, debouncedQuery, division, district, language, sort, type, verifiedOnly]);

  const activeFilters =
    (division !== 'all' ? 1 : 0) +
    (district !== 'all' ? 1 : 0) +
    (type !== 'all' ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = useCallback(() => {
    setQuery('');
    setDivision('all');
    setDistrict('all');
    setType('all');
    setVerifiedOnly(false);
    setSort(activeOrigin ? 'distance' : 'name');
  }, [activeOrigin]);

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
    if (!areaOrigin && sort === 'distance') {
      setSort('name');
    }
  };

  const handleAreaOriginSelect = useCallback(
    (origin: RouteOrigin | null) => {
      setAreaOrigin(origin);
      if (origin) {
        setUserCoords(null);
        setSort('distance');
      } else if (!userCoords && sort === 'distance') {
        setSort('name');
      }
    },
    [userCoords, sort],
  );

  const handleFocusOnMap = useCallback(
    (centre: VaccinationCentre) => {
      if (!centre.coordinates) {
        toast.info(t('centres.map.noCoords', centre.name[language] || centre.name.en));
        return;
      }
      if (viewMode === 'list') {
        setViewMode('split');
      }
      setSelectedCentreId(centre.id);
      setFocusTrigger((prev) => prev + 1);
    },
    [language, t, toast, viewMode],
  );

  const handleRequestRoute = useCallback(
    (centre: VaccinationCentre) => {
      if (!centre.coordinates) {
        toast.info(t('centres.map.noCoords', centre.name[language] || centre.name.en));
        return;
      }
      if (viewMode === 'list') {
        setViewMode('split');
      }
      setSelectedCentreId(centre.id);
      setFocusTrigger((prev) => prev + 1);
      setRouteTarget(centre);
      if (!activeOrigin) {
        toast.info(t('centres.map.routeNoOrigin'));
      }
    },
    [activeOrigin, language, t, toast, viewMode],
  );

  const handleClearRoute = useCallback(() => {
    setRouteTarget(null);
    setRouteSummary(null);
  }, []);

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

  const handleCopyPhone = useCallback(
    (phone: string) => {
      void copyToClipboard(phone).then((copied) => {
        if (copied) toast.success(t('common.actions.copied'), phone);
        else toast.error(t('common.status.error'));
      });
    },
    [t, toast],
  );

  const showMapSection = viewMode === 'split' || viewMode === 'map';
  const showListSection = viewMode === 'split' || viewMode === 'list';

  return (
    <div className="page-shell">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div>
          <p className="eyebrow">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.centres')}
          </p>
          <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
            {t('centres.title')}
          </h1>
          <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
            {t('centres.subtitle')}
          </p>
        </div>

        {/* View Mode Switcher */}
        <div
          role="group"
          aria-label={t('centres.map.heading')}
          className="no-print segmented-group"
        >
          {(
            [
              { id: 'split', icon: Columns2, label: t('centres.view.split') },
              { id: 'map', icon: MapIcon, label: t('centres.view.map') },
              { id: 'list', icon: List, label: t('centres.view.list') },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              aria-pressed={viewMode === id}
              className={`segmented-tab whitespace-nowrap shrink-0 ${
                viewMode === id ? 'segmented-tab-active' : ''
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* --- Controls ------------------------------------------------------ */}
      <div className="card-padded mt-6 no-print">
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
              {(activeOrigin ? (['distance', ...BASE_SORT_KEYS] as SortKey[]) : BASE_SORT_KEYS).map(
                (value) => (
                  <option key={value} value={value}>
                    {t(`centres.sort.${value}`)}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* Quick division filter strip */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setDivision('all');
              setDistrict('all');
            }}
            className={`chip border ${
              division === 'all'
                ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-600'
                : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
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
              className={`chip border tabular-nums ${
                division === div
                  ? 'border-emerald-700 bg-emerald-700 text-white dark:border-emerald-600 dark:bg-emerald-600'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {div} ({divisionCounts[div] ?? 0})
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

          {areaOrigin && !userCoords && (
            <span className="badge-done">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {t('centres.areaSearch.originBadge', areaOrigin.label)}
              <button
                type="button"
                className="ml-1 rounded hover:text-emerald-950 dark:hover:text-white"
                onClick={() => handleAreaOriginSelect(null)}
                aria-label={t('centres.areaSearch.clearOrigin')}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
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

      {/* --- Map + Directory Layout ---------------------------------------- */}
      <div
        className={`mt-6 grid gap-6 ${
          showMapSection && showListSection && mapsApiKey
            ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] xl:items-start'
            : 'grid-cols-1'
        }`}
      >
        {showMapSection && (
          <div
            className={`no-print ${
              showListSection && mapsApiKey ? 'xl:order-2 xl:sticky xl:top-20' : ''
            }`}
          >
            <CentresMap
              apiKey={mapsApiKey}
              centres={results}
              activeOrigin={activeOrigin}
              selectedCentreId={selectedCentreId}
              focusTrigger={focusTrigger}
              routeTarget={routeTarget}
              travelMode={travelMode}
              routeSummary={routeSummary}
              onSelectCentre={setSelectedCentreId}
              onAreaOriginSelect={handleAreaOriginSelect}
              onRequestRoute={handleRequestRoute}
              onClearRoute={handleClearRoute}
              onTravelModeChange={setTravelMode}
              onRouteSummaryChange={setRouteSummary}
            />
          </div>
        )}

        {showListSection && (
          <div className={showMapSection && mapsApiKey ? 'xl:order-1' : undefined}>
            <CentreDirectoryList
              results={results}
              viewMode={viewMode}
              mapsApiKey={mapsApiKey}
              selectedCentreId={selectedCentreId}
              routeSummary={routeSummary}
              language={language}
              isBangla={isBangla}
              t={t}
              onClearFilters={clearFilters}
              onFocusOnMap={handleFocusOnMap}
              onRequestRoute={handleRequestRoute}
              onCopyPhone={handleCopyPhone}
            />
          </div>
        )}
      </div>
    </div>
  );
}
