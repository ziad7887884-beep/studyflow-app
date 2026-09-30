import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AppProvider } from '@/context/AppContext';
import { TimerProvider } from '@/context/TimerContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <TimerProvider>
        <App />
      </TimerProvider>
    </AppProvider>
  </StrictMode>
);
