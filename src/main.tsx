import { lazy, Suspense } from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './lib/i18n/LanguageContext';
import './index.css';

const PocPresentation = lazy(() => import('./components/presentation/PocPresentation'));
const isPresentation = window.location.pathname.replace(/\/$/, '') === '/poc';

createRoot(document.getElementById('root')!).render(
  <LanguageProvider initialLocale={isPresentation ? 'en' : undefined}>
    {isPresentation ? <Suspense fallback={<div className="p-8 text-sm text-[#6E6E73]" role="status">Loading presentation…</div>}><PocPresentation /></Suspense> : <App />}
  </LanguageProvider>
);
