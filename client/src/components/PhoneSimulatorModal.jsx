import React from 'react';
import { X, MessageSquare, PhoneCall, CheckCheck, Smartphone } from 'lucide-react';
import { useI18n } from '../i18n/i18nContext';

export default function PhoneSimulatorModal({ isOpen, onClose, reminder }) {
  const { t } = useI18n();

  if (!isOpen || !reminder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 rounded-[40px] p-4 max-w-sm w-full shadow-2xl border-4 border-slate-700 relative text-white flex flex-col items-center">
        {/* Phone Notch & Speaker */}
        <div className="w-28 h-5 bg-slate-800 rounded-b-2xl mb-4 flex items-center justify-center gap-2">
          <div className="w-8 h-1 bg-slate-700 rounded-full"></div>
          <div className="w-2 h-2 rounded-full bg-slate-700"></div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Phone Screen */}
        <div className="w-full bg-slate-950 rounded-[28px] overflow-hidden border border-slate-800 flex flex-col h-[520px]">
          {/* Phone Header / Status bar */}
          <div className="px-4 py-2 bg-slate-900/90 flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800">
            <span>09:41 AM</span>
            <div className="flex items-center gap-1.5 font-bold">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>

          {/* Messaging App Bar */}
          <div className="px-4 py-3 bg-saathi-800 flex items-center gap-3 border-b border-saathi-900">
            <div className="w-9 h-9 rounded-full bg-saathi-600 text-white flex items-center justify-center font-bold text-sm">
              SS
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white">Govt Health Service (NHM)</h4>
              <p className="text-[10px] text-emerald-200">Verified Sender &bull; SwasthyaSaathi</p>
            </div>
            {reminder.channel === 'ivr' ? (
              <PhoneCall size={18} className="text-emerald-300" />
            ) : (
              <MessageSquare size={18} className="text-emerald-300" />
            )}
          </div>

          {/* Chat / SMS Area */}
          <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-900 flex flex-col justify-end">
            <div className="text-center">
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400">
                Today, {new Date(reminder.sent_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Message Bubble */}
            <div className="self-start max-w-[90%] bg-emerald-950 border border-emerald-800/60 rounded-2xl rounded-tl-sm p-3.5 shadow-md">
              <p className="text-xs text-emerald-100 font-medium leading-relaxed whitespace-pre-wrap">
                {reminder.message}
              </p>
              <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400/80 pt-1 border-t border-emerald-900/50">
                <span className="uppercase font-semibold tracking-wider">
                  {reminder.channel === 'ivr' ? 'IVR Voice Call' : 'SMS Alert'} ({reminder.language || 'hi'})
                </span>
                <span className="flex items-center gap-0.5">
                  <CheckCheck size={13} className="text-emerald-400" />
                  Delivered
                </span>
              </div>
            </div>

            {/* Patient Context Tag */}
            <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/50 text-[11px] text-slate-300">
              <p className="font-semibold text-white">{reminder.patient_name || 'Patient'}</p>
              <p className="text-slate-400 text-[10px]">Recipient: {reminder.patient_phone || '+91 9845X XXXXX'}</p>
            </div>
          </div>

          {/* Simulated Input Area */}
          <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
            <div className="flex-1 bg-slate-800 rounded-full px-3 py-1.5 text-[11px] text-slate-500">
              Automated reminder stream
            </div>
          </div>
        </div>

        {/* Home Indicator Bar */}
        <div className="w-32 h-1 bg-slate-600 rounded-full mt-3"></div>
      </div>
    </div>
  );
}
