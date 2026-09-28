import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

export default function RiskBadge({ level, showIcon = true, size = 'md' }) {
  const { t } = useI18n();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold tracking-wide',
    lg: 'px-3.5 py-1.5 text-sm font-bold',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  if (level === 'severe') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 shadow-sm animate-soft-pulse ${sizeClasses[size]}`}>
        {showIcon && <AlertTriangle size={iconSizes[size]} className="text-rose-600 flex-shrink-0" />}
        <span>{t('severe')}</span>
      </span>
    );
  }

  if (level === 'uncontrolled') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-sm ${sizeClasses[size]}`}>
        {showIcon && <AlertCircle size={iconSizes[size]} className="text-amber-600 flex-shrink-0" />}
        <span>{t('uncontrolled')}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm ${sizeClasses[size]}`}>
      {showIcon && <CheckCircle2 size={iconSizes[size]} className="text-emerald-600 flex-shrink-0" />}
      <span>{t('controlled')}</span>
    </span>
  );
}
