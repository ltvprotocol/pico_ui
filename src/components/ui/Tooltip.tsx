import { ReactNode } from "react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  isVisible: boolean;
}

export function Tooltip({ children, content, isVisible }: TooltipProps) {
  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className="
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 
          bg-white text-black text-sm rounded-lg shadow-lg border border-gray-200 
          whitespace-nowrap z-[9999]
        ">
          {content}
          <div className="
            absolute top-full left-1/2 transform -translate-x-1/2 
            border-4 border-transparent border-t-white
          "></div>
        </div>
      )}
    </div>
  );
};
