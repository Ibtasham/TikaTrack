import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Palette, Sparkles } from 'lucide-react';

import { useProfiles } from '../../contexts/ProfilesContext';
import { useToast } from '../../contexts/ToastContext';
import { useI18n } from '../../i18n';
import { formatAge, formatDate, localiseNumber } from '../../lib/format';
import {
  calculateVaccinationStats,
  getNextUpcomingVaccination,
  milestoneDoseName,
} from '../../lib/smartScheduler';

type CardTheme = 'clinical' | 'campaign' | 'dark';

export function PosterStudio() {
  const { t, language } = useI18n();
  const toast = useToast();
  const { profiles } = useProfiles();
  const isBangla = language === 'bn';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.id ?? '');
  const [cardTheme, setCardTheme] = useState<CardTheme>('clinical');
  const [customHeadline, setCustomHeadline] = useState(
    isBangla
      ? 'সময়ে টিকা, সুরক্ষিত শৈশব'
      : 'Every Dose on Time, Every Child Protected',
  );
  const [aiTip, setAiTip] = useState(
    isBangla
      ? 'বাংলাদেশ ইপিআই সূচি অনুযায়ী জন্ম থেকে ১৫ মাস পর্যন্ত টিকা নিন এবং ডিজিটাল কার্ড সংরক্ষণ করুন।'
      : 'Follow the official Bangladesh EPI schedule from birth to 15 months and verify cold-chain VVM status at every clinic visit.',
  );
  const [generatingTip, setGeneratingTip] = useState(false);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId) ?? profiles[0] ?? null;

  const drawPoster = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const palette =
      cardTheme === 'dark'
        ? {
            bg: '#081b16',
            panel: '#0f2c24',
            ink: '#f8fafc',
            muted: '#94a3b8',
            accent: '#10b981',
            border: '#1e4d3f',
          }
        : cardTheme === 'campaign'
          ? {
              bg: '#ecfdf5',
              panel: '#ffffff',
              ink: '#064e3b',
              muted: '#047857',
              accent: '#059669',
              border: '#a7f3d0',
            }
          : {
              bg: '#f8fafc',
              panel: '#ffffff',
              ink: '#0f172a',
              muted: '#475569',
              accent: '#059669',
              border: '#cbd5e1',
            };

    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, w, h);

    // Top accent bar
    ctx.fillStyle = palette.accent;
    ctx.fillRect(0, 0, w, 18);

    // Header brand strip
    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('TIKATRACK · BANGLADESH EPI STUDIO', 56, 78);

    // Headline
    ctx.fillStyle = palette.ink;
    ctx.font = 'bold 46px system-ui, sans-serif';
    wrapText(ctx, customHeadline, 56, 144, w - 112, 56);

    // Main Card Surface
    ctx.fillStyle = palette.panel;
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 3;
    roundRect(ctx, 56, 250, w - 112, 410, 22);
    ctx.fill();
    ctx.stroke();

    if (selectedProfile) {
      const stats = calculateVaccinationStats(selectedProfile.dateOfBirth, selectedProfile);
      const nextDose = getNextUpcomingVaccination(selectedProfile.dateOfBirth, selectedProfile);

      ctx.fillStyle = palette.muted;
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillText(
        isBangla ? 'সদস্যের টিকাদান সারসংক্ষেপ' : 'FAMILY IMMUNIZATION MILESTONE CARD',
        92,
        304,
      );

      ctx.fillStyle = palette.ink;
      ctx.font = 'bold 42px system-ui, sans-serif';
      ctx.fillText(selectedProfile.name, 92, 362);

      ctx.fillStyle = palette.muted;
      ctx.font = '500 24px system-ui, sans-serif';
      ctx.fillText(formatAge(selectedProfile.dateOfBirth, language), 92, 404);

      // Metric row
      ctx.fillStyle = palette.accent;
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillText(`${localiseNumber(stats.progressPercentage, language)}%`, 92, 504);

      ctx.fillStyle = palette.muted;
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillText(
        `${localiseNumber(stats.completed, language)} / ${localiseNumber(stats.totalScheduled, language)} ${
          isBangla ? 'ডোজ সম্পন্ন' : 'doses completed'
        }`,
        92,
        544,
      );

      // Progress track
      ctx.fillStyle = palette.border;
      roundRect(ctx, 92, 574, w - 184, 18, 9);
      ctx.fill();

      ctx.fillStyle = palette.accent;
      const fillWidth = Math.max(18, ((w - 184) * stats.progressPercentage) / 100);
      roundRect(ctx, 92, 574, fillWidth, 18, 9);
      ctx.fill();

      ctx.fillStyle = palette.ink;
      ctx.font = '600 22px system-ui, sans-serif';
      ctx.fillText(
        nextDose
          ? `${isBangla ? 'পরবর্তী ডোজ:' : 'Next scheduled:'} ${milestoneDoseName(nextDose, language)} (${formatDate(nextDose.scheduledDate, language)})`
          : isBangla
            ? 'সব নির্ধারিত ডোজ সম্পন্ন হয়েছে'
            : 'All scheduled milestones recorded',
        92,
        632,
      );
    } else {
      ctx.fillStyle = palette.ink;
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText(
        isBangla ? 'ইপিআই সুরক্ষা সময়সূচি' : 'ESSENTIAL EPI PROTECTION MILESTONES',
        92,
        320,
      );

      const milestones = isBangla
        ? [
            'জন্মের পর: BCG · OPV-0',
            '৬, ১০ ও ১৪ সপ্তাহ: পেন্টাভ্যালেন্ট · PCV · OPV · fIPV',
            '৯ মাস ও ১৫ মাস: হাম-রুবেলা (MR)',
          ]
        : [
            'At Birth: BCG · OPV-0',
            '6, 10 & 14 Weeks: Pentavalent · PCV-10 · OPV · fIPV',
            '9 & 15 Months: Measles-Rubella (MR)',
          ];

      ctx.fillStyle = palette.muted;
      ctx.font = '500 26px system-ui, sans-serif';
      milestones.forEach((line, idx) => {
        ctx.fillText(`• ${line}`, 92, 392 + idx * 62);
      });
    }

    // Clinical guidance footer
    ctx.fillStyle = palette.muted;
    ctx.font = '500 22px system-ui, sans-serif';
    wrapText(ctx, aiTip, 56, 718, w - 112, 32);

    ctx.fillStyle = palette.accent;
    ctx.font = 'bold 20px ui-monospace, monospace';
    ctx.fillText('WHO PQS COLD CHAIN +2°C TO +8°C  ·  HEALTH HOTLINE 16263', 56, h - 42);
  }, [aiTip, cardTheme, customHeadline, isBangla, language, selectedProfile]);

  useEffect(() => {
    drawPoster();
  }, [drawPoster]);

  const handleAiRefresh = async () => {
    setGeneratingTip(true);
    try {
      const prompt = isBangla
        ? 'বাংলাদেশের শিশু টিকাদান সচেতনতা পোস্টারের জন্য এক বাক্যে একটি সংক্ষিপ্ত উৎসাহজনক স্বাস্থ্য পরামর্শ লিখুন।'
        : 'Write one crisp, reassuring 20-word immunization reminder tip for parents on a Bangladesh EPI clinic poster.';
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          language,
          mode: 'fast',
          useSearchGrounding: false,
        }),
      });
      if (!res.ok) throw new Error('Could not generate tip');
      const data = (await res.json()) as { text?: string };
      if (data.text?.trim()) {
        setAiTip(data.text.trim().replace(/^["']|["']$/g, '').slice(0, 220));
        toast.success(t('tikabot.studio.tipUpdated'));
      }
    } catch {
      toast.error(t('common.status.error'));
    } finally {
      setGeneratingTip(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `tikatrack-card-${selectedProfile?.name || 'epi'}.png`;
    a.click();
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Controls */}
        <div className="space-y-4">
          {profiles.length > 0 && (
            <div>
              <label htmlFor="poster-profile" className="label">
                {t('tikabot.context.about')}
              </label>
              <select
                id="poster-profile"
                className="input-field"
                value={selectedProfile?.id ?? ''}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="poster-headline" className="label">
              {t('tikabot.studio.headline')}
            </label>
            <input
              id="poster-headline"
              className="input-field"
              value={customHeadline}
              onChange={(e) => setCustomHeadline(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="poster-tip" className="label">
              {t('tikabot.studio.note')}
            </label>
            <textarea
              id="poster-tip"
              rows={3}
              className="input-field"
              value={aiTip}
              onChange={(e) => setAiTip(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void handleAiRefresh()}
              disabled={generatingTip}
              className="btn-secondary btn-sm mt-2"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {generatingTip ? t('common.status.loading') : t('tikabot.studio.aiTip')}
              </span>
            </button>
          </div>

          <div>
            <p className="label flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" aria-hidden="true" />
              {t('tikabot.studio.theme')}
            </p>
            <div className="flex flex-wrap gap-2">
              {(['clinical', 'campaign', 'dark'] as const).map((themeId) => (
                <button
                  key={themeId}
                  type="button"
                  onClick={() => setCardTheme(themeId)}
                  className={`btn btn-sm ${cardTheme === themeId ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {t(`tikabot.studio.theme.${themeId}`)}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleDownload} className="btn-primary w-full">
            <Download className="h-4 w-4" aria-hidden="true" />
            <span className={isBangla ? 'font-bangla' : undefined}>
              {t('tikabot.studio.download')}
            </span>
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 p-3 dark:border-neutral-800 dark:bg-neutral-950">
          <canvas
            ref={canvasRef}
            width={1200}
            height={880}
            className="h-auto w-full rounded-lg shadow-sm"
            aria-label={t('tikabot.studio.title')}
          />
        </div>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let currY = y;
  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currY);
      line = `${words[i]} `;
      currY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currY);
}
