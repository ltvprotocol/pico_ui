interface TabItem<T> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  activeTab: T;
  setActiveTab: React.Dispatch<React.SetStateAction<T>> | ((tab: T) => void);
  tabs: TabItem<T>[];
  isProcessing?: boolean;
  className?: string;
}

export default function Tabs<T extends string>({
  activeTab,
  setActiveTab,
  tabs,
  isProcessing,
  className,
}: TabsProps<T>) {
  const safeSetActiveTab = (tab: T) => {
    if (isProcessing && tab !== activeTab) return;
    setActiveTab(tab);
  };

  const tabClass = (tab: T) =>
    `flex-1 py-2 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-0 ${isProcessing && tab !== activeTab
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 border-0'
      : activeTab === tab
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <div className={`${className ?? ''}`}>
      <div className={tabs.length === 4 ? "grid grid-cols-2 gap-2" : "flex space-x-2"}>
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => safeSetActiveTab(tab.value)}
            className={tabClass(tab.value)}
            disabled={isProcessing && tab.value !== activeTab}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
