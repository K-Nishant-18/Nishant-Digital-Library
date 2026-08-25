'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

let items: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();
let nextId = 1;

function emit() {
  const snapshot = [...items];
  listeners.forEach(l => l(snapshot));
}

export function dismissToast(id: number) {
  items = items.filter(t => t.id !== id);
  emit();
}

export function toast(message: string, kind: ToastKind = 'success') {
  const item = { id: nextId++, message, kind };
  items = [...items, item];
  emit();
  setTimeout(() => dismissToast(item.id), 4000);
}

const icons: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
  error: <XCircle size={16} className="text-red-400 shrink-0" />,
  info: <Info size={16} className="text-amber-400 shrink-0" />,
};

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2 pointer-events-none">
      {list.map(t => (
        <div
          key={t.id}
          role="status"
          className="toast-item pointer-events-auto flex items-center gap-2.5 bg-[#17191b]/95 backdrop-blur border border-white/10 rounded-xl pl-3.5 pr-2 py-3 text-xs text-slate-200 font-medium min-w-[240px] max-w-sm shadow-2xl"
        >
          {icons[t.kind]}
          <span className="leading-snug">{t.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
            className="ml-auto p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
