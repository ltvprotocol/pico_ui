import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
}

export default function Container({ children }: ContainerProps) {
  return (
    <div className="
      max-w-[1700px] h-full mx-auto px-12 md:px-10 lg:px-20 
      [@media(max-width:1500px)]:px-6 
      [@media(max-width:600px)]:px-3"
    >
      {children}
    </div>
  );
}
