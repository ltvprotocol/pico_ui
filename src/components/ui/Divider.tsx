interface DividerProps {
  className?: string;
}

export function Divider({ className = '' }: DividerProps) {
  return (
    <div className={`h-[1px] bg-gray-300 w-full ${className}`} />
  );
}
