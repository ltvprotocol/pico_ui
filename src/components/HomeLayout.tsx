import React from "react";
import Header from "@/components/Header";
import WelcomeMessage from "@/components/WelcomeMessage";

interface LayoutProps {
  children: React.ReactNode;
  showContent: boolean;
  showWelcome: boolean;
}

export default function HomeLayout({ children, showContent, showWelcome }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-6">
        {showContent ? (
          <div className="relative w-full mx-auto">
            {children}
          </div>
        ) : showWelcome ? (
          <WelcomeMessage />
        ) : null}
      </main >
    </div >
  );
}
