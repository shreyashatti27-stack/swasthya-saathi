import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  Phone,
  ArrowRight,
  MapPin,
  HeartPulse,
} from 'lucide-react';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/i18nContext';
import RiskBadge from '../../components/RiskBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

export default function MyPatients() {
  const { t } = useI18n();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const data = await api.getPatients({
        search: search.trim(),
        village: selectedVillage === 'all' ? '' : selectedVillage,
        risk: selectedRisk === 'all' ? '' : selectedRisk,
      });
      setPatients(data.patients || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [selectedVillage, selectedRisk]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients();
  };

  // Distinct villages for filter dropdown
  const villages = Array.from(new Set(patients.map((p) => p.village))).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-saathi-100 text-saathi-700 flex items-center justify-center flex-shrink-0">
            <Users size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">{t('my_patients')}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage, search, and monitor longitudinal vitals for your assigned cohort ({patients.length} total).
            </p>
          </div>
        </div>

        <Link
          to="/asha/add-patient"
          className="px-5 py-3 bg-saathi-600 hover:bg-saathi-700 text-white font-bold text-sm rounded-2xl shadow-md shadow-saathi-600/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        >
          <UserPlus size={18} />
          <span>{t('add_patient')}</span>
        </Link>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute inset-y-0 left-3.5 my-auto text-slate-400" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase">Filters:</span>

            {/* Risk filter */}
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="all">{t('all_risks')}</option>
              <option value="severe">{t('severe')}</option>
              <option value="uncontrolled">{t('uncontrolled')}</option>
              <option value="controlled">{t('controlled')}</option>
            </select>

            {/* Village filter */}
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="all">{t('all_villages')}</option>
              {villages.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-semibold text-slate-400">Showing {patients.length} records</span>
        </div>
      </div>

      {/* Patient Cards Grid */}
      {loading ? (
        <LoadingSpinner message="Fetching patient directory..." />
      ) : patients.length === 0 ? (
        <EmptyState
          title="No patients found"
          description="Try clearing your search query or adjusting your filters."
          icon={Users}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {patients.map((p) => {
            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 hover:border-saathi-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-0.5">
                        <span>{p.age} yrs</span>
                        <span>&bull;</span>
                        <span className="capitalize">{t(p.gender)}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-0.5">
                          <MapPin size={12} className="text-slate-400" />
                          {p.village}
                        </span>
                      </div>
                    </div>
                    <RiskBadge level={p.latest_risk_level || 'controlled'} size="sm" />
                  </div>

                  <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="text-slate-400 text-[10px] uppercase">Diagnosis</span>
                      <span className="capitalize font-bold text-saathi-800">{t(p.condition)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="text-slate-400 text-[10px] uppercase">Last Reading</span>
                      <span className="font-bold">
                        {p.latest_systolic ? `BP: ${p.latest_systolic}/${p.latest_diastolic}` : ''}
                        {p.latest_blood_sugar ? ` | Sugar: ${p.latest_blood_sugar}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="text-slate-400 text-[10px] uppercase">Next Follow-up</span>
                      <span className="font-bold text-emerald-700">
                        {p.next_visit_date || 'None scheduled'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {p.phone ? (
                    <a
                      href={`tel:${p.phone.replace(/\s+/g, '')}`}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                      title={`Call ${p.phone}`}
                    >
                      <Phone size={16} />
                    </a>
                  ) : null}

                  <Link
                    to={`/asha/patient/${p.id}`}
                    className="flex-1 py-2.5 px-4 bg-saathi-50 hover:bg-saathi-100 text-saathi-800 border border-saathi-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>View Clinical History</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
