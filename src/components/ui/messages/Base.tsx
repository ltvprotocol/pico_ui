interface MessageBaseProps {
  text: string;
  icon: React.ReactNode;
  className?: string;
}

export function MessageBase({ text, icon, className = "" }: MessageBaseProps) {
  return (
    <div className={`p-3 rounded-lg text-sm ${className}`}>
      <div className="flex items-center space-x-2">
        {icon}
        <span>{text}</span>
      </div>
    </div>
  );
}
