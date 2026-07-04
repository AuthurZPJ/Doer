import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showToast } from './Toast';

interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
  className?: string;
}

export default function ConfirmButton({
  onConfirm,
  children,
  className = 'text-red-500 dark:text-red-400 hover:text-red-700 text-sm',
}: ConfirmButtonProps) {
  const { t } = useTranslation();
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
              showToast(t('common.operateFail'), 'error');
            }
          }}
          className="text-red-600 dark:text-red-400 hover:text-red-800 text-sm font-medium transition-base"
        >
          {t('common.confirm')}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 text-sm transition-base"
        >
          {t('common.cancel')}
        </button>
      </span>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={`${className} transition-base`}>
      {children ?? t('common.delete')}
    </button>
  );
}
