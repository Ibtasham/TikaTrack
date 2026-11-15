import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Printer, Scale, X } from 'lucide-react';

import { useToast } from '../contexts/ToastContext';
import { usePersistentState } from '../hooks';
import { useI18n } from '../i18n';
import { allVaccines, vaccineColors, type Vaccine } from '../data/vaccines';
import { printElement } from '../lib/exporters';
import { STORAGE_KEYS } from '../lib/storage';

const MAX_COMPARE = 3;

/** Rows of the comparison table: a label key plus how to read it off a vaccine. */
const ATTRIBUTES: Array<{
  key: string;
  read: (vaccine: Vaccine, language: 'en' | 'bn') => string;
}> = [
  { key: 'name', read: (vaccine, language) => vaccine.name[language] },
  { key: 'fullName', read: (vaccine, language) => vaccine.fullName[language] },
  { key: 'disease', read: (vaccine, language) => vaccine.disease[language] },
  { key: 'category', read: (vaccine) => vaccine.category },
  { key: 'schedule', read: (vaccine, language) => vaccine.schedule[language] },
  { key: 'doses', read: (vaccine) => String(vaccine.doses ?? '—') },
  { key: 'efficacy', read: (vaccine) => vaccine.efficacy || '—' },
  { key: 'ageGroup', read: (vaccine) => vaccine.ageGroup || '—' },
  { key: 'introduced', read: (vaccine) => vaccine.introduced || '—' },
  { key: 'commonEffects', read: (vaccine, language) => vaccine.commonEffects[language] },
  { key: 'seriousEffects', read: (vaccine, language) => vaccine.seriousEffects[language] },
  { key: 'contraindications', read: (vaccine, language) => vaccine.contraindications[language] },
  { key: 'source', read: (vaccine) => vaccine.source },
];

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

/**
 * `/compare` — side-by-side vaccine comparison.
 *
 * The selection is persisted, so "add to comparison" on a vaccine detail page
 * survives a reload and the page is deep-linkable by state rather than by URL
 * (the comparison is a scratchpad, not a document).
 */
export default function ComparePage() {
  const { t, language } = useI18n();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [selectedIds, setSelectedIds] = usePersistentState<string[]>(
    STORAGE_KEYS.compare,
    [],
    isIdList,
  );
  const tableRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => allVaccines.find((vaccine) => vaccine.id === id))
        .filter((vaccine): vaccine is Vaccine => Boolean(vaccine))
        .slice(0, MAX_COMPARE),
    [selectedIds],
  );

  const candidates = useMemo(
    () => allVaccines.filter((vaccine) => !selectedIds.includes(vaccine.id)),
    [selectedIds],
  );

  const add = (id: string) => {
    if (selectedIds.length >= MAX_COMPARE) {
      toast.warning(t('compare.limit', MAX_COMPARE));
      return;
    }
    setSelectedIds([...selectedIds, id]);
  };

  const remove = (id: string) => setSelectedIds(selectedIds.filter((entry) => entry !== id));

  const handlePrint = () => {
    if (!tableRef.current) return;
    const opened = printElement(tableRef.current, t('compare.title'));
    if (!opened) toast.error(t('common.status.error'));
  };

  return (
    <div className="page-shell">
      <header className="no-print">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <Scale className="h-4 w-4" aria-hidden="true" />
          {t('nav.compare')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('compare.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('compare.subtitle')}
        </p>
      </header>

      {/* --- Picker -------------------------------------------------------- */}
      <div className="card-padded mt-8 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              className={`font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('compare.picker')}
            </h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
              {selectedIds.length === 0
                ? t('compare.addFirst')
                : selectedIds.length === 1
                  ? t('compare.addSecond')
                  : t('compare.limit', MAX_COMPARE)}
            </p>
          </div>
          {selectedIds.length > 0 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSelectedIds([])}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compare.clear')}
            </button>
          )}
        </div>

        <label className="sr-only" htmlFor="compare-select">
          {t('compare.picker')}
        </label>
        <select
          id="compare-select"
          className="input-field mt-4"
          value=""
          disabled={selectedIds.length >= MAX_COMPARE}
          onChange={(event) => {
            if (event.target.value) add(event.target.value);
          }}
        >
          <option value="">{t('compare.hint')}</option>
          {candidates.map((vaccine) => (
            <option key={vaccine.id} value={vaccine.id}>
              {vaccine.name[language]} — {vaccine.disease[language]}
            </option>
          ))}
        </select>

        {selected.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {selected.map((vaccine) => {
              const colour = vaccineColors[vaccine.color] ?? vaccineColors.emerald;
              return (
                <li key={vaccine.id}>
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${colour.bg} ${colour.text}`}
                  >
                    <span className={isBangla ? 'font-bangla' : undefined}>
                      {vaccine.name[language]}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(vaccine.id)}
                      aria-label={`${t('compare.remove')}: ${vaccine.name.en}`}
                      className="opacity-80 transition-opacity hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* --- Table --------------------------------------------------------- */}
      {selected.length === 0 ? (
        <div className="card-padded mt-6 text-center">
          <p className={`text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
            {t('compare.empty')}
          </p>
          <Link to="/vaccines" className="btn-primary mt-4">
            {t('compare.browse')}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 flex justify-end gap-3 no-print">
            <button type="button" className="btn-secondary btn-sm" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" aria-hidden="true" />
              {t('compare.print')}
            </button>
          </div>

          <div ref={tableRef} className="card mt-3 overflow-hidden print-area">
            <div className="table-scroll">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <caption className="sr-only">{t('compare.title')}</caption>
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800">
                    <th
                      scope="col"
                      className={`px-4 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-200 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {t('compare.attribute')}
                    </th>
                    {selected.map((vaccine) => (
                      <th
                        key={vaccine.id}
                        scope="col"
                        className={`px-4 py-3 text-left font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                      >
                        <Link to={`/vaccines/${vaccine.id}`} className="link">
                          {vaccine.name[language]}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ATTRIBUTES.map(({ key, read }) => (
                    <tr
                      key={key}
                      className="border-t border-neutral-100 align-top dark:border-neutral-800"
                    >
                      <th
                        scope="row"
                        className={`px-4 py-3 text-left font-medium whitespace-nowrap text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {t(`compare.attribute.${key}`)}
                      </th>
                      {selected.map((vaccine) => (
                        <td
                          key={vaccine.id}
                          className={`px-4 py-3 text-neutral-800 dark:text-neutral-100 ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {key === 'category'
                            ? t(`vaccines.category.${vaccine.category}`)
                            : read(vaccine, language)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 no-print">
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t('tracker.medicalAdvice')}
            </span>
          </p>
        </>
      )}
    </div>
  );
}
