interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-rose-500/20 border border-rose-500/50 p-3 text-sm text-rose-200">
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-3 text-rose-400 hover:text-rose-100 font-bold text-base cursor-pointer"
        >
          ×
        </button>
      )}
    </div>
  );
}
