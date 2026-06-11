const ACMG_COLORS: Record<string, string> = {
  'Pathogenic': 'bg-acmg-pathogenic text-white',
  'Likely Pathogenic': 'bg-acmg-likelyPathogenic text-white',
  'VUS': 'bg-acmg-vus text-white',
  'Likely Benign': 'bg-acmg-likelyBenign text-white',
  'Benign': 'bg-acmg-benign text-white',
};

interface ACMGBadgeProps {
  classification: string;
  size?: 'sm' | 'md';
}

export default function ACMGBadge({ classification, size = 'sm' }: ACMGBadgeProps) {
  const colorClass = ACMG_COLORS[classification] || 'bg-gray-400 text-white';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass}`}>
      {classification}
    </span>
  );
}
