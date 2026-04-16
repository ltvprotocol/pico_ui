import { useState } from 'react';

interface DropdownProps {
  title: string;
  isOpen?: boolean;
  children: React.ReactNode;
}

export function Dropdown({ title, isOpen: defaultOpen = false, children }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="relative rounded-lg bg-white mb-4 shadow-sm border border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gray-100 flex items-center justify-between p-3 text-left transition-colors rounded-lg focus:outline-none focus:ring-0"
      >
        <span className="text-lg font-medium text-gray-900">{title}</span>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={
          `transition-all duration-200 overflow-hidden 
          ${isOpen ?
            'max-h-[2000px] opacity-100 p-4 md:p-6' :
            'max-h-0 opacity-0 pb-0'}`
        }
      >
        {children}
      </div>
    </div>
  );
}
