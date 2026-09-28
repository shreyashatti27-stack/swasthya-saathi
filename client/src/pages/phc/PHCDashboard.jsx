import React, { useState, useEffect } from 'react';
import {
  Users,
  HeartPulse,
  Clock,
  AlertTriangle,
  TrendingUp,
  Award,
  Activity,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../../api/client';
import { useI18n } from '../../i18n/i18nContext';
import StatCard from '../../components/StatCard';
import RiskBadge from '../../components/RiskBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function PHCDashboard() {
  const { t } = useI18n();

  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [ashaStats, setAshaStats] = useState([]);
  const [severeOverdue, setSevereOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');

    try {
      const [sumRes, trendRes, ashaRes, drilldownRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardTrends(),
        api.getAshaPerformance(),
        api.getSevereAndOverdue(),
      ]);

      setSummary(sumRes);
      setTrends(trendRes.trends || []);
      setAshaStats(ashaRes.ashaPerformance || []);
      setSevereOverdue(drilldownRes.patients || []);
    } catch (err) {
      setError(err.message || 'Failed to load PHC dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) return <LoadingSpinner message="Aggregating Primary Health Centre population analytics..." />;

  const kpis = summary?.kpis || {};
  const riskDist = summary?.riskDistribution || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-saathi-950 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              Kengeri PHC Jurisdiction
            </span>
            <span className="text-xs text-slate-400">Live Surveillance Feed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-2">{t('phc_dashboard')}</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Population-level hypertension and diabetes adherence & control analytics across 6 villages.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-colors border border-white/10"
        >
          <RefreshCw size={15} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('kpi_total_patients')}
          value={kpis.totalPatients || 0}
          subtitle="Across 3 ASHA worker cohorts"
          icon={Users}
          color="blue"
        />

        <StatCard
          title={t('kpi_control_rate')}
          value={`${kpis.controlRatePct || 0}%`}
          subtitle={`${kpis.controlledCount || 0} patients under target`}
          icon={TrendingUp}
          color="emerald"
          badgeText="Target: >50%"
          badgeColor="bg-emerald-100 text-emerald-800"
        />

        <StatCard
          title={t('kpi_overdue')}
          value={kpis.overdueVisits || 0}
          subtitle="Action required by field team"
          icon={Clock}
          color="amber"
          badgeText={kpis.overdueVisits > 0 ? 'Urgent' : 'Clear'}
          badgeColor="bg-amber-100 text-amber-900"
        />

        <StatCard
          title={t('kpi_severe')}
          value={kpis.severeCount || 0}
          subtitle="BP ≥180/110 or Sugar ≥300"
          icon={AlertTriangle}
          color="rose"
          badgeText="Immediate Referral"
          badgeColor="bg-rose-100 text-rose-900"
        />
      </div>

      {/* Charts Row: Monthly Control Rate Trend & Risk Distribution Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Progression Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity size={20} className="text-saathi-600" />
                <span>NCD Control Rate Progression Over Time (%)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Longitudinal clinical control rate improving as follow-up adherence increases.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              +38% vs Baseline
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="controlRate"
                  name="Patients with BP & Sugar Controlled (%)"
                  stroke="#0ea575"
                  strokeWidth={3.5}
                  dot={{ r: 5, fill: '#0ea575' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Donut Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Current Risk Stratification</h3>
            <p className="text-xs text-slate-500">Patient cohort breakdown by latest clinical reading.</p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
            <div className="bg-emerald-50 p-2 rounded-xl">
              <span className="block text-sm font-black text-emerald-800">{kpis.controlledCount || 0}</span>
              <span className="text-[10px] font-bold text-emerald-600">Controlled</span>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl">
              <span className="block text-sm font-black text-amber-800">{kpis.uncontrolledCount || 0}</span>
              <span className="text-[10px] font-bold text-amber-600">Uncontrolled</span>
            </div>
            <div className="bg-rose-50 p-2 rounded-xl">
              <span className="block text-sm font-black text-rose-800">{kpis.severeCount || 0}</span>
              <span className="text-[10px] font-bold text-rose-600">Severe</span>
            </div>
          </div>
        </div>
      </div>

      {/* ASHA-wise Performance Scorecard Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Award size={22} className="text-saathi-600" />
            <h3 className="text-lg font-bold text-slate-900">{t('asha_performance')}</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Adherence to follow-up visits doubles BP control probability
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="pb-3.5">ASHA Worker</th>
                <th className="pb-3.5">Villages Covered</th>
                <th className="pb-3.5 text-center">Total Patients</th>
                <th className="pb-3.5 text-center">Follow-up Adherence</th>
                <th className="pb-3.5 text-center">Cohort Control %</th>
                <th className="pb-3.5 text-right">Severe Cases</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ashaStats.map((asha) => (
                <tr key={asha.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4">
                    <p className="font-bold text-slate-900">{asha.name}</p>
                    <p className="text-[11px] text-slate-400">{asha.phone}</p>
                  </td>
                  <td className="py-4 text-slate-600">
                    {asha.villages.join(', ')}
                  </td>
                  <td className="py-4 text-center font-bold text-slate-900">
                    {asha.totalPatients}
                  </td>
                  <td className="py-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-saathi-600 h-2 rounded-full"
                          style={{ width: `${asha.visitCompletionRate}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-slate-800">{asha.visitCompletionRate}%</span>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-bold text-xs">
                      {asha.controlRate}% Under Control
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    {asha.severeCount > 0 ? (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                        {asha.severeCount} Urgent
                      </span>
                    ) : (
                      <span className="text-slate-400 font-semibold">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Table: Critical Patients (Severe Risk & Overdue) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={22} className="text-rose-600" />
            <h3 className="text-lg font-bold text-slate-900">{t('severe_cases_attention')} ({severeOverdue.length})</h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Direct clinical triage list for PHC Officer follow-up & ambulance dispatch
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="pb-3.5">Patient Name</th>
                <th className="pb-3.5">Village</th>
                <th className="pb-3.5">Condition</th>
                <th className="pb-3.5">Latest Vitals</th>
                <th className="pb-3.5">Risk Status</th>
                <th className="pb-3.5">Assigned ASHA</th>
                <th className="pb-3.5 text-right">Follow-up Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {severeOverdue.map((p) => (
                <tr key={p.patient_id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4">
                    <p className="font-bold text-slate-900">{p.patient_name}</p>
                    <p className="text-[11px] text-slate-400">{p.age}y &bull; {p.gender}</p>
                  </td>
                  <td className="py-4 text-slate-700">
                    <span className="flex items-center gap-1 font-semibold">
                      <MapPin size={13} className="text-slate-400" />
                      {p.village}
                    </span>
                  </td>
                  <td className="py-4 capitalize font-semibold text-slate-800">
                    {t(p.condition)}
                  </td>
                  <td className="py-4 font-bold text-slate-900">
                    {p.systolic ? `BP: ${p.systolic}/${p.diastolic}` : ''}
                    {p.blood_sugar ? ` Sugar: ${p.blood_sugar}` : ''}
                  </td>
                  <td className="py-4">
                    <RiskBadge level={p.risk_level} size="sm" />
                  </td>
                  <td className="py-4 text-slate-700">
                    <p className="font-semibold text-slate-800">{p.asha_name}</p>
                    <p className="text-[10px] text-slate-400">{p.asha_phone}</p>
                  </td>
                  <td className="py-4 text-right">
                    {p.isSevere ? (
                      <span className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-sm">
                        Immediate Referral
                      </span>
                    ) : p.daysOverdue > 0 ? (
                      <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold">
                        {p.daysOverdue}d Overdue
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold">
                        Due: {p.scheduled_date}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
