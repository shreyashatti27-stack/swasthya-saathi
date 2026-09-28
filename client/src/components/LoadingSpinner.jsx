import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', size = 32 }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500">
      <Loader2 size={size} className="animate-spin text-saathi-600 mb-3" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
