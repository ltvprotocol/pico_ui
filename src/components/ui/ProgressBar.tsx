interface ProgressBarProps {
  percentage: number;
  className?: string;
}

export function ProgressBar({ percentage, className = '' }: ProgressBarProps) {
  return (
    <div className={`flex flex-col flex-grow w-full ${className}`}>
      <div className="h-3 bg-gray-200 rounded-full w-full overflow-hidden">
        <div
          className="h-full rounded-full bg-[#3434E3] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}
