import { Loader } from "@/components/ui";

export const renderWithTransition = (content: React.ReactNode, isLoading: boolean, loaderClassName?: string) => (
  <div className="transition-opacity duration-200 ease-in-out">
    {isLoading ? <Loader className={loaderClassName} /> : content}
  </div>
);