import { useState } from 'react';
import { showToast } from './Toast';

interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  className?: string;
}

export default function ConfirmButton({
  onConfirm,
  children = '删除',
  className = 'text-red-500 dark:text-red-400 hover:text-red-700 text-sm',
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="inline-flex gap-1">
        <button
          onClick={async () => {
            try {
              await onConfirm();
              setConfirming(false);
            } catch {
              showToast('操作失败', 'error');
            }
          }}
          className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm font-medium transition-base"
        >
          确认
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm transition-base"
        >
          取消
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={`${className} transition-base`}>
      {children}
    </button>
  );
}
