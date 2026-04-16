import { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  suffix?: ReactNode;
  className?: string;
}

export function InfoRow({
  label,
  value,
  suffix,
  className
}: InfoRowProps) {
  return (
    <div className={`text-[0.95rem] text-gray-500 ${className || ''}`}>
      <span
        className="text-gray-900 font-medium mr-1"
      >
        {label}:
      </span>
      {value} {suffix && <span className='text-gray-600'>{suffix}</span>}
    </div>
  );
}
