import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Filter, Search, Syringe, X } from 'lucide-react';

import { Skeleton } from '../components/Skeleton';
import { VaccineModal } from '../components/VaccineModal';
import { useDebouncedValue } from '../hooks';
import { useI18n } from '../i18n';
import { getVaccineClinicalProfile } from '../data/vaccineClinicalDetails';
import { evidenceForLegacy, type ProgrammeClass } from '../data/evidence';
import { allVaccines, vaccineColors, type Vaccine } from '../data/vaccines';

const CATEGORIES = ['routine', 'campaign', 'special', 'recommended', 'non_routine'] as const;
type Category = (typeof CATEGORIES)[number];

const PROGRAMME_GROUPS = ['epi', 'campaigns', 'private', 'international', 'research'] as const;
type ProgrammeGroup = (typeof PROGRAMME_GROUPS)[number];

function matchesProgrammeGroup(programme: ProgrammeClass | undefined, group: ProgrammeGroup): boolean {
  if (!programme) return group === 'international';
  switch (group) {
    case 'epi':
      return programme === 'bd-nip-routine';
    case 'campaigns':
      return (
        programme === 'bd-national-campaign' ||
        programme === 'bd-sia' ||
        programme === 'bd-planned-introduction' ||
        programme === 'bd-special-risk'
      );
    case 'private':
      return programme === 'private-market-bd';
    case 'international':
      return (
        programme === 'international-reference' ||
        programme === 'travel' ||
        programme === 'occupational'
      );
    case 'research':
      return programme === 'research-not-available';
  }
}

type SortKey = 'name' | 'category' | 'introduced';

const SORT_KEYS: SortKey[] = ['name', 'category', 'introduced'];

function accentBg(colour: string): string {
  const found = vaccineColors[colour] ?? vaccineColors.emerald;
  return found.bg;
}

/**
 * `/vaccines` — the catalogue.
 */
