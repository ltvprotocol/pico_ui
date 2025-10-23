import React from "react";
import Header from "@/components/Header";

interface LayoutProps {
  children: React.ReactNode;
  showContent: boolean;
}

export default function VaultLayout({ children, showContent }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-6">
        {showContent && (
          <div className="relative py-3 w-full max-w-[910px] mx-auto px-4">
            <div className="relative w-full px-4 py-4 bg-white shadow rounded-3xl">
              <div className="divide-y divide-gray-200">
                <div className="text-base text-gray-700">
                  {children}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}