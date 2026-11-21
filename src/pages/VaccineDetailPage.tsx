import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FlaskConical,
  HeartPulse,
  Info,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Syringe,
  ThermometerSun,
  Users,
  UserX,
} from 'lucide-react';

import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { usePersistentState } from '../hooks';
import { useI18n } from '../i18n';
import { getVaccineClinicalProfile } from '../data/vaccineClinicalDetails';
import { allVaccines, vaccineColors } from '../data/vaccines';
import { evidenceForLegacy, KNOWLEDGE_BASE_VERSION } from '../data/evidence';
import { KNOWLEDGE_SCHEMA_VERSION } from '../data/evidence/types';
import { milestoneDoseCount, toDoseHistory } from '../lib/doseLedger';
import { formatDate, localiseNumber } from '../lib/format';
import { STORAGE_KEYS } from '../lib/storage';

const MAX_COMPARE = 3;

function isIdList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

interface DetailSectionProps {
  icon: typeof Info;
  titleKey: string;
  body: string;
  tone?: 'default' | 'caution' | 'danger';
}

function DetailSection({ icon: Icon, titleKey, body, tone = 'default' }: DetailSectionProps) {
  const { t, language } = useI18n();
  if (!body) return null;

  const tones = {
    default: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    caution: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  } as const;

  return (
    <section className="card-padded">
      <h2
        className={`flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-white ${
          language === 'bn' ? 'font-bangla' : ''
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        {t(titleKey)}
      </h2>
      <p
        className={`mt-3 leading-relaxed whitespace-pre-line text-neutral-700 dark:text-neutral-200 ${
          language === 'bn' ? 'font-bangla' : ''
        }`}
      >
        {body}
      </p>
    </section>
  );
}

/**
 * `/vaccines/:vaccineId` — one vaccine, in full.
 *
 * Everything on this page is quoted from the bundled dataset and every factual
 * block carries its source, because the whole point of a health reference is
 * that the reader can check it.
 */
export default function VaccineDetailPage() {
  const { vaccineId } = useParams<{ vaccineId: string }>();
  const { t, language } = useI18n();
  const { profiles } = useProfiles();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [selectedIds, setSelectedIds] = usePersistentState<string[]>(
    STORAGE_KEYS.compare,
    [],
    isIdList,
  );
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const vaccine = useMemo(() => allVaccines.find((entry) => entry.id === vaccineId), [vaccineId]);
  const clinical = useMemo(() => (vaccine ? getVaccineClinicalProfile(vaccine) : null), [vaccine]);
  const evidence = useMemo(() => (vaccine ? evidenceForLegacy(vaccine.id) : null), [vaccine]);
  const familyStatuses = useMemo(() => {
    if (!vaccine || profiles.length === 0) return [];
    const expected = milestoneDoseCount(vaccine.id);
    return profiles.map((member) => {
      const history = toDoseHistory(member);
      const administeredCount = history[vaccine.id]?.administered.length ?? 0;
      const satisfiedCount = history[vaccine.id]?.satisfiedDoseNumbers.length ?? 0;
      const done = expected > 0 && satisfiedCount >= expected;
      return {
        member,
        administeredCount,
        expected,
        done,
      };
    });
  }, [profiles, vaccine]);

  if (!vaccine) {
    return (
      <div className="page-shell text-center">
        <h1 className={`section-title ${isBangla ? 'font-bangla' : ''}`}>
          {t('vaccines.notFound.title')}
        </h1>
        <p className={`section-subtitle mx-auto ${isBangla ? 'font-bangla' : ''}`}>
          {t('vaccines.notFound.body', vaccineId ?? '')}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/vaccines" className="btn-primary">
            {t('vaccines.title')}
          </Link>
          <Link to="/" className="btn-ghost">
            {t('notFound.home')}
          </Link>
        </div>
      </div>
    );
  }

  const colour = vaccineColors[vaccine.color] ?? vaccineColors.emerald;
  const inComparison = selectedIds.includes(vaccine.id);

  const toggleCompare = () => {
    if (inComparison) {
      setSelectedIds(selectedIds.filter((id) => id !== vaccine.id));
      return;
    }
    if (selectedIds.length >= MAX_COMPARE) {
      toast.warning(t('compare.limit', MAX_COMPARE));
      return;
    }
    setSelectedIds([...selectedIds, vaccine.id]);
    toast.success(t('vaccines.detail.compare'), vaccine.name[language]);
  };

  return (
    <div className="page-shell max-w-5xl">
      <Link to="/vaccines" className="btn-ghost btn-sm mb-4 no-print">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {t('common.actions.back')}
      </Link>

      {/* --- Header -------------------------------------------------------- */}
      <header className={`card overflow-hidden print-area ${colour.bg}`}>
        <div className="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="text-4xl sm:text-5xl" aria-hidden="true">
              {vaccine.icon}
            </span>
            <div className="min-w-0">
              <h1
                className={`text-2xl font-extrabold sm:text-3xl ${colour.text} ${isBangla ? 'font-bangla' : ''}`}
              >
                {vaccine.name[language]}
              </h1>
              <p
                className={`mt-1 text-sm ${colour.text} opacity-90 ${isBangla ? 'font-bangla' : ''}`}
              >
                {vaccine.fullName[language]}
              </p>
              <p
                className={`mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium ${colour.text} opacity-95 tabular-nums`}
              >
                <span>
                  {evidence
                    ? t(`vaccines.programme.${evidence.programme}`)
                    : t(`vaccines.category.${vaccine.category}`)}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {evidence && !evidence.publishable
                    ? t('vaccines.researchOnlyDoses')
                    : t('vaccines.doses', vaccine.doses)}
                </span>
                {vaccine.efficacy && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {t('vaccines.efficacy')}: {vaccine.efficacy}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* --- Provenance banners -------------------------------------------- */}
      {evidence && !evidence.publishable && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
        >
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-300"
            aria-hidden="true"
          />
          <p
            className={`text-sm font-medium text-red-900 dark:text-red-100 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('vaccines.evidence.researchBanner')}
          </p>
        </div>
      )}
      {evidence && evidence.publishable && evidence.reviewStatus !== 'evidence-verified' && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900 dark:bg-sky-950/40"
        >
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-sky-700 dark:text-sky-300"
            aria-hidden="true"
          />
          <p className={`text-sm text-sky-900 dark:text-sky-100 ${isBangla ? 'font-bangla' : ''}`}>
            {t('vaccines.evidence.reviewBanner')}
          </p>
        </div>
      )}

      {/* --- Quick facts --------------------------------------------------- */}
      <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: ShieldAlert,
            label: t('vaccines.detail.disease'),
            value: vaccine.disease[language],
          },
          {
            icon: Calendar,
            label: t('vaccines.detail.schedule'),
            value: vaccine.schedule[language],
          },
          { icon: Info, label: t('vaccines.detail.ageGroup'), value: vaccine.ageGroup },
          { icon: Check, label: t('vaccines.detail.introduced'), value: vaccine.introduced },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="card-padded">
            <dt
              className={`flex items-center gap-2 text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {label}
            </dt>
            <dd
              className={`mt-2 text-sm font-medium text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
            >
              {value || '—'}
            </dd>
          </div>
        ))}
      </dl>

      {/* --- Actions ------------------------------------------------------- */}
      <div className="mt-5 flex flex-wrap gap-3 no-print">
        <button type="button" className="btn-secondary" onClick={toggleCompare}>
          {inComparison ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Scale className="h-4 w-4" aria-hidden="true" />
          )}
          <span className={isBangla ? 'font-bangla' : undefined}>
            {inComparison ? t('vaccines.detail.compared') : t('vaccines.detail.compare')}
          </span>
        </button>
        {selectedIds.length > 0 && (
          <Link to="/compare" className="btn-ghost">
            {t('nav.compare')} ({selectedIds.length})
          </Link>
        )}
        {(!evidence || evidence.publishable) && (
          <Link
            to={`/tracker?vaccine=${encodeURIComponent(vaccine.id)}&action=record`}
            className="btn-ghost"
          >
            <Syringe className="h-4 w-4" aria-hidden="true" />
            {t('vaccines.detail.recordDose')}
          </Link>
        )}
        {vaccine.sourceUrl && (
          <a
            className="btn-ghost"
            href={vaccine.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t('vaccines.detail.viewSource')}
          </a>
        )}
      </div>

      {familyStatuses.length > 0 && (
        <section className="card-padded mt-5 no-print" aria-label={t('vaccines.detail.familyStatus')}>
          <h2
            className={`flex items-center gap-2 text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            {t('vaccines.detail.familyStatus')}
          </h2>
          <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {familyStatuses.map(({ member, administeredCount, expected, done }) => {
              const statusLabel =
                administeredCount === 0
                  ? t('vaccines.detail.notRecordedYet')
                  : expected > 0
                    ? t(
                        'vaccines.detail.dosesGivenOf',
                        localiseNumber(administeredCount, language),
                        localiseNumber(expected, language),
                      )
                    : t(
                        'vaccines.detail.dosesGivenSingle',
                        localiseNumber(administeredCount, language),
                      );
              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/80 px-3.5 py-2.5 dark:border-neutral-700 dark:bg-neutral-800/60"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                      {member.name}
                    </p>
                    <p
                      className={`text-xs ${
                        done
                          ? 'font-medium text-emerald-700 dark:text-emerald-300'
                          : 'text-neutral-500 dark:text-neutral-400'
                      } ${isBangla ? 'font-bangla' : ''}`}
                    >
                      {statusLabel}
                    </p>
                  </div>
                  {(!evidence || evidence.publishable) && (
                    <Link
                      to={`/tracker?member=${encodeURIComponent(member.id)}&vaccine=${encodeURIComponent(vaccine.id)}&action=record`}
                      className="btn-secondary btn-sm shrink-0"
                    >
                      <Syringe className="h-3.5 w-3.5" aria-hidden="true" />
                      {t('vaccines.detail.recordDose')}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* --- Body ---------------------------------------------------------- */}
      {clinical && (
        <section
          className="card-padded mt-5"
          aria-labelledby="clinical-specs-title"
        >
          <h2
            id="clinical-specs-title"
            className={`flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
              aria-hidden="true"
            >
              <FlaskConical className="h-4 w-4" />
            </span>
            {t('vaccines.detail.clinicalSpecs')}
          </h2>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: FlaskConical,
                label: t('vaccines.detail.platform'),
                value: clinical.platform[language],
              },
              {
                icon: Syringe,
                label: t('vaccines.detail.route'),
                value: clinical.route[language],
              },
              {
                icon: Clock,
                label: t('vaccines.detail.doseVolume'),
                value: clinical.doseVolume[language],
              },
              {
                icon: Snowflake,
                label: t('vaccines.detail.coldChain'),
                value: clinical.coldChain[language],
              },
              {
                icon: ShieldCheck,
                label: t('vaccines.detail.immunityProfile'),
                value: clinical.immunityProfile[language],
              },
              {
                icon: Info,
                label: t('vaccines.detail.formulations'),
                value: clinical.formulations,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 dark:border-neutral-800 dark:bg-neutral-800/50"
              >
                <dt
                  className={`flex items-center gap-1.5 text-xs font-semibold text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {label}
                </dt>
                <dd
                  className={`mt-1.5 text-sm leading-relaxed text-neutral-900 tabular-nums dark:text-neutral-100 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-5 grid gap-5">
        <DetailSection
          icon={Info}
          titleKey="vaccines.detail.description"
          body={vaccine.description[language]}
        />
        {clinical && (
          <DetailSection
            icon={Calendar}
            titleKey="vaccines.detail.dosingProtocol"
            body={clinical.dosingProtocol[language]}
          />
        )}
        <DetailSection
          icon={ShieldAlert}
          titleKey="vaccines.detail.diseaseRisk"
          body={vaccine.diseaseRisk[language]}
        />
        {clinical && (
          <DetailSection
            icon={HeartPulse}
            titleKey="vaccines.detail.specialPopulations"
            body={clinical.specialPopulations[language]}
            tone="caution"
          />
        )}
        <DetailSection
          icon={ThermometerSun}
          titleKey="vaccines.detail.commonEffects"
          body={vaccine.commonEffects[language]}
          tone="caution"
        />
        <DetailSection
          icon={AlertTriangle}
          titleKey="vaccines.detail.seriousEffects"
          body={vaccine.seriousEffects[language]}
          tone="danger"
        />
        <DetailSection
          icon={UserX}
          titleKey="vaccines.detail.contraindications"
          body={vaccine.contraindications[language]}
          tone="danger"
        />
        {clinical && (
          <DetailSection
            icon={ClipboardCheck}
            titleKey="vaccines.detail.aftercare"
            body={clinical.aftercare[language]}
          />
        )}
      </div>

      {/* --- Source -------------------------------------------------------- */}
      <section className="card-padded mt-5">
        <h2
          className={`text-base font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
        >
          {t('vaccines.detail.source')}
        </h2>
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{vaccine.source}</p>
        {vaccine.sourceUrl && (
          <a
            className="link mt-1 inline-flex items-center gap-1.5 text-sm break-all"
            href={vaccine.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {vaccine.sourceUrl}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </a>
        )}
      </section>

      {/* --- Evidence and provenance --------------------------------------- */}
      {evidence && (
        <section className="card-padded mt-5" aria-labelledby="evidence-title">
          <h2
            id="evidence-title"
            className={`text-base font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('vaccines.evidence.title')}
          </h2>
          <p
            className={`mt-1 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('vaccines.evidence.subtitle')}
          </p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              {
                label: t('vaccines.evidence.programme'),
                value: t(`vaccines.programme.${evidence.programme}`),
              },
              {
                label: t('vaccines.evidence.productStatus'),
                value: t(`vaccines.productStatus.${evidence.productStatus}`),
              },
              {
                label: t('vaccines.evidence.reviewStatus'),
                value: t(`vaccines.review.${evidence.reviewStatus}`),
              },
              {
                label: t('vaccines.evidence.effectiveFrom'),
                value: evidence.record?.dates.effectiveFrom
                  ? formatDate(evidence.record.dates.effectiveFrom, language)
                  : t('vaccines.evidence.notEstablished'),
              },
              {
                label: t('vaccines.evidence.lastReviewed'),
                value: evidence.record?.dates.lastReviewed
                  ? formatDate(evidence.record.dates.lastReviewed, language)
                  : t('vaccines.evidence.notEstablished'),
              },
              {
                label: t(
                  'vaccines.evidence.knowledgeBase',
                  KNOWLEDGE_BASE_VERSION,
                  KNOWLEDGE_SCHEMA_VERSION,
                ),
                value: evidence.record?.id ?? evidence.legacyId,
              },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-neutral-100 p-3 dark:bg-neutral-800/60">
                <dt
                  className={`text-xs font-medium text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {label}
                </dt>
                <dd
                  className={`mt-1 text-sm font-medium text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {evidence.programme !== 'bd-nip-routine' && (
            <p
              className={`mt-3 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('vaccines.evidence.notInProgramme')}
            </p>
          )}

          <h3
            className={`mt-5 text-sm font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('vaccines.evidence.sources')}
          </h3>
          {evidence.sources.length === 0 ? (
            <p
              className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('vaccines.evidence.noDocumentSource')}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {evidence.sources.map((source) => (
                <li
                  key={source.id}
                  className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <p
                    className={`text-sm font-medium text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
                  >
                    {source.title}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {source.publisher}
                    {source.publicationDate
                      ? ` · ${t('vaccines.evidence.published')} ${formatDate(source.publicationDate, language)}`
                      : ''}
                    {` · ${t('vaccines.evidence.accessed')} ${formatDate(source.accessedDate, language)}`}
                  </p>
                  {source.url && (
                    <a
                      className="link mt-1 inline-flex items-center gap-1.5 text-xs break-all"
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {source.url}
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}

          {evidence.conflicts.length > 0 && (
            <div className="mt-5">
              <h3
                className={`text-sm font-semibold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('vaccines.evidence.conflicts')}
              </h3>
              {evidence.conflicts.some((c) => c.status === 'unresolved') && (
                <p
                  className={`mt-1 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('vaccines.evidence.conflictStatus')}
                </p>
              )}
              <ul className="mt-2 space-y-3">
                {evidence.conflicts.map((conflict) => {
                  const resolved = conflict.status !== 'unresolved';
                  return (
                    <li
                      key={conflict.id}
                      className={`rounded-xl border p-3 ${
                        resolved
                          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
                          : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            resolved
                              ? 'text-emerald-900 dark:text-emerald-100'
                              : 'text-amber-900 dark:text-amber-100'
                          } ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {conflict.id} — {conflict.title[language]}
                        </p>
                        <span
                          className={`text-xs font-semibold ${
                            resolved
                              ? 'text-emerald-800 dark:text-emerald-300'
                              : 'text-amber-800 dark:text-amber-300'
                          } ${isBangla ? 'font-bangla' : ''}`}
                        >
                          {resolved
                            ? t('vaccines.evidence.conflictResolved')
                            : t('vaccines.evidence.conflictUnresolved')}
                        </span>
                      </div>
                      {resolved && conflict.resolution ? (
                        <p
                          className={`mt-1 text-xs text-emerald-900/85 dark:text-emerald-200/85 ${isBangla ? 'font-bangla' : ''}`}
                        >
                          <span className="font-semibold">
                            {t('vaccines.evidence.resolutionDecision')}:
                          </span>{' '}
                          {conflict.resolution.decision}
                        </p>
                      ) : (
                        <p
                          className={`mt-1 text-xs text-amber-900/80 dark:text-amber-200/80 ${isBangla ? 'font-bangla' : ''}`}
                        >
                          <span className="font-semibold">
                            {t('vaccines.evidence.requiredAction')}:
                          </span>{' '}
                          {conflict.requiredAction}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}

      {showDisclaimer && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 no-print dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300"
            aria-hidden="true"
          />
          <div className="flex-1">
            <p
              className={`text-sm text-amber-900 dark:text-amber-100 ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('vaccines.detail.medicalDisclaimer')}
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
              onClick={() => setShowDisclaimer(false)}
            >
              {t('common.a11y.closeMenu')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
