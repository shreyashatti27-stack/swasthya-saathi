import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  CalendarCheck,
  UserPlus,
  Users,
  Bell,
  BarChart3,
  LogOut,
  Menu,
  X,
  Globe,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/i18nContext';

export default function Navbar() {
  const { user, logout, isAsha, isPhcOfficer } = useAuth();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = isAsha
    ? [
        { path: '/asha/today', label: t('todays_visits'), icon: CalendarCheck },
        { path: '/asha/add-patient', label: t('add_patient'), icon: UserPlus },
        { path: '/asha/patients', label: t('my_patients'), icon: Users },
        { path: '/asha/reminders', label: t('reminders_log'), icon: Bell },
      ]
    : [
        { path: '/phc/dashboard', label: t('phc_dashboard'), icon: BarChart3 },
      ];

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to={isAsha ? '/asha/today' : '/phc/dashboard'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-saathi-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-saathi-500/20 group-hover:scale-105 transition-transform">
                <HeartPulse size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-900 block leading-tight">
                  {t('app_name')}
                </span>
                <span className="text-[10px] font-bold text-saathi-700 block tracking-wide uppercase">
                  {isAsha ? 'ASHA Sathi' : 'PHC Officer'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-saathi-50 text-saathi-700 shadow-sm border border-saathi-200/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-saathi-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Language Selector, User Badge, Logout */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Globe size={14} className="text-slate-400 ml-1.5 mr-1" />
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                    lang === l.code
                      ? 'bg-white text-saathi-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name}</p>
                <p className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">
                  {user?.phc_name}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-saathi-100 text-saathi-800 font-black text-xs flex items-center justify-center border border-saathi-200">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title={t('logout')}
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg">
          {/* User info on mobile */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.phc_name}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-saathi-100 text-saathi-800 uppercase">
              {user?.role}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-bold transition-colors ${
                    isActive
                      ? 'bg-saathi-50 text-saathi-700 border border-saathi-200/70'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-saathi-600' : 'text-slate-400'} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Mobile Language Switcher */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">{t('pref_lang')}:</span>
            <div className="flex gap-1">
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                    lang === l.code
                      ? 'bg-saathi-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 mt-2 py-2.5 rounded-xl text-rose-600 bg-rose-50 font-bold text-sm"
          >
            <LogOut size={18} />
            <span>{t('logout')}</span>
          </button>
        </div>
      )}
    </header>
  );
}
