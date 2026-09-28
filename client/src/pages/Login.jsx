import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/i18nContext';
import { api } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.login(email, password);
      login(data.user, data.token);

      if (data.user.role === 'asha') {
        navigate('/asha/today');
      } else {
        navigate('/phc/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const data = await api.login(demoEmail, demoPassword);
      login(data.user, data.token);

      if (data.user.role === 'asha') {
        navigate('/asha/today');
      } else {
        navigate('/phc/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-saathi-900 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      {/* Language Switcher Bar at Top Right */}
      <div className="absolute top-4 right-4 flex gap-1 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10">
        {[
          { code: 'en', label: 'English' },
          { code: 'hi', label: 'हिंदी' },
          { code: 'kn', label: 'ಕನ್ನಡ' },
        ].map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
              lang === l.code ? 'bg-white text-saathi-900 shadow' : 'text-emerald-100 hover:bg-white/10'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-saathi-500 to-emerald-300 text-slate-950 shadow-xl shadow-saathi-500/20 mb-4">
          <HeartPulse size={34} className="stroke-[2.5]" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">{t('app_name')}</h2>
        <p className="mt-1 text-sm text-emerald-200/90 max-w-xs mx-auto">{t('app_tagline')}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/20">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@swasthya.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-saathi-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-saathi-600 to-emerald-600 hover:from-saathi-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-saathi-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span>Logging in...</span>
              ) : (
                <>
                  <span>{t('login')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              ⚡ Instant 1-Click Demo Login
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('asha.sunita@swasthya.org', 'password123')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-950 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    AS
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-950">Sunita Devi (ASHA Worker)</p>
                    <p className="text-[10px] text-emerald-700">Villages: Kumbalgodu & Doddabele</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('dr.sharma@swasthya.org', 'password123')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-950 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                    DR
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-950">Dr. Ramesh Sharma (PHC Officer)</p>
                    <p className="text-[10px] text-blue-700">Kengeri Primary Health Centre</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
