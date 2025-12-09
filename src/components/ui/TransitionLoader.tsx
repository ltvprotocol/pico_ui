import { Loader } from "@/components/ui";
import { ReactNode } from "react";

interface TransitionLoaderProps {
  isLoading: boolean;
  children: ReactNode;
  loaderClassName?: string;
  className?: string;
  isFailedToLoad?: boolean;
}

export const TransitionLoader = ({ 
  isLoading, 
  children, 
  loaderClassName,
  className = "",
  isFailedToLoad = false
}: TransitionLoaderProps) => {
  if (isFailedToLoad) {
    return <span className="text-red-500 italic">Failed to load</span>
  }
 
  return (
    <div className={`transition-opacity duration-200 ease-in-out ${className}`}>
      {isLoading ? <Loader className={loaderClassName} /> : children}
    </div>
  );
};
