import { Download } from 'lucide-react';

import { useToast } from '../contexts/ToastContext';
import { useI18n } from '../i18n';
import { useInstallPrompt } from '../hooks';

/**
 * "Install app" — shown only while the browser is offering the prompt.
 *
 * Deliberately not a permanent button: on iOS Safari and Firefox there is no
 * `beforeinstallprompt`, and a control that cannot work is worse than no
 * control. Those users get the same capability through the browser's own
 * Share / Add-to-Home-Screen menu, which `docs/DEPLOYMENT.md` documents.
 */
export function InstallButton({ className = 'btn-primary btn-sm' }: { className?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const outcome = await promptInstall();
        if (outcome === 'accepted') toast.success(t('common.install.accepted'));
        else if (outcome === 'dismissed') toast.info(t('common.install.dismissed'));
      }}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">{t('common.install.button')}</span>
    </button>
  );
}

export default InstallButton;
