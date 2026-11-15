import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Syringe, X } from 'lucide-react';

import { Skeleton } from '../components/Skeleton';
import { VaccineModal } from '../components/VaccineModal';
import { useDebouncedValue } from '../hooks';
import { useI18n } from '../i18n';
import { allVaccines, vaccineColors, type Vaccine } from '../data/vaccines';

const CATEGORIES = ['routine', 'campaign', 'special', 'recommended', 'non_routine'] as const;
type Category = (typeof CATEGORIES)[number];

type SortKey = 'name' | 'category' | 'introduced';

const SORT_KEYS: SortKey[] = ['name', 'category', 'introduced'];

/** Readable colour classes for a vaccine's declared colour name. */
function colourClasses(colour: string): { bg: string; text: string } {
  const found = vaccineColors[colour] ?? vaccineColors.emerald;
  return { bg: found.bg, text: found.text };
}

/**
 * `/vaccines` — the catalogue.
 *
 * Search is debounced and every filter is combined with AND, which is the bug
 * the original single-file app had: its search box ignored the district and
 * type selections, so "Dhaka" plus a query silently widened back to the whole
 * country.
 */
export default function VaccinesPage() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [ageGroup, setAgeGroup] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [selected, setSelected] = useState<Vaccine | null>(null);

  const debouncedQuery = useDebouncedValue(query, 200);

  const ageGroups = useMemo(
    () => [...new Set(allVaccines.map((vaccine) => vaccine.ageGroup).filter(Boolean))].sort(),
    [],
  );

  const results = useMemo(() => {
    const needle = debouncedQuery.trim().toLowerCase();

    const filtered = allVaccines.filter((vaccine) => {
      if (category !== 'all' && vaccine.category !== category) return false;
      if (ageGroup !== 'all' && vaccine.ageGroup !== ageGroup) return false;
      if (!needle) return true;
      return (
        vaccine.name.en.toLowerCase().includes(needle) ||
        vaccine.name.bn.includes(debouncedQuery.trim()) ||
        vaccine.fullName.en.toLowerCase().includes(needle) ||
        vaccine.fullName.bn.includes(debouncedQuery.trim()) ||
        vaccine.disease.en.toLowerCase().includes(needle) ||
        vaccine.disease.bn.includes(debouncedQuery.trim()) ||
        vaccine.id.toLowerCase().includes(needle)
      );
    });

    const collator = new Intl.Collator(language === 'bn' ? 'bn' : 'en');
    return [...filtered].sort((a, b) => {
      if (sort === 'introduced') return (a.introduced || '').localeCompare(b.introduced || '');
      if (sort === 'category') {
        const byCategory = a.category.localeCompare(b.category);
        if (byCategory !== 0) return byCategory;
      }
      return collator.compare(a.name[language], b.name[language]);
    });
  }, [ageGroup, category, debouncedQuery, language, sort]);

  const activeFilters =
    (category !== 'all' ? 1 : 0) + (ageGroup !== 'all' ? 1 : 0) + (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setAgeGroup('all');
    setSort('name');
  };

  return (
    <div className="page-shell">
      <header>
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <Syringe className="h-4 w-4" aria-hidden="true" />
          {t('nav.vaccines')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('vaccines.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('vaccines.subtitle')}
        </p>
      </header>

      {/* --- Controls ------------------------------------------------------ */}
      <div className="card-padded mt-8 no-print">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <label className="sr-only" htmlFor="vaccine-search">
              {t('vaccines.search')}
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="vaccine-search"
              type="search"
              className="input-field pl-9"
              placeholder={t('vaccines.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="vaccine-category">
              {t('vaccines.filter.category')}
            </label>
            <select
              id="vaccine-category"
              className="input-field"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category | 'all')}
            >
              <option value="all">{t('common.label.all')}</option>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {t(`vaccines.category.${value}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="vaccine-age">
              {t('vaccines.filter.ageGroup')}
            </label>
            <select
              id="vaccine-age"
              className="input-field"
              value={ageGroup}
              onChange={(event) => setAgeGroup(event.target.value)}
            >
              <option value="all">{t('common.label.all')}</option>
              {ageGroups.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="vaccine-sort">
              {t('vaccines.filter.sort')}
            </label>
            <select
              id="vaccine-sort"
              className="input-field"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
            >
              {SORT_KEYS.map((value) => (
                <option key={value} value={value}>
                  {t(`vaccines.sort.${value}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            {t('vaccines.count', results.length)}
          </span>
          {activeFilters > 0 && (
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('vaccines.clearFilters')}
            </button>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            {t('centres.filters.active', activeFilters)}
          </span>
        </div>
      </div>

      {/* --- Results ------------------------------------------------------- */}
      {results.length === 0 ? (
        <div className="card-padded mt-6 text-center">
          <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('vaccines.empty')}
          </p>
          <button type="button" className="btn-secondary mt-4" onClick={clearFilters}>
            {t('vaccines.clearFilters')}
          </button>
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((vaccine, index) => {
            const { bg, text } = colourClasses(vaccine.color);
            return (
              <li
                key={vaccine.id}
                className={`card-hover animate-slide-up flex flex-col stagger-${Math.min(index, 6) + 1}`}
              >
                <div
                  className={`flex items-center gap-3 rounded-t-[var(--radius-card)] px-5 py-4 ${bg}`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {vaccine.icon}
                  </span>
                  <div className="min-w-0">
                    <h2 className={`truncate font-bold ${text} ${isBangla ? 'font-bangla' : ''}`}>
                      {vaccine.name[language]}
                    </h2>
                    <p
                      className={`truncate text-xs ${text} opacity-90 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {vaccine.fullName[language]}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <p
                    className={`line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {vaccine.disease[language]}
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    <span className="badge-neutral">
                      {t(`vaccines.category.${vaccine.category}`)}
                    </span>
                    <span className="badge-neutral">{t('vaccines.doses', vaccine.doses)}</span>
                  </div>

                  <div className="mt-auto flex gap-2 pt-2">
                    <Link to={`/vaccines/${vaccine.id}`} className="btn-secondary btn-sm flex-1">
                      {t('common.actions.learnMore')}
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => setSelected(vaccine)}
                      aria-label={`${t('common.actions.viewAll')}: ${vaccine.name.en}`}
                    >
                      {t('common.actions.viewAll')}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Placeholder row keeps the grid height stable while the debounce runs. */}
      {query !== debouncedQuery && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          <Skeleton className="h-40 rounded-[var(--radius-card)]" />
          <Skeleton className="h-40 rounded-[var(--radius-card)]" />
          <Skeleton className="h-40 rounded-[var(--radius-card)]" />
        </div>
      )}

      {selected && <VaccineModal vaccine={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
