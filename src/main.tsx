import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AppContextProvider, VaultContextProvider } from '@/contexts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppContextProvider>
      <VaultContextProvider>
        <App />
      </VaultContextProvider>
    </AppContextProvider>
  </React.StrictMode>,
);