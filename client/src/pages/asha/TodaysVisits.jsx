import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Phone,
  Send,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  HeartPulse,
  Filter,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/i18nContext';
import { useOffline } from '../../context/OfflineContext';
import RiskBadge from '../../components/RiskBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import RecordReadingModal from '../../components/RecordReadingModal';
import PhoneSimulatorModal from '../../components/PhoneSimulatorModal';

export default function TodaysVisits() {
  const { t } = useI18n();
  const { isOffline, saveToCache, getFromCache } = useOffline();

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  // Modal states
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Phone simulation modal state
  const [simulatedReminder, setSimulatedReminder] = useState(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchVisits = async () => {
    setLoading(true);
    setError('');

    try {
      if (isOffline) {
        const cached = getFromCache('todays_visits');
        if (cached) {
          setVisits(cached);
          setLoading(false);
          return;
        }
      }

      const data = await api.getTodaysVisits();
      setVisits(data.visits || []);
      saveToCache('todays_visits', data.visits || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch visits');
      const cached = getFromCache('todays_visits');
      if (cached) setVisits(cached);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleOpenRecordModal = (visit) => {
    setSelectedVisit(visit);
    setIsRecordModalOpen(true);
  };

  const handleCompleteVisitSubmit = async (formData) => {
    if (!selectedVisit) return;
    setSubmitting(true);

    try {
      const res = await api.completeVisit(selectedVisit.visit_id, formData);
      setIsRecordModalOpen(false);
      setToastMessage(`✅ Visit saved for ${selectedVisit.patient_name}! Next follow-up: ${res.nextScheduledDate}`);
      setTimeout(() => setToastMessage(''), 6000);
      fetchVisits();
    } catch (err) {
      alert(err.message || 'Failed to complete visit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async (visit) => {
    try {
      const res = await api.sendReminder({
        patient_id: visit.patient_id,
        visit_id: visit.visit_id,
        language: visit.preferred_language,
        channel: 'sms',
      });

      setSimulatedReminder(res.preview);
      setIsPhoneModalOpen(true);
      fetchVisits();
    } catch (err) {
      alert(err.message || 'Failed to send reminder');
    }
  };

  const filteredVisits = visits.filter((v) => {
    if (filterRisk === 'all') return true;
    return v.latest_risk_level === filterRisk;
  });

  const severeCount = visits.filter((v) => v.latest_risk_level === 'severe').length;
  const overdueCount = visits.filter((v) => v.is_overdue).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast alert */}
      {toastMessage && (
        <div className="p-4 bg-emerald-700 text-white font-bold rounded-2xl shadow-xl flex items-center justify-between animate-bounce">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage('')} className="text-emerald-200 hover:text-white text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-saathi-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-saathi-900/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              Field Action Queue
            </span>
            {isOffline && (
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-200 text-xs font-bold uppercase">
                Offline Mode
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">{t('todays_visits')}</h1>
          <p className="text-sm text-emerald-100/90 mt-1">
            Prioritized by clinical severity and overdue urgency.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2">
          {severeCount > 0 && (
            <div className="bg-rose-500/20 border border-rose-400/40 px-4 py-2.5 rounded-2xl text-center backdrop-blur-md">
              <span className="block text-xl font-black text-rose-300">{severeCount}</span>
              <span className="text-[10px] font-bold uppercase text-rose-200 tracking-wider">Severe Cases</span>
            </div>
          )}
          <div className="bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl text-center backdrop-blur-md">
            <span className="block text-xl font-black text-white">{overdueCount}</span>
            <span className="text-[10px] font-bold uppercase text-emerald-200 tracking-wider">Overdue</span>
          </div>
          <button
            onClick={fetchVisits}
            className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            title="Refresh queue"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400 ml-1" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Filter Risk:</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: 'all', label: t('all_risks') },
            { key: 'severe', label: t('severe') },
            { key: 'uncontrolled', label: t('uncontrolled') },
            { key: 'controlled', label: t('controlled') },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterRisk(f.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterRisk === f.key
                  ? 'bg-saathi-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visits List */}
      {loading && visits.length === 0 ? (
        <LoadingSpinner message="Loading your field visit queue..." />
      ) : filteredVisits.length === 0 ? (
        <EmptyState
          title={t('no_visits_today')}
          description="All assigned patients have their routine checks and follow-ups up to date."
          icon={CheckCircle2}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVisits.map((v) => {
            const isSevere = v.latest_risk_level === 'severe';
            const isOverdue = v.is_overdue;

            return (
              <div
                key={v.visit_id}
                className={`rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  isSevere
                    ? 'bg-gradient-to-b from-rose-50/90 to-white border-rose-300 ring-2 ring-rose-400/30'
                    : isOverdue
                    ? 'bg-gradient-to-b from-amber-50/60 to-white border-amber-300'
                    : 'bg-white border-slate-200 hover:border-saathi-300'
                }`}
              >
                {/* Top Patient Header */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/asha/patient/${v.patient_id}`}
                          className="text-lg font-black text-slate-900 hover:text-saathi-700 transition-colors"
                        >
                          {v.patient_name}
                        </Link>
                        <span className="text-xs font-bold text-slate-400">({v.age}y &bull; {t(v.gender)})</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                        <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                        <span>{v.village}</span>
                        <span>&bull;</span>
                        <span className="capitalize font-semibold text-slate-700">{t(v.condition)}</span>
                      </div>
                    </div>

                    <RiskBadge level={v.latest_risk_level} size="sm" />
                  </div>

                  {/* Overdue / Due Status Tag */}
                  <div className="mb-4">
                    {isOverdue ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                        <Clock size={13} className="text-amber-600" />
                        <span>{v.days_overdue} {t('days_overdue')} (Due: {v.scheduled_date})</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold">
                        <CalendarCheck size={13} className="text-emerald-600" />
                        <span>{t('due_today')}</span>
                      </div>
                    )}
                  </div>

                  {/* Latest Diagnostic Info Banner */}
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Previous Reading ({v.latest_reading_date ? new Date(v.latest_reading_date).toLocaleDateString() : 'N/A'})
                    </p>
                    <div className="flex items-center justify-between text-slate-800 font-bold">
                      {v.latest_systolic ? (
                        <span>BP: {v.latest_systolic}/{v.latest_diastolic} mmHg</span>
                      ) : (
                        <span className="text-slate-400">BP: Not recorded</span>
                      )}
                      {v.latest_blood_sugar ? (
                        <span>Sugar: {v.latest_blood_sugar} mg/dL ({v.latest_sugar_type})</span>
                      ) : (
                        <span className="text-slate-400">Sugar: -</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Big Action Buttons (Touch Optimized) */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  {/* Primary: Record Visit */}
                  <button
                    onClick={() =>
                      handleOpenRecordModal({
                        ...v,
                        name: v.patient_name,
                        condition: v.condition,
                      })
                    }
                    className={`w-full py-3 px-4 rounded-2xl font-bold text-sm text-white shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      isSevere
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-saathi-600 hover:bg-saathi-700 shadow-saathi-600/20'
                    }`}
                  >
                    <HeartPulse size={18} />
                    <span>{t('record_visit')}</span>
                  </button>

                  {/* Secondary Actions: Call & Send Reminder */}
                  <div className="grid grid-cols-2 gap-2">
                    {v.phone ? (
                      <a
                        href={`tel:${v.phone.replace(/\s+/g, '')}`}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Phone size={14} className="text-slate-600" />
                        <span>{t('call_patient')}</span>
                      </a>
                    ) : (
                      <button
                        disabled
                        className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed"
                      >
                        <Phone size={14} />
                        <span>No Phone</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        handleSendReminder({
                          patient_id: v.patient_id,
                          visit_id: v.visit_id,
                          patient_name: v.patient_name,
                          preferred_language: v.preferred_language,
                        })
                      }
                      className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send size={14} className="text-emerald-600" />
                      <span>{t('send_reminder')}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Reading Modal */}
      <RecordReadingModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        patient={selectedVisit}
        visitId={selectedVisit?.visit_id}
        onSubmit={handleCompleteVisitSubmit}
        submitting={submitting}
      />

      {/* Phone Simulator Modal */}
      <PhoneSimulatorModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        reminder={simulatedReminder}
      />
    </div>
  );
}
