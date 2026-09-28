import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Smartphone,
  MessageSquare,
  PhoneCall,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/i18nContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import PhoneSimulatorModal from '../../components/PhoneSimulatorModal';

export default function RemindersLog() {
  const { t } = useI18n();

  const [reminders, setReminders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Manual send drawer/form
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedLang, setSelectedLang] = useState('kn');
  const [selectedChannel, setSelectedChannel] = useState('sms');
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);

  // Phone simulation modal
  const [simulatedReminder, setSimulatedReminder] = useState(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [remindersRes, patientsRes] = await Promise.all([
        api.getReminders(),
        api.getPatients(),
      ]);
      setReminders(remindersRes.reminders || []);
      setPatients(patientsRes.patients || []);
      if (patientsRes.patients && patientsRes.patients.length > 0) {
        setSelectedPatientId(patientsRes.patients[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reminders log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendReminder = async (e) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setSending(true);

    try {
      const res = await api.sendReminder({
        patient_id: Number(selectedPatientId),
        language: selectedLang,
        channel: selectedChannel,
        custom_message: customMsg || undefined,
      });

      setCustomMsg('');
      setSimulatedReminder(res.preview);
      setIsPhoneModalOpen(true);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to send reminder');
    } finally {
      setSending(false);
    }
  };

  const handleTriggerAutoBatch = async () => {
    try {
      const res = await api.autoTriggerReminders();
      alert(`Automated job executed! ${res.message}`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to execute automated job');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-saathi-100 text-saathi-700 flex items-center justify-center flex-shrink-0">
            <Bell size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{t('reminders_log')}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Automated multi-lingual voice calls and SMS alerts sent to patients across rural villages.
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerAutoBatch}
          className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <Sparkles size={16} className="text-emerald-400" />
          <span>Run Tomorrow's Batch Reminder Cron</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Send Composer */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send size={18} className="text-saathi-600" />
            <span>Send Immediate Reminder</span>
          </h3>

          <form onSubmit={handleSendReminder} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Select Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-saathi-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.village})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Language
                </label>
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="sms">SMS Text</option>
                  <option value="ivr">IVR Voice Call</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Custom Message (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Leave blank to use official government template automatically..."
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-saathi-600 hover:bg-saathi-700 text-white font-bold text-xs rounded-xl shadow-md shadow-saathi-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Send size={16} />
              <span>{sending ? 'Dispatching...' : 'Dispatch Reminder'}</span>
            </button>
          </form>
        </div>

        {/* Reminders Feed */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock size={18} className="text-slate-500" />
              <span>Broadcast Log ({reminders.length})</span>
            </h3>
            <button
              onClick={fetchData}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Fetching reminder broadcast log..." />
          ) : reminders.length === 0 ? (
            <EmptyState
              title="No reminders dispatched yet"
              description="Dispatched SMS and IVR voice notifications will show up here."
              icon={Bell}
            />
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-saathi-300 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-saathi-100 text-saathi-800 flex items-center justify-center">
                        {r.channel === 'ivr' ? <PhoneCall size={16} /> : <MessageSquare size={16} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{r.patient_name}</h4>
                        <p className="text-[10px] text-slate-500">
                          {r.village} &bull; {r.patient_phone || '+91 9845X XXXXX'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {r.language} &bull; {r.channel}
                      </span>
                      <button
                        onClick={() => {
                          setSimulatedReminder(r);
                          setIsPhoneModalOpen(true);
                        }}
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors"
                        title="View on simulated phone"
                      >
                        <Smartphone size={13} />
                        <span>Preview</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                    "{r.message}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>ASHA: {r.asha_name}</span>
                    <span>Delivered at: {new Date(r.sent_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phone Simulator Modal */}
      <PhoneSimulatorModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        reminder={simulatedReminder}
      />
    </div>
  );
}
