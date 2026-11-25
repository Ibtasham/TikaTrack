import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Calendar,
  ClipboardList,
  Compass,
  IdCard,
  MapPin,
  Search,
  Snowflake,
  Syringe,
  Users,
  X,
} from 'lucide-react';

import { lifespanSchedule } from '../data/lifespanSchedule';
import { allVaccinationCentres } from '../data/vaccinationCentres';
import { allVaccines } from '../data/vaccines';
import { useBodyScrollLock, useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';
import { OPEN_COMMAND_PALETTE_EVENT } from '../lib/commandPalette';

interface PaletteItem {
  id: string;
  group: 'tools' | 'vaccines' | 'centres' | 'stages';
  title: string;
  subtitle: string;
  to: string;
  icon: typeof Search;
  keywords: string;
}

const TOOL_ROUTES: ReadonlyArray<{
  to: string;
  labelKey: string;
  subtitleEn: string;
  subtitleBn: string;
  icon: typeof Search;
  keywords: string;
}> = [
  {
    to: '/readiness',
    labelKey: 'nav.readiness',
    subtitleEn: 'Hajj, study abroad, pregnancy, chronic & 65+ checklists',
    subtitleBn: 'হজ, বিদেশে পড়াশোনা, গর্ভাবস্থা ও প্রবীণ প্রস্তুতি তালিকা',
    icon: Compass,
    keywords: 'hajj umrah travel pregnancy visa yellow fever senior advisor readiness',
  },
  {
    to: '/schedule',
    labelKey: 'nav.schedule',
    subtitleEn: 'Birth to 65+ years EPI & lifespan timetable',
    subtitleBn: 'জন্ম থেকে ৬৫+ বছর পর্যন্ত সকল বয়সের টিকা সূচি',
    icon: Calendar,
    keywords: 'schedule timetable epi newborn infant adult senior 65+ catchup',
  },
  {
    to: '/vaccines',
    labelKey: 'nav.vaccines',
    subtitleEn: '90 vaccine monographs with route, dose & cold chain',
    subtitleBn: '৯০টি টিকার পূর্ণ ক্লিনিকাল তথ্য, ডোজ ও কোল্ড-চেইন',
    icon: Syringe,
    keywords: 'vaccines monographs bcg pentavalent pcv hpv shingles rsv flu',
  },
  {
    to: '/tracker',
    labelKey: 'nav.tracker',
    subtitleEn: 'Family dose ledger, due dates & WHO growth curves',
    subtitleBn: 'পরিবারের ডোজ রেকর্ড, প্রাপ্য তারিখ ও শিশু বৃদ্ধি চার্ট',
    icon: Users,
    keywords: 'family tracker record dose height weight growth child baby',
  },
  {
    to: '/centres',
    labelKey: 'nav.centres',
    subtitleEn: '175 verified government, hospital & NGO centres (64 districts)',
    subtitleBn: '৬৪ জেলায় ১৭৫টি যাচাইকৃত সরকারি, বেসরকারি ও এনজিও কেন্দ্র',
    icon: MapPin,
    keywords: 'centres clinics hospital dhaka chittagong sylhet civil surgeon map',
  },
  {
    to: '/tikabot',
    labelKey: 'nav.tikabot',
    subtitleEn: 'Source-cited immunization assistant & voice help',
    subtitleBn: 'নির্ভরযোগ্য সূত্রসহ টিকাবিষয়ক প্রশ্নোত্তর সহকারী',
    icon: Bot,
    keywords: 'tikabot ai assistant chat questions side effects missed dose',
  },
  {
    to: '/cold-chain',
    labelKey: 'nav.coldChain',
    subtitleEn: 'Interactive 3D WHO PQS carrier & VVM temperature lab',
    subtitleBn: 'ইন্টারঅ্যাক্টিভ ৩ডি ভ্যাকসিন ক্যারিয়ার ও VVM তাপমাত্রা পরীক্ষা',
    icon: Snowflake,
    keywords: '3d cold chain vvm carrier ice pack temperature simulation',
  },
  {
    to: '/passport',
    labelKey: 'nav.passport',
    subtitleEn: 'Signed offline QR immunization certificate card',
    subtitleBn: 'অফলাইনে যাচাইযোগ্য ডিজিটাল QR টিকা সনদ',
    icon: IdCard,
    keywords: 'passport qr certificate print card proof verify',
  },
  {
    to: '/compare',
    labelKey: 'nav.compare',
    subtitleEn: 'Side-by-side vaccine clinical comparison',
    subtitleBn: 'পাশাপাশি দুই বা ততোধিক টিকার তুলনামূলক বিশ্লেষণ',
    icon: ClipboardList,
    keywords: 'compare side by side efficacy platform doses difference',
  },
  {
    to: '/analytics',
    labelKey: 'nav.analytics',
    subtitleEn: 'Family coverage charts and overdue dose breakdown',
    subtitleBn: 'পরিবারের টিকাদান অগ্রগতি ও বিশ্লেষণ চার্ট',
    icon: BarChart3,
    keywords: 'analytics charts coverage progress stats report',
  },
  {
    to: '/reminders',
    labelKey: 'nav.reminders',
    subtitleEn: 'Upcoming dose alerts and calendar (.ics) export',
    subtitleBn: 'আসন্ন ডোজের সতর্কবার্তা ও ক্যালেন্ডার এক্সপোর্ট',
    icon: Bell,
    keywords: 'reminders alerts ics calendar notifications upcoming',
  },
];

export function CommandPalette() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  const isBangla = language === 'bn';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const trapRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: () => setOpen(false),
    autoFocus: false,
  });
  useBodyScrollLock(open);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onCustomOpen = () => setOpen(true);

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustomOpen);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onCustomOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const indexPool = useMemo<PaletteItem[]>(() => {
    const tools: PaletteItem[] = TOOL_ROUTES.map((route) => ({
      id: `tool-${route.to}`,
      group: 'tools',
      title: t(route.labelKey),
      subtitle: language === 'bn' ? route.subtitleBn : route.subtitleEn,
      to: route.to,
      icon: route.icon,
      keywords: `${route.keywords} ${t(route.labelKey)}`.toLowerCase(),
    }));

    const vaccines: PaletteItem[] = allVaccines.map((vaccine) => ({
      id: `vac-${vaccine.id}`,
      group: 'vaccines',
      title: `${vaccine.name[language]} — ${vaccine.fullName[language]}`,
      subtitle: `${vaccine.disease[language]} · ${vaccine.schedule[language]}`,
      to: `/vaccines/${vaccine.id}`,
      icon: Syringe,
      keywords: [
        vaccine.id,
        vaccine.name.en,
        vaccine.name.bn,
        vaccine.fullName.en,
        vaccine.fullName.bn,
        vaccine.disease.en,
        vaccine.disease.bn,
      ]
        .join(' ')
        .toLowerCase(),
    }));

    const centres: PaletteItem[] = allVaccinationCentres.map((centre) => ({
      id: `ctr-${centre.id}`,
      group: 'centres',
      title: centre.name[language],
      subtitle: `${centre.district}, ${centre.division} · ${centre.hotline || centre.phone[0] || ''}`,
      to: `/centres?q=${encodeURIComponent(centre.name.en)}`,
      icon: MapPin,
      keywords: [
        centre.id,
        centre.name.en,
        centre.name.bn,
        centre.district,
        centre.division,
        centre.address.en,
        centre.type,
      ]
        .join(' ')
        .toLowerCase(),
    }));

    const stages: PaletteItem[] = lifespanSchedule.map((milestone) => ({
      id: `stg-${milestone.id}`,
      group: 'stages',
      title: `${milestone.age[language]} — ${milestone.stageLabel[language]}`,
      subtitle: milestone.vaccines.map((v) => v.doseLabel[language]).join(', '),
      to: `/schedule?stage=${encodeURIComponent(milestone.id)}`,
      icon: Calendar,
      keywords: [
        milestone.id,
        milestone.age.en,
        milestone.age.bn,
        milestone.stageLabel.en,
        milestone.stageLabel.bn,
        milestone.summary.en,
        ...milestone.vaccines.map((v) => `${v.id} ${v.doseLabel.en} ${v.doseLabel.bn}`),
      ]
        .join(' ')
        .toLowerCase(),
    }));

    return [...tools, ...vaccines, ...centres, ...stages];
  }, [language, t]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Curated instant launchpad: top interactive modules & popular milestones
      return indexPool.filter((item) => item.group === 'tools').slice(0, 8);
    }

    const terms = trimmed.split(/\s+/).filter(Boolean);
    const matched = indexPool.filter((item) => {
      const hay = `${item.title.toLowerCase()} ${item.subtitle.toLowerCase()} ${item.keywords}`;
      return terms.every((term) => hay.includes(term));
    });

    // Prioritize exact prefix matches on title, keeping at most 18 entries for snappy navigation
    matched.sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(trimmed) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(trimmed) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const groupRank: Record<PaletteItem['group'], number> = {
        tools: 0,
        vaccines: 1,
        stages: 2,
        centres: 3,
      };
      return groupRank[a.group] - groupRank[b.group];
    });

    return matched.slice(0, 18);
  }, [indexPool, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  const activate = (item: PaletteItem) => {
    setOpen(false);
    navigate(item.to);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (results.length === 0 ? 0 : (prev + 1) % results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) =>
        results.length === 0 ? 0 : (prev - 1 + results.length) % results.length,
      );
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      activate(results[activeIndex]);
    }
  };

  const groupLabelKey: Record<PaletteItem['group'], string> = {
    tools: 'cmd.group.tools',
    vaccines: 'cmd.group.vaccines',
    centres: 'cmd.group.centres',
    stages: 'cmd.group.stages',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-neutral-950/60 p-4 pt-16 backdrop-blur-xs sm:pt-24"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.quickSearch')}
        className="animate-scale-in w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--tt-border)] bg-[var(--tt-card)] shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-[var(--tt-border)] px-4 py-3.5">
          <Search className="h-5 w-5 shrink-0 text-[var(--tt-accent)]" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('cmd.placeholder')}
            aria-label={t('cmd.placeholder')}
            className={`w-full border-0 bg-transparent text-sm text-[var(--tt-ink)] focus:ring-0 focus:outline-none ${
              isBangla ? 'font-bangla' : ''
            }`}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('common.actions.close')}
            className="rounded-lg p-1.5 text-[var(--tt-ink-muted)] transition-colors hover:bg-[var(--tt-subtle)] hover:text-[var(--tt-ink)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p
              className={`px-4 py-10 text-center text-sm text-neutral-500 dark:text-neutral-400 ${
                isBangla ? 'font-bangla' : ''
              }`}
            >
              {t('cmd.empty')}
            </p>
          ) : (
            <ul role="listbox" aria-label={t('nav.quickSearch')} className="space-y-1">
              {results.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === activeIndex;
                const prevGroup = idx > 0 ? results[idx - 1].group : null;
                const showGroupHeader = item.group !== prevGroup;

                return (
                  <li key={item.id}>
                    {showGroupHeader && (
                      <p
                        className={`px-3 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400 ${
                          isBangla ? 'font-bangla' : ''
                        }`}
                      >
                        {t(groupLabelKey[item.group])}
                      </p>
                    )}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => activate(item)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-[var(--tt-accent-soft)] text-[var(--tt-accent-ink)]'
                          : 'text-[var(--tt-ink)] hover:bg-[var(--tt-subtle)]'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isSelected
                              ? 'bg-[var(--tt-accent)] text-white'
                              : 'bg-[var(--tt-subtle)] text-[var(--tt-ink-muted)]'
                          }`}
                          aria-hidden="true"
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p
                            className={`truncate text-sm font-semibold ${isBangla ? 'font-bangla' : ''}`}
                          >
                            {item.title}
                          </p>
                          <p
                            className={`truncate text-xs text-[var(--tt-ink-muted)] ${
                              isBangla ? 'font-bangla' : ''
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        className={`h-4 w-4 shrink-0 ${
                          isSelected
                            ? 'text-[var(--tt-accent)]'
                            : 'text-[var(--tt-ink-muted)] opacity-50'
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
          <span className={isBangla ? 'font-bangla' : undefined}>{t('cmd.footerHint')}</span>
          <span className="font-mono">TikaTrack</span>
        </div>
      </div>
    </div>
  );
}
