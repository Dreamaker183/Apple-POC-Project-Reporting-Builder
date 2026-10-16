/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Languages } from 'lucide-react';
import { LOCALES, Locale } from '../../lib/i18n/dictionaries';
import { useLanguage } from '../../lib/i18n/LanguageContext';

interface Props {
  className?: string;
}

/** Language switcher: English, Traditional Chinese, Simplified Chinese. */
export const LanguageSwitcher: React.FC<Props> = ({ className }) => {
  const { locale, setLocale, t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [open ]);

  const pick = (next: Locale) => {
    setLocale(next);
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className={className}
        onClick={() => setOpen((v) => !v)}
        aria-label={t('lang.label')}
        title={t('lang.label')}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Languages className="w-[18px] h-[18px]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
            role="menu"
            aria-label={t('lang.label')}
            className="absolute right-0 top-11 z-50 w-52 rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-xl shadow-[var(--shadow-menu)] p-1.5 origin-top-right"
          >
            {LOCALES.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={locale === id}
                onClick={() => pick(id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${
                  locale === id ? 'bg-[#0071E3]/10 font-semibold text-[#1D1D1F]' : 'hover:bg-black/[0.04] text-[#1D1D1F]'
                }`}
              >
                <span className="flex-1">{t(labelKey)}</span>
                {locale === id && <Check className="w-4 h-4 text-[#0071E3]" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
