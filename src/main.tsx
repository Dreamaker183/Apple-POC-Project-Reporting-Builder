import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <LanguageProvider>
    <App />
  </LanguageProvider>
);
