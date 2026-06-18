import { useI18n } from '@/hooks/useI18n';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warn/10 text-warn-dark dark:bg-warn/10 dark:text-warn-light',
  approved: 'bg-pos/10 text-pos-dark dark:bg-pos/10 dark:text-pos-light',
  rejected: 'bg-neg/10 text-neg-dark dark:bg-neg/10 dark:text-neg-light',
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${style}`}>
      {t(`statusBadge.${status}`) !== `statusBadge.${status}` ? t(`statusBadge.${status}`) : status}
    </span>
  );
}
