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
          <div className="relative py-3 w-full mx-auto px-4 [@media(min-width:450px)]:max-w-[430px]">
            <div className="relative px-4 py-4 bg-white shadow rounded-3xl">
              <div className="divide-y divide-gray-200">
                <div className="text-base text-gray-700">
                  {children}
                </div>
              </div>
            </div>
          </div>
        ) : showWelcome ? (
          <WelcomeMessage />
        ) : null}
      </main>
    </div>
  );
}
