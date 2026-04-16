interface DescriptionBlockProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function DescriptionBlock({ title, children, className = '' }: DescriptionBlockProps) {
  return (
    <div className={className}>
      <div className="text-[0.85rem] text-gray-900 mb-1 font-medium">{title}</div>
      <p className="text-sm text-gray-700 block">
        {children}
      </p>
    </div>
  );
}
