import React from "react";
import ConnectWallet from "@/components/ConnectWallet";

interface LayoutProps {
    children: React.ReactNode;
    showContent: boolean;
}

export default function Layout({ children, showContent } : LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center">
      <div className="relative py-3 max-w-xl sm:mx-auto">
        <div className="relative px-4 py-4 bg-white mx-8 shadow rounded-3xl">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="еext-base text-gray-700">
                <ConnectWallet />
                {showContent && (children)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}