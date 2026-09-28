import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  HeartPulse,
  Calendar,
  Phone,
  Send,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/i18nContext';
import RiskBadge from '../../components/RiskBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import RecordReadingModal from '../../components/RecordReadingModal';
import PhoneSimulatorModal from '../../components/PhoneSimulatorModal';

export default function PatientDetail() {
  const { id } = useParams();
  const { t } = useI18n();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [simulatedReminder, setSimulatedReminder] = useState(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const fetchPatient = async () => {
    setLoading(true);
    try {
      const res = await api.getPatient(id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch patient details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatient();
  }, [id]);

  const handleRecordReadingSubmit = async (formData) => {
    setSubmitting(true);
    try {
      await api.recordReading(id, formData);
      setIsRecordModalOpen(false);
      fetchPatient();
    } catch (err) {
      alert(err.message || 'Failed to save reading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReminder = async () => {
    if (!data?.patient) return;
    try {
      const res = await api.sendReminder({
        patient_id: data.patient.id,
        language: data.patient.preferred_language,
        channel: 'sms',
      });
      setSimulatedReminder(res.preview);
      setIsPhoneModalOpen(true);
      fetchPatient();
    } catch (err) {
      alert(err.message || 'Failed to send reminder');
    }
  };

  if (loading) return <LoadingSpinner message="Loading patient clinical profile & timeline..." />;
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 text-center">
          <AlertTriangle className="mx-auto text-rose-600 mb-2" size={32} />
          <p className="font-bold">{error || 'Patient not found'}</p>
          <Link to="/asha/patients" className="mt-4 inline-block px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs">
            Back to Patients List
          </Link>
        </div>
      </div>
    );
  }

  const { patient, readings, visits, reminders } = data;
  const isHTN = patient.condition === 'hypertension' || patient.condition === 'both';
  const isDiabetes = patient.condition === 'diabetes' || patient.condition === 'both';
  const latestReading = readings && readings.length > 0 ? readings[readings.length - 1] : null;

  // Chart data format
  const chartData = readings.map((r, idx) => {
    const d = new Date(r.recorded_at);
    return {
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      fullDate: d.toLocaleDateString(),
      systolic: r.systolic,
      diastolic: r.diastolic,
      blood_sugar: r.blood_sugar,
      risk: r.risk_level,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Back button */}
      <Link
        to="/asha/patients"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-saathi-700 transition-colors"
      >
        <ArrowLeft size={16} />
        <span>Back to Patients Directory</span>
      </Link>

      {/* Patient Profile Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-saathi-600 to-emerald-400 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-saathi-500/20 flex-shrink-0">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900">{patient.name}</h1>
                <RiskBadge level={latestReading?.risk_level || 'controlled'} size="sm" />
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 mt-1.5 flex-wrap">
                <span>{patient.age} years</span>
                <span>&bull;</span>
                <span className="capitalize">{t(patient.gender)}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  {patient.village}
                </span>
                <span>&bull;</span>
                <span className="px-2 py-0.5 rounded-md bg-saathi-50 text-saathi-800 font-bold uppercase text-[10px]">
                  {t(patient.condition)}
                </span>
                <span>&bull;</span>
                <span className="text-slate-400 uppercase text-[10px]">Lang: {patient.preferred_language}</span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {patient.phone && (
              <a
                href={`tel:${patient.phone.replace(/\s+/g, '')}`}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
              >
                <Phone size={15} />
                <span>Call ({patient.phone})</span>
              </a>
            )}
            <button
              onClick={handleSendReminder}
              className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-2 transition-colors"
            >
              <Send size={15} className="text-emerald-600" />
              <span>Send SMS / IVR</span>
            </button>
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="px-5 py-3 bg-saathi-600 hover:bg-saathi-700 text-white font-bold text-xs rounded-xl shadow-md shadow-saathi-600/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <HeartPulse size={16} />
              <span>Record New Reading</span>
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Pressure Trend Chart */}
        {isHTN && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={20} className="text-rose-500" />
                <h3 className="text-base font-bold text-slate-900">Blood Pressure History (mmHg)</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Threshold: 140 / 90
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[50, 200]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  {/* Guideline reference lines */}
                  <ReferenceLine y={140} stroke="#f87171" strokeDasharray="4 4" label={{ value: '140 Sys Threshold', fill: '#ef4444', fontSize: 10 }} />
                  <ReferenceLine y={90} stroke="#fb923c" strokeDasharray="4 4" label={{ value: '90 Dia Threshold', fill: '#f97316', fontSize: 10 }} />
                  
                  <Line
                    type="monotone"
                    dataKey="systolic"
                    name="Systolic BP"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#ef4444' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="diastolic"
                    name="Diastolic BP"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#3b82f6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Blood Sugar Trend Chart */}
        {isDiabetes && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse size={20} className="text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">Blood Glucose History (mg/dL)</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                Fasting: &lt;126 | Random: &lt;200
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis domain={[60, 350]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine y={200} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '200 Random Threshold', fill: '#d97706', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="blood_sugar"
                    name="Blood Sugar (mg/dL)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#10b981' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Section: Clinical Readings Log & Scheduled Visits Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Past Readings Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-saathi-600" />
            <span>Longitudinal Readings Log ({readings.length})</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3">Date</th>
                  <th className="pb-3">BP</th>
                  <th className="pb-3">Sugar</th>
                  <th className="pb-3">Risk</th>
                  <th className="pb-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {readings.slice().reverse().map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="py-3 font-semibold text-slate-700">
                      {new Date(r.recorded_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {r.systolic ? `${r.systolic}/${r.diastolic}` : '-'}
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      {r.blood_sugar ? `${r.blood_sugar} (${r.sugar_type})` : '-'}
                    </td>
                    <td className="py-3">
                      <RiskBadge level={r.risk_level} size="sm" showIcon={false} />
                    </td>
                    <td className="py-3 text-slate-500 max-w-[140px] truncate" title={r.notes}>
                      {r.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Visits & Follow-up Timeline */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={18} className="text-saathi-600" />
            <span>Follow-up Visits Timeline ({visits.length})</span>
          </h3>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {visits.map((v) => {
              const isDone = v.status === 'done';
              const isMissed = v.status === 'missed';
              const isPending = v.status === 'pending';

              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isDone
                      ? 'bg-emerald-50/40 border-emerald-200/60'
                      : isMissed
                      ? 'bg-rose-50/40 border-rose-200/60'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isMissed
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : isMissed ? <AlertTriangle size={18} /> : <Clock size={18} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Scheduled: {v.scheduled_date}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isDone
                          ? `Completed on ${new Date(v.completed_date).toLocaleDateString()}`
                          : isMissed
                          ? 'Missed (> 3 days past schedule)'
                          : 'Pending Field Visit'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800'
                        : isMissed
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t(v.status)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Record Reading Modal */}
      <RecordReadingModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        patient={patient}
        onSubmit={handleRecordReadingSubmit}
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
