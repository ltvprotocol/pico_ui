interface LoaderProps {
  className?: string;
}

export function Loader({ className }: LoaderProps) {
  return (
    <div className={`h-4 w-8 inline-block bg-gray-200 rounded animate-pulse ${className}`} />
  );
}