export default function VaccinesPage() {
  const { t, language } = useI18n();
  const isBangla = language === 'bn';

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [programmeGroup, setProgrammeGroup] = useState<ProgrammeGroup | 'all'>('all');
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
      if (programmeGroup !== 'all') {
        const evidence = evidenceForLegacy(vaccine.id);
        if (!matchesProgrammeGroup(evidence?.programme, programmeGroup)) return false;
      }
      if (ageGroup !== 'all' && vaccine.ageGroup !== ageGroup) return false;
      if (!needle) return true;
      const clinical = getVaccineClinicalProfile(vaccine);
      return (
        vaccine.name.en.toLowerCase().includes(needle) ||
        vaccine.name.bn.includes(debouncedQuery.trim()) ||
        vaccine.fullName.en.toLowerCase().includes(needle) ||
        vaccine.fullName.bn.includes(debouncedQuery.trim()) ||
        vaccine.disease.en.toLowerCase().includes(needle) ||
        vaccine.disease.bn.includes(debouncedQuery.trim()) ||
        clinical.platform.en.toLowerCase().includes(needle) ||
        clinical.platform.bn.includes(debouncedQuery.trim()) ||
        clinical.route.en.toLowerCase().includes(needle) ||
        clinical.formulations.toLowerCase().includes(needle) ||
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
  }, [ageGroup, category, debouncedQuery, language, programmeGroup, sort]);

  const activeFilters =
    (category !== 'all' ? 1 : 0) +
    (programmeGroup !== 'all' ? 1 : 0) +
    (ageGroup !== 'all' ? 1 : 0) +
    (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setQuery('');
    setCategory('all');
    setProgrammeGroup('all');
    setAgeGroup('all');
    setSort('name');
  };

  return (
    <div className="page-shell">
      <header className="border-b border-neutral-200/80 pb-6 dark:border-neutral-800">
        <p className="eyebrow">
          <Syringe className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t('nav.vaccines')}</span>
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('vaccines.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('vaccines.subtitle')}
        </p>
      </header>

      {/* --- Controls ------------------------------------------------------ */}
      <div className="card-padded mt-6 space-y-4 no-print">
        {/* Segmented programme group tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
            {t('vaccines.filter.programme')}:
          </span>
          <div className="segmented-group" role="group" aria-label={t('vaccines.filter.programme')}>
            <button
              type="button"
              aria-pressed={programmeGroup === 'all'}
              onClick={() => setProgrammeGroup('all')}
              className={`segmented-tab ${programmeGroup === 'all' ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300' : ''}`}
            >
              {t('common.label.all')}
            </button>
            {PROGRAMME_GROUPS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={programmeGroup === value}
                onClick={() => setProgrammeGroup(value)}
                className={`segmented-tab ${
                  programmeGroup === value ? 'segmented-tab-active text-emerald-700 dark:text-emerald-300' : ''
                } ${isBangla ? 'font-bangla' : ''}`}
              >
                {t(`vaccines.programmeGroup.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative md:col-span-2 lg:col-span-1 lg:self-end">
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
            <label className="label" htmlFor="vaccine-programme">
              {t('vaccines.filter.programme')}
            </label>
            <select
              id="vaccine-programme"
              className="input-field"
              value={programmeGroup}
              onChange={(event) => setProgrammeGroup(event.target.value as ProgrammeGroup | 'all')}
            >
              <option value="all">{t('common.label.all')}</option>
              {PROGRAMME_GROUPS.map((value) => (
                <option key={value} value={value}>
                  {t(`vaccines.programmeGroup.${value}`)}
                </option>
              ))}
            </select>
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

        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
          <span className="font-medium text-neutral-600 tabular-nums dark:text-neutral-300">
            {t('vaccines.count', results.length)}
          </span>
          {activeFilters > 0 && (
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('vaccines.clearFilters')}
            </button>
          )}
          <span className="ml-auto flex items-center gap-1.5 text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
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
          {results.map((vaccine) => {
            const stripe = accentBg(vaccine.color);
            const evidence = evidenceForLegacy(vaccine.id);
            const isResearch = evidence ? !evidence.publishable : false;
            const clinical = getVaccineClinicalProfile(vaccine);
            return (
              <li key={vaccine.id} className="card-hover flex flex-col overflow-hidden">
                {/* 3px subtle clinical colour hairline rule instead of a saturated banner */}
                <div className={`h-1 w-full ${stripe}`} aria-hidden="true" />

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {evidence && (
                        <p
                          className={`text-[11px] font-semibold tracking-wide uppercase ${
                            evidence.programme === 'bd-nip-routine'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : isResearch
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-sky-700 dark:text-sky-400'
                          } ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {t(`vaccines.programme.${evidence.programme}`)}
                        </p>
                      )}
                      <h2 className={`mt-1 truncate text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                        {vaccine.name[language]}
                      </h2>
                      <p className={`truncate text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                        {vaccine.fullName[language]}
                      </p>
                    </div>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200/80 bg-neutral-50 text-base dark:border-neutral-800 dark:bg-neutral-800/60"
                      aria-hidden="true"
                    >
                      {vaccine.icon}
                    </span>
                  </div>

                  <p className={`line-clamp-2 text-sm font-medium text-neutral-800 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}>
                    {vaccine.disease[language]}
                  </p>

                  <p className={`text-xs font-medium text-neutral-500 tabular-nums dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                    {t(`vaccines.category.${vaccine.category}`)}
                    <span aria-hidden="true"> · </span>
                    {isResearch
                      ? t('vaccines.researchOnlyDoses')
                      : t('vaccines.doses', vaccine.doses)}
                    {vaccine.efficacy ? (
                      <>
                        <span aria-hidden="true"> · </span>
                        {t('vaccines.efficacy')}: {vaccine.efficacy}
                      </>
                    ) : null}
                  </p>

                  <dl className="space-y-1.5 border-t border-neutral-100 pt-2.5 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
                    <div>
                      <dt className="inline font-semibold text-neutral-500 dark:text-neutral-400">
                        {t('vaccines.detail.schedule')}:{' '}
                      </dt>
                      <dd className={`inline tabular-nums ${isBangla ? 'font-bangla' : ''}`}>
                        {vaccine.schedule[language]}
                      </dd>
                    </div>
                    <div className="line-clamp-1">
                      <dt className="inline font-semibold text-neutral-500 dark:text-neutral-400">
                        {t('vaccines.detail.platform')}:{' '}
                      </dt>
                      <dd className={`inline ${isBangla ? 'font-bangla' : ''}`}>
                        {clinical.platform[language]}
                      </dd>
                    </div>
                    <div className="line-clamp-1">
                      <dt className="inline font-semibold text-neutral-500 dark:text-neutral-400">
                        {t('vaccines.detail.route')}:{' '}
                      </dt>
                      <dd className={`inline tabular-nums ${isBangla ? 'font-bangla' : ''}`}>
                        {clinical.route[language]}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <Link
                      to={`/vaccines/${vaccine.id}`}
                      className="btn-secondary btn-sm flex-1 whitespace-nowrap shrink-0"
                    >
                      {t('vaccines.detail.openFullProfile')}
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost btn-sm whitespace-nowrap shrink-0"
                      onClick={() => setSelected(vaccine)}
                      aria-label={`${t('vaccines.detail.quickOverview')}: ${vaccine.name.en}`}
                    >
                      {t('vaccines.detail.quickOverview')}
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
