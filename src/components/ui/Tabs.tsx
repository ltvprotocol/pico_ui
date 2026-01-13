import { ActionType } from '@/types/actions';

interface TabItem<T> {
  value: T;
  label: string;
}

interface TabsPropsGeneric<T extends string> {
  activeTab: T;
  setActiveTab: React.Dispatch<React.SetStateAction<T>>;
  tabs: TabItem<T>[];
  isProcessing?: boolean;
  className?: string;
}

interface TabsPropsAction {
  activeTab: ActionType;
  setActiveTab: React.Dispatch<React.SetStateAction<ActionType>>;
  tabs?: never;
  isProcessing?: boolean;
  className?: string;
}

type TabsProps<T extends string = ActionType> = T extends ActionType
  ? TabsPropsAction
  : TabsPropsGeneric<T>;

export default function Tabs<T extends string = ActionType>({
  activeTab,
  setActiveTab,
  tabs,
  isProcessing,
  className,
}: TabsProps<T> | TabsPropsGeneric<T>) {
  const safeSetActiveTab = (tab: T) => {
    if (isProcessing && tab !== activeTab) return;
    setActiveTab(tab as any);
  };

  const tabClass = (tab: T) =>
    `flex-1 py-2 px-4 rounded-lg font-medium transition-colors focus:outline-none focus:ring-0 ${
      isProcessing && tab !== activeTab
        ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60 border-0'
        : activeTab === tab
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`;

  // If custom tabs are provided, use them
  if (tabs) {
    return (
      <div className={`${className ?? ''}`}>
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => safeSetActiveTab(tab.value as any)}
              className={tabClass(tab.value as T)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Default action tabs layout
  return (
    <div className={`${className ?? ''}`}>
      <div className="flex space-x-4 mb-3">
        <button onClick={() => safeSetActiveTab('deposit' as any)} className={tabClass('deposit' as T)}>
          Deposit
        </button>
        <button onClick={() => safeSetActiveTab('redeem' as any)} className={tabClass('redeem' as T)}>
          Redeem
        </button>
      </div>
      <div className="flex space-x-4">
        <button onClick={() => safeSetActiveTab('mint' as any)} className={tabClass('mint' as T)}>
          Mint
        </button>
        <button onClick={() => safeSetActiveTab('withdraw' as any)} className={tabClass('withdraw' as T)}>
          Withdraw
        </button>
      </div>
    </div>
  );
}
