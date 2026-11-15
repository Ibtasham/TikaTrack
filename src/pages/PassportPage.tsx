import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Download,
  FileJson,
  IdCard,
  Image,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react';

import { QrScanner } from '../components/QrScanner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useProfiles } from '../contexts/ProfilesContext';
import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import type { Language } from '../i18n/types';
import type { Profile } from '../types';
import { allVaccines } from '../data/vaccines';
import {
  deletePassport,
  downloadTextAsFile,
  issuePassport,
  parsePassportPayload,
  loadPassports,
  passportSvgToPngBlob,
  passportToQR,
  upsertPassport,
  verifyPassportPayload,
  type PassportVerification,
  type StoredPassport,
} from '../lib/digitalPassport';
import { formatDate } from '../lib/format';
import { printElement } from '../lib/exporters';
import { appUrl, safeFilename, share, shareOutcomeKey, shareableFile } from '../lib/share';

/**
 * `/passport` — on-device vaccination certificate.
 *
 * Two halves: issue (pick a member, generate a signed QR) and verify (paste a
 * payload, check its checksum). Both run entirely locally.
 *
 * The wording here matters more than the code. A QR code that looks official
 * will be mistaken for one, so the page states plainly that this is a personal
 * record and not a government certificate — and the verify half says "this does
 * not match *this device's* key" rather than accusing anyone of forgery.
 */
