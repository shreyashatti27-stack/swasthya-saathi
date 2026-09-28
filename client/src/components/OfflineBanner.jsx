import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOffline } from '../context/OfflineContext';
import { useI18n } from '../i18n/i18nContext';

export default function OfflineBanner() {
  const { isOffline } = useOffline();
  const { t } = useI18n();

  if (!isOffline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-inner border-b border-amber-600">
      <WifiOff size={16} className="animate-pulse flex-shrink-0" />
      <span>{t('offline_notice')}</span>
    </div>
  );
}
