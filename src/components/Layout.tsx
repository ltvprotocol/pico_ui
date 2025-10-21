import React from "react";
import Header from "@/components/Header";

interface LayoutProps {
  children: React.ReactNode;
  showContent: boolean;
}

export default function Layout({ children, showContent }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-6">
        {showContent && (
          <div className="relative py-3 max-w-xl [@media(min-width:450px)]:mx-auto">
            <div className="
              relative
              [@media(max-width:450px)]:min-w-0
              [@media(max-width:450px)]:w-[calc(100% - 30px)]
              [@media(max-width:450px)]:m-[15px]
              min-w-[411.75px]
            ">
              <div className="max-w-md mx-auto">
                <div className="divide-y divide-gray-200">
                  <div className="text-base text-gray-700">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
