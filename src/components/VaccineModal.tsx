import { X, Calendar, Heart, AlertCircle, TrendingUp, ExternalLink } from 'lucide-react';
import { type Vaccine, vaccineColors } from '../data/vaccines';
import { useBodyScrollLock, useFocusTrap } from '../hooks';
import { useI18n } from '../i18n';

interface VaccineModalProps {
  vaccine: Vaccine;
  onClose: () => void;
}

export function VaccineModal({ vaccine, onClose }: VaccineModalProps) {
  const { language, t } = useI18n();
  const colorConfig = vaccineColors[vaccine.color] || vaccineColors.emerald;

  // Without a trap, Tab walks out of the modal into the page behind it, and
  // without Escape the only way out is a mouse click on the close button.
  const dialogRef = useFocusTrap<HTMLDivElement>(true, { onEscape: onClose });
  useBodyScrollLock(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vaccine-modal-title"
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-br ${colorConfig.bg} p-6 rounded-t-3xl relative`}>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.a11y.dialogClose')}
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" aria-hidden="true" />
          </button>

          <div className="flex items-start gap-4">
            <div className="text-6xl">{vaccine.icon}</div>
            <div className="flex-1">
              <h2
                className={`text-3xl font-bold ${colorConfig.text} mb-1 ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {vaccine.name[language]}
              </h2>
              <p
                className={`${colorConfig.text} opacity-90 ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {vaccine.fullName[language]}
              </p>
              <div className="flex gap-2 mt-3">
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
                  {vaccine.category === 'routine'
                    ? language === 'en'
                      ? 'Routine'
                      : 'নিয়মিত'
                    : vaccine.category === 'campaign'
                      ? language === 'en'
                        ? 'Campaign'
                        : 'ক্যাম্পেইন'
                      : vaccine.category === 'special'
                        ? language === 'en'
                          ? 'Special'
                          : 'বিশেষ'
                        : vaccine.category === 'recommended'
                          ? language === 'en'
                            ? 'Recommended'
                            : 'সুপারিশকৃত'
                          : language === 'en'
                            ? 'Other'
                            : 'অন্যান্য'}
                </span>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-sm">
                  {vaccine.doses} {language === 'en' ? 'dose(s)' : 'ডোজ'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Disease Prevention */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-red-500" />
              <h3
                className={`text-lg font-bold text-neutral-900 dark:text-white ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {language === 'en' ? 'Disease Prevention' : 'রোগ প্রতিরোধ'}
              </h3>
            </div>
            <p
              className={`text-neutral-700 dark:text-neutral-300 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.disease[language]}
            </p>
          </div>

          {/* Schedule */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              <h3
                className={`text-lg font-bold text-neutral-900 dark:text-white ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {language === 'en' ? 'Vaccination Schedule' : 'টিকাদান সূচি'}
              </h3>
            </div>
            <p
              className={`text-neutral-700 dark:text-neutral-300 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.schedule[language]}
            </p>
          </div>

          {/* Efficacy */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <h3
                className={`text-lg font-bold text-neutral-900 dark:text-white ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {language === 'en' ? 'Effectiveness' : 'কার্যকারিতা'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all"
                  style={{ width: vaccine.efficacy }}
                ></div>
              </div>
              <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                {vaccine.efficacy}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3
              className={`text-lg font-bold text-neutral-900 dark:text-white mb-2 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {language === 'en' ? 'About This Vaccine' : 'এই টিকা সম্পর্কে'}
            </h3>
            <p
              className={`text-neutral-700 dark:text-neutral-300 leading-relaxed ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.description[language]}
            </p>
          </div>

          {/* Common Side Effects */}
          <div className="bg-blue-50 dark:bg-blue-950/40 rounded-2xl p-4">
            <h3
              className={`text-lg font-bold text-blue-900 dark:text-blue-200 mb-2 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {language === 'en' ? 'Common Side Effects' : 'সাধারণ পার্শ্বপ্রতিক্রিয়া'}
            </h3>
            <p
              className={`text-blue-800 dark:text-blue-200 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.commonEffects[language]}
            </p>
          </div>

          {/* Serious Reactions */}
          <div className="bg-amber-50 dark:bg-amber-950/40 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3
                className={`text-lg font-bold text-amber-900 dark:text-amber-200 ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {language === 'en' ? 'Serious Reactions (Rare)' : 'গুরুতর প্রতিক্রিয়া (বিরল)'}
              </h3>
            </div>
            <p
              className={`text-amber-800 dark:text-amber-200 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.seriousEffects[language]}
            </p>
          </div>

          {/* Contraindications */}
          <div className="bg-red-50 dark:bg-red-950/40 rounded-2xl p-4">
            <h3
              className={`text-lg font-bold text-red-900 dark:text-red-200 mb-2 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {language === 'en' ? 'Contraindications' : 'কন্ট্রাইন্ডিকেশন'}
            </h3>
            <p
              className={`text-red-800 dark:text-red-200 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.contraindications[language]}
            </p>
          </div>

          {/* Disease Risk */}
          <div className="bg-purple-50 dark:bg-purple-950/40 rounded-2xl p-4">
            <h3
              className={`text-lg font-bold text-purple-900 dark:text-purple-200 mb-2 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {language === 'en' ? 'Risk Without Vaccination' : 'টিকা ছাড়া ঝুঁকি'}
            </h3>
            <p
              className={`text-purple-800 dark:text-purple-200 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {vaccine.diseaseRisk[language]}
            </p>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
              <p
                className={`text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1 ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {language === 'en' ? 'Introduced' : 'প্রবর্তিত'}
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white">
                {vaccine.introduced}
              </p>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
              <p
                className={`text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1 ${language === 'bn' ? 'font-bangla' : ''}`}
              >
                {language === 'en' ? 'Age Group' : 'বয়স গ্রুপ'}
              </p>
              <p className="text-lg font-bold text-neutral-900 dark:text-white capitalize">
                {vaccine.ageGroup}
              </p>
            </div>
          </div>

          {/* Source */}
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-4">
            <h3
              className={`text-lg font-bold text-neutral-900 dark:text-white mb-2 ${language === 'bn' ? 'font-bangla' : ''}`}
            >
              {language === 'en' ? 'Source' : 'উৎস'}
            </h3>
            <a
              href={vaccine.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              {vaccine.source} <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
