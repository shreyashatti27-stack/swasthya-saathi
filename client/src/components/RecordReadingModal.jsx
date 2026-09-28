import React, { useState, useEffect } from 'react';
import { X, HeartPulse, Check, AlertTriangle, Calendar } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';
import RiskBadge from './RiskBadge';

export default function RecordReadingModal({ isOpen, onClose, patient, visitId, onSubmit, submitting }) {
  const { t } = useI18n();

  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [bloodSugar, setBloodSugar] = useState('');
  const [sugarType, setSugarType] = useState('random');
  const [notes, setNotes] = useState('');
  const [previewRisk, setPreviewRisk] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setSystolic('');
      setDiastolic('');
      setBloodSugar('');
      setSugarType('random');
      setNotes('');
      setPreviewRisk(null);
    }
  }, [isOpen, patient]);

  // Real-time risk calculator preview
  useEffect(() => {
    if (!patient) return;

    const sys = systolic ? Number(systolic) : null;
    const dia = diastolic ? Number(diastolic) : null;
    const sugar = bloodSugar ? Number(bloodSugar) : null;

    let bpRisk = null;
    if (sys != null || dia != null) {
      if ((sys && sys >= 180) || (dia && dia >= 110)) bpRisk = 'severe';
      else if ((sys && sys >= 140) || (dia && dia >= 90)) bpRisk = 'uncontrolled';
      else bpRisk = 'controlled';
    }

    let sugarRisk = null;
    if (sugar != null) {
      if (sugarType === 'fasting') {
        if (sugar >= 300) sugarRisk = 'severe';
        else if (sugar >= 126) sugarRisk = 'uncontrolled';
        else sugarRisk = 'controlled';
      } else {
        if (sugar >= 400) sugarRisk = 'severe';
        else if (sugar >= 200) sugarRisk = 'uncontrolled';
        else sugarRisk = 'controlled';
      }
    }

    const priority = { severe: 3, uncontrolled: 2, controlled: 1 };
    let finalRisk = 'controlled';

    if (patient.condition === 'hypertension') {
      finalRisk = bpRisk || 'controlled';
    } else if (patient.condition === 'diabetes') {
      finalRisk = sugarRisk || 'controlled';
    } else {
      if (bpRisk && sugarRisk) {
        finalRisk = priority[bpRisk] >= priority[sugarRisk] ? bpRisk : sugarRisk;
      } else {
        finalRisk = bpRisk || sugarRisk || 'controlled';
      }
    }

    const days = finalRisk === 'severe' ? 2 : finalRisk === 'uncontrolled' ? 14 : 30;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);

    setPreviewRisk({
      level: finalRisk,
      days,
      nextDate: nextDate.toISOString().split('T')[0],
    });
  }, [systolic, diastolic, bloodSugar, sugarType, patient]);

  if (!isOpen || !patient) return null;

  const isHTN = patient.condition === 'hypertension' || patient.condition === 'both';
  const isDiabetes = patient.condition === 'diabetes' || patient.condition === 'both';

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      systolic: systolic ? Number(systolic) : null,
      diastolic: diastolic ? Number(diastolic) : null,
      blood_sugar: bloodSugar ? Number(bloodSugar) : null,
      sugar_type: sugarType || null,
      notes: notes || 'Follow-up visit completed',
      completed_visit_id: visitId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-saathi-700 to-emerald-800 text-white">
          <div>
            <div className="flex items-center gap-2">
              <HeartPulse className="text-emerald-300" size={22} />
              <h3 className="text-lg font-bold">{t('record_visit')}</h3>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              {patient.name} &bull; {patient.village} &bull; {t(patient.condition)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* BP Inputs if applicable */}
          {isHTN && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                <span>Blood Pressure (BP)</span>
                <span className="text-[10px] text-slate-500 lowercase font-normal">Target: &lt;140/90</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('systolic')}</label>
                  <input
                    type="number"
                    placeholder="e.g. 130"
                    min="50"
                    max="260"
                    required={isHTN && !isDiabetes}
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full text-lg font-bold px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('diastolic')}</label>
                  <input
                    type="number"
                    placeholder="e.g. 85"
                    min="30"
                    max="160"
                    required={isHTN && !isDiabetes}
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full text-lg font-bold px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Blood Sugar Inputs if applicable */}
          {isDiabetes && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                <span>Blood Glucose (Sugar)</span>
                <span className="text-[10px] text-slate-500 lowercase font-normal">Fasting: &lt;126 | Random: &lt;200</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('blood_sugar')}</label>
                  <input
                    type="number"
                    placeholder="e.g. 140"
                    min="20"
                    max="700"
                    required={isDiabetes && !isHTN}
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    className="w-full text-lg font-bold px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{t('sugar_type')}</label>
                  <select
                    value={sugarType}
                    onChange={(e) => setSugarType(e.target.value)}
                    className="w-full text-sm font-semibold px-3 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                  >
                    <option value="random">{t('random')} (&gt;2 hrs after food)</option>
                    <option value="fasting">{t('fasting')} (empty stomach)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Dynamic Risk & Auto-Schedule Calculation Card */}
          {previewRisk && (systolic || bloodSugar) && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-saathi-50 to-emerald-50 border border-saathi-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">Evaluated Risk:</span>
                <RiskBadge level={previewRisk.level} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-saathi-900">
                <Calendar size={15} className="text-saathi-600" />
                <span>Next follow-up automatically set: {previewRisk.nextDate} (+{previewRisk.days} days)</span>
              </div>
              {previewRisk.level === 'severe' && (
                <div className="mt-2 text-xs text-rose-700 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <span>Refer patient to PHC Medical Officer immediately!</span>
                </div>
              )}
            </div>
          )}

          {/* Field Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('notes')}</label>
            <textarea
              rows={2}
              placeholder="e.g. Patient taking Amlodipine regularly, advised low salt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-sm px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-saathi-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-saathi-600 hover:bg-saathi-700 rounded-xl shadow-md shadow-saathi-600/20 flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              {submitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check size={18} />
                  <span>{t('save_reading')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
