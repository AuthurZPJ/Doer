interface EmptyStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function EmptyState({ message = '暂无数据', onRetry }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-sm text-blue-500 hover:text-blue-700"
        >
          重试
        </button>
      )}
    </div>
  );
}
