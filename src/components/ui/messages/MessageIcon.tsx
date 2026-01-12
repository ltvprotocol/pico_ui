type MessageVariant = "error" | "warning" | "success" | "info";

const ICON_PATHS: Record<MessageVariant, React.ReactNode> = {
  error: (
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  ),
  warning: (
    <path d="M12 8v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.7 3.86a2 2 0 00-3.41 0z" />
  ),
  success: (
    <path d="M5 13l4 4L19 7" />
  ),
  info: (
    <path d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
  ),
};

interface MessageIconProps {
  variant: MessageVariant;
}

export function MessageIcon({ variant }: MessageIconProps) {
  const colorMap: Record<MessageVariant, string> = {
    error: "text-red-600",
    warning: "text-yellow-600",
    success: "text-green-600",
    info: "text-blue-600",
  };

  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 ${colorMap[variant]}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <g strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}>
        {ICON_PATHS[variant]}
      </g>
    </svg>
  );
}
