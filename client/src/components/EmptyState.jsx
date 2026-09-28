import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({ title, description, icon: Icon = Inbox, actionButton }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 my-4">
      <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
        <Icon size={36} />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-1">{title}</h4>
      {description && <p className="text-sm text-slate-500 max-w-md mb-5">{description}</p>}
      {actionButton}
    </div>
  );
}
