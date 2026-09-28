import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  HeartPulse,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/i18nContext';
import RiskBadge from '../../components/RiskBadge';

export default function AddPatient() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('female');
  const [village, setVillage] = useState('Kumbalgodu');
  const [phone, setPhone] = useState('');
  const [condition, setCondition] = useState('hypertension');
  const [preferredLanguage, setPreferredLanguage] = useState('kn');

  // Initial screening reading
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [sugarType, setSugarType] = useState('random');
  const [notes, setNotes] = useState('New patient baseline enrollment');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        age: Number(age),
        gender,
        village,
        phone,
        condition,
        preferred_language: preferredLanguage,
        systolic: systolic ? Number(systolic) : null,
        diastolic: diastolic ? Number(diastolic) : null,
        blood_sugar: bloodSugar ? Number(bloodSugar) : null,
        sugar_type: sugarType || null,
        notes,
      };

      const result = await api.createPatient(payload);
      setSuccessResult(result);
    } catch (err) {
      setError(err.message || 'Failed to register patient');
    } finally {
      setLoading(false);
    }
  };

  const isHTN = condition === 'hypertension' || condition === 'both';
  const isDiabetes = condition === 'diabetes' || condition === 'both';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-saathi-100 text-saathi-700 flex items-center justify-center flex-shrink-0">
          <UserPlus size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">{t('add_patient')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Register a new NCD patient and schedule their automated follow-up visit.
          </p>
        </div>
      </div>

      {/* Success Result Card */}
      {successResult ? (
        <div className="bg-gradient-to-br from-saathi-800 to-emerald-950 rounded-3xl p-8 text-white shadow-2xl space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <h3 className="text-xl font-black">Patient Successfully Enrolled!</h3>
              <p className="text-xs text-emerald-200">ID #{successResult.patientId} &bull; {name}</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                Risk Classification:
              </span>
              <RiskBadge level={successResult.riskEvaluation.riskLevel} size="md" />
            </div>

            <p className="text-sm text-white font-medium">
              {successResult.riskEvaluation.message}
            </p>

            <div className="flex items-center gap-2 p-3.5 bg-white/10 rounded-xl text-sm font-bold text-emerald-100">
              <Calendar size={18} className="text-emerald-300" />
              <span>Next Follow-up Visit Auto-Scheduled for: {successResult.nextScheduledDate}</span>
            </div>

            {successResult.riskEvaluation.referralNeeded && (
              <div className="p-3.5 bg-rose-500/20 border border-rose-400/50 rounded-xl text-xs font-bold text-rose-200 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400 flex-shrink-0" />
                <span>Immediate referral flag sent to Primary Health Centre Medical Officer.</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap pt-2">
            <button
              onClick={() => navigate(`/asha/patient/${successResult.patientId}`)}
              className="px-6 py-3 bg-white text-saathi-900 font-bold text-sm rounded-xl shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2"
            >
              <span>View Patient Profile & Charts</span>
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => {
                setSuccessResult(null);
                setName('');
                setAge('');
                setPhone('');
                setSystolic('');
                setDiastolic('');
                setBloodSugar('');
              }}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition-all"
            >
              Register Another Patient
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle size={18} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Demographics */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <User size={18} className="text-saathi-600" />
              <span>1. Patient Demographics & Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  {t('patient_name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    {t('age')} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    placeholder="e.g. 58"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    {t('gender')} *
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                  >
                    <option value="female">{t('female')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  {t('village')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kumbalgodu"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  {t('phone')}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98451 22301"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  {t('condition')} *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-saathi-900 focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                >
                  <option value="hypertension">{t('hypertension')}</option>
                  <option value="diabetes">{t('diabetes')}</option>
                  <option value="both">{t('both')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  {t('pref_lang')} (For SMS & IVR)
                </label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                >
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Initial Baseline Reading */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <HeartPulse size={18} className="text-saathi-600" />
              <span>2. Baseline Clinical Screening Reading</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {isHTN && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60 space-y-3">
                  <span className="text-xs font-bold uppercase text-emerald-900 block">
                    Blood Pressure
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {t('systolic')}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 145"
                        required={isHTN && !isDiabetes}
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-base focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {t('diastolic')}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 95"
                        required={isHTN && !isDiabetes}
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-base focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isDiabetes && (
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/60 space-y-3">
                  <span className="text-xs font-bold uppercase text-emerald-900 block">
                    Blood Sugar
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {t('blood_sugar')}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 180"
                        required={isDiabetes && !isHTN}
                        value={bloodSugar}
                        onChange={(e) => setBloodSugar(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-base focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        {t('sugar_type')}
                      </label>
                      <select
                        value={sugarType}
                        onChange={(e) => setSugarType(e.target.value)}
                        className="w-full px-2.5 py-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                      >
                        <option value="random">Random</option>
                        <option value="fasting">Fasting</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('notes')}</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-saathi-600 to-emerald-600 hover:from-saathi-700 hover:to-emerald-700 text-white font-bold text-base rounded-2xl shadow-xl shadow-saathi-600/30 flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span>Registering patient & calculating risk...</span>
              ) : (
                <>
                  <Sparkles size={20} />
                  <span>{t('save_patient')} & Schedule Follow-up</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