export default function PassportPage() {
  const { t, language } = useI18n();
  const { profiles } = useProfiles();
  const toast = useToast();
  const isBangla = language === 'bn';

  const [stored, setStored] = useState<StoredPassport[]>(() => loadPassports());
  const [profileId, setProfileId] = useState<string>(profiles[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verification, setVerification] = useState<PassportVerification | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StoredPassport | null>(null);
  const [printRef, setPrintRef] = useState<HTMLDivElement | null>(null);

  const vaccineNameById = useMemo(
    () => new Map(allVaccines.map((vaccine) => [vaccine.id, vaccine.name])),
    [],
  );

  const active = useMemo(() => {
    if (!profileId) return stored[0] ?? null;
    return stored.find((entry) => entry.profileId === profileId) ?? null;
  }, [profileId, stored]);

  const rendered = useMemo(() => {
    if (!active) return null;
    try {
      return passportToQR(active.payload, { pixelSize: 4, title: active.memberName });
    } catch {
      return null;
    }
  }, [active]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === profileId),
    [profileId, profiles],
  );

  const activeStale = useMemo(
    () => isPassportStale(active, selectedProfile),
    [active, selectedProfile],
  );

  useEffect(() => {
    if (profiles.length === 0) return;
    if (!profileId || !profiles.some((profile) => profile.id === profileId)) {
      setProfileId(profiles[0].id);
    }
  }, [profileId, profiles]);

  const handleGenerate = useCallback(async () => {
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      toast.error(t('passport.empty.title'), t('passport.empty.body'));
      return;
    }

    setBusy(true);
    try {
      const result = await issuePassport({ profile });
      if (!result.passport) {
        toast.error(t('passport.generateFailed'), t('passport.error.tooLarge'));
        return;
      }

      const { svg } = passportToQR(result.passport.payload, {
        pixelSize: 4,
        title: result.passport.memberName,
      });

      const entry: StoredPassport = {
        id: result.passport.id,
        profileId: profile.id,
        memberName: result.passport.memberName,
        dateOfBirth: result.passport.dateOfBirth,
        issuedAt: result.passport.issuedAt,
        payload: result.passport.payload,
        algorithm: result.passport.algorithm,
        svg,
        // Carried so the certificate can keep saying what it left out.
        omittedDoses: result.omittedDoses,
        totalDoses: result.totalDoses,
      };
      setStored(upsertPassport(entry));
      setProfileId(profile.id);

      if (result.warnings.includes('weak-algorithm')) toast.success(t('passport.savedWeak'));
      else toast.success(t('passport.saved', result.passport.memberName));

      // A QR symbol cannot hold a full national series. Say so at the moment the
      // certificate is made, not only on the page.
      if (result.omittedDoses > 0) {
        toast.info(
          t('passport.truncated.title'),
          t('passport.truncated.body', result.omittedDoses, result.totalDoses),
        );
      }
    } finally {
      setBusy(false);
    }
  }, [profileId, profiles, t, toast]);

  const handleVerify = async () => {
    const payload = verifyInput.trim();
    if (!payload) {
      setVerification({ status: 'invalid', reason: 'empty' });
      return;
    }
    setVerification(await verifyPassportPayload(payload));
  };

  /**
   * A payload read off a QR code is verified immediately — the user scanned it,
   * so they are not going to press "Verify" as well. It also lands in the box,
   * so what was checked stays visible and can be copied.
   */
  const handleScannedPayload = async (payload: string) => {
    setVerifyInput(payload);
    setVerification(await verifyPassportPayload(payload));
  };

  /**
   * Share the certificate through the platform's own sheet.
   *
   * A PNG attachment is offered where the OS allows it (Android, iOS); anywhere
   * else the payload is copied as text, which still verifies on the other
   * device. Either way the image never goes through a server.
   */
  const handleShare = async () => {
    if (!active) return;

    const title = `${t('passport.certificate')} — ${active.memberName}`;
    // `svg` is optional: a passport restored from a backup may carry only the
    // signed payload. Then the payload is what gets shared, and it still
    // verifies on the other device.
    const blob = active.svg ? await passportSvgToPngBlob(active.svg, 3) : null;
    const file = blob
      ? shareableFile(blob, `tikatrack-passport-${safeFilename(active.memberName)}.png`)
      : null;

    const outcome = await share({
      title,
      text: file ? title : `${title}\n\n${active.payload}`,
      url: appUrl('/passport'),
      files: file ? [file] : undefined,
    });

    const key = shareOutcomeKey(outcome);
    if (key === 'common.share.unavailable') toast.error(t(key));
    else if (key) toast.info(t(key));
  };

  const handleDownloadSVG = () => {
    if (!active?.svg) return;
    downloadTextAsFile(
      `tikatrack-passport-${active.memberName.replace(/\s+/g, '-')}.svg`,
      active.svg,
      'image/svg+xml',
    );
    toast.success(t('passport.download.svg'));
  };

  const handleDownloadPNG = async () => {
    if (!active?.svg) return;
    const blob = await passportSvgToPngBlob(active.svg, 3);
    if (!blob) {
      toast.error(t('common.status.error'));
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tikatrack-passport-${active.memberName.replace(/\s+/g, '-')}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast.success(t('passport.download.png'));
  };

  const handleDownloadJSON = () => {
    if (!active) return;
    downloadTextAsFile(
      `tikatrack-passport-${active.memberName.replace(/\s+/g, '-')}.json`,
      JSON.stringify({ ...active, exportedAt: new Date().toISOString() }, null, 2),
      'application/json',
    );
    toast.success(t('passport.download.json'));
  };

  const handlePrint = () => {
    if (!printRef) return;
    if (!printElement(printRef, t('passport.certificate'))) toast.error(t('common.status.error'));
  };

  return (
    <div className="page-shell max-w-5xl">
      <header className="no-print">
        <p className="flex items-center gap-2 text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
          <IdCard className="h-4 w-4" aria-hidden="true" />
          {t('nav.passport')}
        </p>
        <h1 className={`section-title mt-2 ${isBangla ? 'font-bangla' : ''}`}>
          {t('passport.title')}
        </h1>
        <p className={`section-subtitle ${isBangla ? 'font-bangla' : ''}`}>
          {t('passport.subtitle')}
        </p>
      </header>

      {profiles.length === 0 ? (
        <div className="card-padded mt-8 text-center">
          <QrCode
            className="mx-auto h-10 w-10 text-neutral-300 dark:text-neutral-600"
            aria-hidden="true"
          />
          <h2
            className={`mt-4 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('passport.empty.title')}
          </h2>
          <p
            className={`mx-auto mt-2 max-w-md text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
          >
            {t('passport.empty.body')}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* --- Controls ------------------------------------------------ */}
          <div className="no-print">
            {profiles.length > 1 && (
              <div className="card-padded mb-5">
                <p
                  className={`text-xs font-semibold tracking-wide text-neutral-500 uppercase dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('passport.familyStatus')}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {profiles.map((member) => {
                    const memberPassport = stored.find((entry) => entry.profileId === member.id) ?? null;
                    const memberStale = isPassportStale(memberPassport, member);
                    const isSelected = member.id === profileId;
                    const statusText = !memberPassport
                      ? t('passport.status.missing')
                      : memberStale
                        ? t('passport.status.outdated')
                        : t('passport.status.issued');
                    const dotClass = !memberPassport
                      ? 'bg-neutral-300 dark:bg-neutral-600'
                      : memberStale
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setProfileId(member.id)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
                        <span className="font-semibold">{member.name}</span>
                        <span className="text-[11px] opacity-75">{statusText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="card-padded">
              <label className="label" htmlFor="passport-profile">
                {t('passport.profile')}
              </label>
              <select
                id="passport-profile"
                className="input-field"
                value={profileId}
                onChange={(event) => setProfileId(event.target.value)}
              >
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name} — {formatDate(profile.dateOfBirth, language)}
                  </option>
                ))}
              </select>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy || !selectedProfile}
                  onClick={() => void handleGenerate()}
                >
                  {active ? (
                    <RefreshCw
                      className={busy ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                      aria-hidden="true"
                    />
                  ) : (
                    <QrCode className="h-4 w-4" aria-hidden="true" />
                  )}
                  {busy
                    ? t('common.status.loading')
                    : active
                      ? t('passport.regenerate')
                      : t('passport.generate')}
                </button>
              </div>

              {selectedProfile && (selectedProfile.events?.length ?? 0) === 0 && (
                <p
                  className={`mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('passport.noDoses')}
                </p>
              )}
            </div>

            {/* --- What this is ------------------------------------------- */}
            <div className="card-padded mt-5">
              <h2
                className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                <ShieldAlert
                  className="h-5 w-5 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                {t('passport.whatIsThis')}
              </h2>
              <p
                className={`mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('passport.whatIsThis.body')}
              </p>
              <p
                className={`mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('passport.warning')}
              </p>
            </div>

            {/* --- Verify ------------------------------------------------- */}
            <div className="card-padded mt-5">
              <h2
                className={`flex items-center gap-2 font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}
              >
                <Search
                  className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                {t('passport.verify.title')}
              </h2>
              <p
                className={`mt-2 text-sm text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}
              >
                {t('passport.verify.help')}
              </p>
              <QrScanner
                className="mt-3"
                onPayload={(payload) => void handleScannedPayload(payload)}
              />

              <label className="sr-only" htmlFor="passport-verify">
                {t('passport.verify.placeholder')}
              </label>
              <textarea
                id="passport-verify"
                rows={3}
                className="input-field mt-3 font-mono text-xs"
                placeholder={t('passport.verify.placeholder')}
                value={verifyInput}
                onChange={(event) => {
                  setVerifyInput(event.target.value);
                  setVerification(null);
                }}
              />
              <button
                type="button"
                className="btn-secondary mt-3"
                onClick={() => void handleVerify()}
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {t('passport.verify.button')}
              </button>

              {verification && (
                <div className="mt-4" role="status" aria-live="polite">
                  {verification.status === 'valid' ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                      <p className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                        <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                        {t('passport.verify.valid')}
                      </p>
                      <dl
                        className={`mt-3 grid gap-2 text-sm text-emerald-900/90 dark:text-emerald-100/90 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        <div className="flex gap-2">
                          <dt className="font-semibold">{t('passport.member')}:</dt>
                          <dd>{verification.passport.memberName}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-semibold">{t('passport.dob')}:</dt>
                          <dd>{formatDate(verification.passport.dateOfBirth, language)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-semibold">{t('passport.doses')}:</dt>
                          <dd>{t('passport.verify.doses', verification.passport.doses.length)}</dd>
                        </div>
                      </dl>
                      {verification.warnings.includes('weak-algorithm') && (
                        <p
                          className={`mt-3 flex items-start gap-2 text-xs text-emerald-900/80 dark:text-emerald-100/80 ${isBangla ? 'font-bangla' : ''}`}
                        >
                          <TriangleAlert
                            className="mt-0.5 h-3.5 w-3.5 shrink-0"
                            aria-hidden="true"
                          />
                          {t('passport.weakAlgorithm')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                      <p className="flex items-center gap-2 font-bold text-red-900 dark:text-red-200">
                        <XCircle className="h-5 w-5" aria-hidden="true" />
                        {verification.status === 'tampered'
                          ? t('passport.verify.tampered')
                          : t('passport.verify.invalid')}
                      </p>
                      <p
                        className={`mt-2 text-sm text-red-900/85 dark:text-red-100/85 ${isBangla ? 'font-bangla' : ''}`}
                      >
                        {verification.status === 'invalid' && verification.reason === 'empty'
                          ? t('passport.verify.error.empty')
                          : t(`passport.verify.error.${verification.status}`)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* --- Certificate --------------------------------------------- */}
          <div>
            {!active || !rendered ? (
              <div className="card-padded flex h-full min-h-72 flex-col items-center justify-center text-center">
                <QrCode
                  className="h-12 w-12 text-neutral-300 dark:text-neutral-700"
                  aria-hidden="true"
                />
                <p
                  className={`mt-4 text-sm text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}
                >
                  {t('passport.empty.body')}
                </p>
              </div>
            ) : (
              <div className="card-padded">
                {activeStale && (
                  <div
                    role="status"
                    className="no-print mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40"
                  >
                    <div className="flex items-start gap-2.5">
                      <TriangleAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
                        aria-hidden="true"
                      />
                      <div className={isBangla ? 'font-bangla' : undefined}>
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          {t('passport.stale.title')}
                        </p>
                        <p className="mt-0.5 text-xs text-amber-900/85 dark:text-amber-200/85">
                          {t('passport.stale.body')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary btn-sm shrink-0"
                      disabled={busy || !selectedProfile}
                      onClick={() => void handleGenerate()}
                    >
                      <RefreshCw
                        className={busy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'}
                        aria-hidden="true"
                      />
                      {t('passport.regenerate')}
                    </button>
                  </div>
                )}
                <div ref={setPrintRef} className="print-area">
                  <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center dark:border-emerald-900 dark:bg-white">
                    <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
                      TikaTrack · {t('passport.certificate')}
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-neutral-900">{active.memberName}</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                      {t('passport.dob')}: {formatDate(active.dateOfBirth, language)}
                    </p>

                    <div
                      className="mx-auto mt-5 w-fit rounded-xl bg-white p-3"
                      // The SVG is generated locally from our own encoder and contains no script.
                      dangerouslySetInnerHTML={{ __html: rendered.svg }}
                    />

                    <p className="mt-4 text-xs text-neutral-500">
                      {t('passport.id')}: <span className="font-mono">{active.id}</span>
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {t('passport.issued')}: {formatDate(active.issuedAt, language)}
                    </p>
                    <p className="mt-3 text-[11px] text-neutral-400">
                      {t('passport.scanToVerify')}
                    </p>
                  </div>

                  {(active.omittedDoses ?? 0) > 0 && (
                    <p
                      className={`mt-5 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 ${isBangla ? 'font-bangla' : ''}`}
                    >
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t(
                        'passport.truncated.body',
                        active.omittedDoses ?? 0,
                        active.totalDoses ??
                          dosesInPayload(active.payload, vaccineNameById, language).length,
                      )}
                    </p>
                  )}

                  {dosesInPayload(active.payload, vaccineNameById, language).length > 0 && (
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {dosesInPayload(active.payload, vaccineNameById, language).map((dose) => (
                        <li
                          key={`${dose.vaccineId}-${dose.doseNumber ?? 'x'}-${dose.date}`}
                          className="flex items-start gap-2 rounded-lg bg-neutral-50 p-2.5 text-sm dark:bg-neutral-800"
                        >
                          <BadgeCheck
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                            aria-hidden="true"
                          />
                          <span className={isBangla ? 'font-bangla' : undefined}>
                            <strong>{dose.name}</strong>
                            {/* Which dose of the series this is — or an explicit
                                statement that the record never said. */}
                            <span className="ml-1 text-xs text-neutral-500 dark:text-neutral-400">
                              {dose.doseNumber === null
                                ? t('passport.dose.unnumbered')
                                : t('passport.dose.number', dose.doseNumber)}
                            </span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                              {formatDate(dose.date, language)}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2 no-print">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={handleDownloadSVG}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('passport.download.svg')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => void handleDownloadPNG()}
                  >
                    <Image className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('passport.download.png')}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={handleDownloadJSON}>
                    <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('passport.download.json')}
                  </button>
                  <button type="button" className="btn-ghost btn-sm" onClick={handlePrint}>
                    <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('passport.print')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => void handleShare()}
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('passport.share.button')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost btn-sm ml-auto text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                    onClick={() => setConfirmDelete(active)}
                  >
                    {t('common.actions.delete')}
                  </button>
                </div>
              </div>
            )}

            <p
              className={`mt-4 text-xs text-neutral-500 dark:text-neutral-400 no-print ${isBangla ? 'font-bangla' : ''}`}
            >
              {t('passport.privacy')}
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={t('confirm.delete.title')}
        description={t('confirm.deleteProfile.body')}
        confirmLabel={t('confirm.delete')}
        cancelLabel={t('confirm.keep')}
        tone="danger"
        onConfirm={() => {
          if (confirmDelete) setStored(deletePassport(confirmDelete.id));
          setConfirmDelete(null);
          toast.info(t('common.actions.delete'));
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

/**
 * Re-parse a stored payload purely for display, so the dose list under the QR
 * always matches what the code actually encodes — no second source of truth.
 *
 * Delegates to `parsePassportPayload`, which understands both the current v2
 * layout (with dose numbers) and the v1 layout certificates issued before the
 * dose ledger. Hand-splitting the payload here used to break the moment the
 * layout changed.
 */
function dosesInPayload(
  payload: string,
  names: Map<string, { en: string; bn: string }>,
  language: Language,
): Array<{ vaccineId: string; date: string; name: string; doseNumber: number | null }> {
  const parsed = parsePassportPayload(payload);
  if (!parsed) return [];
  return parsed.doses.map((dose) => {
    const localised = names.get(dose.vaccineId);
    return {
      vaccineId: dose.vaccineId,
      date: dose.date,
      doseNumber: dose.doseNumber,
      name: localised ? localised[language] : dose.vaccineId,
    };
  });
}

function isPassportStale(
  passport: StoredPassport | null,
  profile: Profile | undefined,
): boolean {
  if (!passport || !profile) return false;
  if (passport.memberName !== profile.name || passport.dateOfBirth !== profile.dateOfBirth) {
    return true;
  }
  const events = profile.events ?? [];
  const parsed = parsePassportPayload(passport.payload);
  const encodedTotal = passport.totalDoses ?? (parsed ? parsed.doses.length + (passport.omittedDoses ?? 0) : 0);
  if (events.length !== encodedTotal) return true;
  return events.some((event) => (event.updatedAt ?? event.createdAt) > passport.issuedAt);
}
