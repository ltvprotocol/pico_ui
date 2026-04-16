interface ApyStatProps {
  title: string;
  value: string;
  isError?: boolean;
}

export function ApyStat({ title, value, isError = false }: ApyStatProps) {
  return (
    <div className="flex gap-2 flex-col">
      <div className="text-sm text-gray-500 mb-1 font-normal">{title}</div>
      <div className={`text-3xl md:text-[2.5rem] font-light tracking-tight ${isError ? 'text-red-500 italic' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  );
}
