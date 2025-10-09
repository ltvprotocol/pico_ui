import React from 'react';
import { TokenType } from '@/types/actions';

type SelectTokenProps = {
  label: string;
  borrow: string;
  collateral: string;
  selected: string;
  onSelect: (selected: string) => void;
};

export const SelectToken: React.FC<SelectTokenProps> = ({
  label,
  borrow,
  collateral,
  selected,
  onSelect,
}) => {
  const tabClass = (tab: TokenType) =>
  `flex-1 py-2 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-0 ${
    selected === tab
      ? 'bg-indigo-600 text-white'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;
  
  return (
    <>
      <div className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </div>
      <div className="flex space-x-4 mb-3">
        <button onClick={() => onSelect('borrow')} className={tabClass('borrow')}>
          {borrow}
        </button>
        <button onClick={() => onSelect('collateral')} className={tabClass('collateral')}>
          {collateral}
        </button>
      </div>
    </>
  );
};
