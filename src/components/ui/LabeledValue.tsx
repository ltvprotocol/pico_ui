import { ReactNode } from 'react';

interface LabeledValueProps {
  label: string;
  value: ReactNode;
  subtitle?: ReactNode;
  className?: string;
}

export function LabeledValue({ label, value, subtitle, className }: LabeledValueProps) {
  return (
    <div className={className}>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-[2.5rem] font-normal text-gray-900 mb-0.5 leading-none">
        {value}
      </div>
      {subtitle && (
        <div className="text-[0.95rem] text-gray-500">
          {subtitle}
        </div>
      )}
    </div>
  );
}
