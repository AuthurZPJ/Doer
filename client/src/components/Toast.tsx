import { useState, useEffect, useCallback } from 'react';

type ToastType = 'success' | 'error';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: ((toasts: ToastMessage[]) => void)[] = [];
let currentToasts: ToastMessage[] = [];

export function showToast(message: string, type: ToastType = 'success') {
  const id = ++toastId;
  currentToasts = [...currentToasts, { id, message, type }];
  listeners.forEach(fn => fn(currentToasts));
  setTimeout(() => {
    currentToasts = currentToasts.filter(t => t.id !== id);
    listeners.forEach(fn => fn(currentToasts));
  }, 3000);
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const listener = useCallback((t: ToastMessage[]) => setToasts([...t]), []);
  useEffect(() => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, [listener]);
  return toasts;
}

export function ToastContainer() {
  const toasts = useToast();
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-2 rounded shadow-lg text-white text-sm ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
