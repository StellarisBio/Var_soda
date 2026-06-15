import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-4 flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${danger ? 'bg-red-100 dark:bg-red-900' : 'bg-cyan-50 dark:bg-cyan-900'}`}>
            <AlertTriangle size={18} className={danger ? 'text-red-600 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'} />
          </div>
          <div className="flex-1">
            {title && <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>}
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-cyan hover:bg-cyan-600'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
