import { ReactNode } from "react";

interface VaultStatProps {
  label: string;
  children: ReactNode;
  className?: string;
  valueClassName?: string;
}

export default function VaultStat({ label, children, className = "", valueClassName = "font-light text-gray-700" }: VaultStatProps) {
  return (
    <div className={`flex flex-col gap-2 w-fit ${className}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-[1rem] leading-none ${valueClassName}`}>
        {children}
      </span>
    </div>
  );
}
