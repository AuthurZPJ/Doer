import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function EmptyState({ message, onRetry }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500 fade-in">
      <p>{message ?? t('common.noData')}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-blue-500 dark:text-blue-400 hover:text-blue-700"
        >
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
