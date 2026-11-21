import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Box,
  ChevronDown,
  ChevronUp,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Snowflake,
  Thermometer,
} from 'lucide-react';

import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../i18n';
import {
  COLD_CHAIN_PARTS,
  type ColdChainPartId,
  type ThermalMode,
} from '../components/coldchain/coldChainData';
import { ColdChainScene } from '../components/coldchain/ColdChainScene';

const PART_IDS = Object.keys(COLD_CHAIN_PARTS) as ColdChainPartId[];

export default function ColdChainLabPage() {
  const { t, language } = useI18n();
  const { theme } = useTheme();
  const isBangla = language === 'bn';

  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<ColdChainScene | null>(null);

  const [exploded, setExploded] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [thermalMode, setThermalMode] = useState<ThermalMode>('nominal');
  const [selectedPartId, setSelectedPartId] = useState<ColdChainPartId | null>('vial-penta');
  const [hoveredPartId, setHoveredPartId] = useState<ColdChainPartId | null>(null);
  const [fallbackReason, setFallbackReason] = useState<'no-webgl' | 'context-lost' | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new ColdChainScene(el, {
      theme,
      callbacks: {
        onSelectPart: (id) => setSelectedPartId(id),
        onHoverPart: (id) => setHoveredPartId(id),
        onFallback: (reason) => setFallbackReason(reason),
      },
    });
    scene.setExploded(exploded);
    scene.setAutoRotate(autoRotate);
    scene.setThermalMode(thermalMode);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    sceneRef.current?.setExploded(exploded);
  }, [exploded]);

  useEffect(() => {
    sceneRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    sceneRef.current?.setThermalMode(thermalMode);
  }, [thermalMode]);

  const activePart = selectedPartId ? COLD_CHAIN_PARTS[selectedPartId] : null;
  const hoveredPart = hoveredPartId ? COLD_CHAIN_PARTS[hoveredPartId] : null;

  const handleSelectFromList = (id: ColdChainPartId) => {
    setSelectedPartId(id);
    if (id === 'icepacks' || id === 'tray' || id.startsWith('vial-')) {
      setExploded(true);
    }
    sceneRef.current?.focusPart(id);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* 3D WebGL Viewport OR clean 2D Schematic Fallback */}
      {!fallbackReason ? (
        <div
          ref={containerRef}
          className="h-[calc(100vh-4rem)] min-h-[540px] w-full"
          aria-label={t('coldchain.title')}
        />
      ) : (
        <div className="page-shell flex min-h-[calc(100vh-4rem)] flex-col justify-center">
          <div className="card-padded mx-auto max-w-4xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
              <div>
                <p className="text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
                  {t('coldchain.eyebrow')}
                </p>
                <h1 className={`mt-1 text-2xl font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                  {t('coldchain.title')}
                </h1>
              </div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {t('coldchain.fallbackNotice')}
              </span>
            </div>

            {/* Interactive 2D Thermal Schematic */}
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className={thermalMode === 'excursion' ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}>
                    {thermalMode === 'excursion' ? '+11.6°C · EXCURSION ALERT' : '+4.2°C · SAFE +2°C TO +8°C'}
                  </span>
                  <span className="text-neutral-500">WHO PQS E004</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {PART_IDS.map((id) => {
                    const part = COLD_CHAIN_PARTS[id];
                    const selected = selectedPartId === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedPartId(id)}
                        className={`rounded-xl border p-3 text-left text-xs transition-colors ${
                          selected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-100'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-emerald-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                        }`}
                      >
                        <p className={`font-bold ${isBangla ? 'font-bangla' : ''}`}>
                          {part.title[language]}
                        </p>
                        <p className="mt-1 tabular-nums text-[11px] text-neutral-500 dark:text-neutral-400">
                          {part.nominalRange}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activePart && (
                <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
                  <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
                    {activePart.nominalRange}
                  </p>
                  <h2 className={`mt-1 text-lg font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
                    {activePart.title[language]}
                  </h2>
                  <p className={`mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
                    {activePart.role[language]}
                  </p>
                  <p className={`mt-3 text-xs text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
                    {activePart.spec[language]}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top-Left Minimal Clinical Title + Telemetry Readout (solid surface, zero backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto max-w-md rounded-xl border border-neutral-200 bg-white/95 px-4 py-3 shadow-md dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            <Snowflake className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t('coldchain.eyebrow')}</span>
            <span className="text-neutral-400">·</span>
            <span
              className={`tabular-nums ${
                thermalMode === 'excursion'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {thermalMode === 'excursion' ? '+11.6°C' : '+4.2°C'}
            </span>
          </div>
          <h1 className={`mt-1 text-base font-bold text-neutral-900 sm:text-lg dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
            {t('coldchain.title')}
          </h1>
          {hoveredPart && (
            <p className={`mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 ${isBangla ? 'font-bangla' : ''}`}>
              {hoveredPart.title[language]}
            </p>
          )}
        </div>

        {/* Top-Right Selected Part Clinical Inspector Card */}
        {activePart && (
          <aside className="pointer-events-auto w-full max-w-sm rounded-xl border border-neutral-200 bg-white/95 p-4 shadow-md dark:border-neutral-800 dark:bg-neutral-900/95">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold">
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
                {activePart.nominalRange}
              </span>
              <Link to="/vaccines" className="btn-link text-xs">
                {t('nav.vaccines')}
              </Link>
            </div>
            <h2 className={`mt-1 text-sm font-bold text-neutral-900 dark:text-white ${isBangla ? 'font-bangla' : ''}`}>
              {activePart.title[language]}
            </h2>
            <p className={`mt-1.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300 ${isBangla ? 'font-bangla' : ''}`}>
              {activePart.role[language]}
            </p>
            <p className={`mt-2 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 ${isBangla ? 'font-bangla' : ''}`}>
              {activePart.spec[language]}
            </p>
          </aside>
        )}
      </div>

      {/* Compact Collapsible Bottom Control Dock (<= 15% viewport height, zero backdrop-blur) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex justify-center">
        <div className="pointer-events-auto w-full max-w-5xl rounded-xl border border-neutral-200 bg-white/95 px-3 py-2.5 shadow-lg dark:border-neutral-800 dark:bg-neutral-900/95">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Primary 3D Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setExploded((v) => !v)}
                className={`btn btn-sm whitespace-nowrap ${exploded ? 'btn-primary' : 'btn-secondary'}`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {exploded ? t('coldchain.controls.assembled') : t('coldchain.controls.exploded')}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setThermalMode((m) => (m === 'nominal' ? 'excursion' : 'nominal'))
                }
                className={`btn btn-sm whitespace-nowrap ${
                  thermalMode === 'excursion'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'btn-secondary'
                }`}
              >
                {thermalMode === 'excursion' ? (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Thermometer className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span className={isBangla ? 'font-bangla' : undefined}>
                  {thermalMode === 'excursion'
                    ? t('coldchain.controls.excursionActive')
                    : t('coldchain.controls.simulateExcursion')}
                </span>
              </button>

              {!fallbackReason && (
                <>
                  <button
                    type="button"
                    onClick={() => setAutoRotate((v) => !v)}
                    className="btn-ghost btn-sm whitespace-nowrap"
                    aria-label={t('coldchain.controls.orbit')}
                  >
                    {autoRotate ? (
                      <Pause className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span className={`hidden sm:inline ${isBangla ? 'font-bangla' : ''}`}>
                      {t('coldchain.controls.orbit')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => sceneRef.current?.resetView()}
                    className="btn-ghost btn-sm whitespace-nowrap"
                    aria-label={t('coldchain.controls.reset')}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className={`hidden sm:inline ${isBangla ? 'font-bangla' : ''}`}>
                      {t('coldchain.controls.reset')}
                    </span>
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDockCollapsed((c) => !c)}
              className="btn-ghost btn-sm whitespace-nowrap"
              aria-expanded={!dockCollapsed}
            >
              <Box className="h-3.5 w-3.5" aria-hidden="true" />
              <span className={isBangla ? 'font-bangla' : undefined}>
                {t('coldchain.controls.parts')}
              </span>
              {dockCollapsed ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          {!dockCollapsed && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto border-t border-neutral-200 pt-2 dark:border-neutral-800">
              {PART_IDS.map((id) => {
                const active = selectedPartId === id;
                const shortLabel = COLD_CHAIN_PARTS[id].title[language].split('(')[0].trim();
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectFromList(id)}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                    }`}
                  >
                    {shortLabel}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
