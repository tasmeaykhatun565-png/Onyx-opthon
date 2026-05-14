import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, X, Volume2, Palette, Check, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from './i18n';
import { useTheme } from './ThemeContext';

interface AppearanceSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AppearanceSheet({ isOpen, onClose }: AppearanceSheetProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [activeDropdown, setActiveDropdown] = useState<'sound' | 'theme' | null>(null);
  const [soundPack, setSoundPack] = useState('Default Pack');

  const soundPacks = ['Default Pack', 'Soft Pack', 'Action Pack'];
  const themes = ['Dark', 'Light', 'Classic', 'Purple Haze', 'Inspire'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-bg-primary flex flex-col"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-border-color">
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition">
              <ChevronLeft size={28} />
            </button>
            <h1 className="text-[17px] font-bold text-text-primary absolute left-1/2 -translate-x-1/2">{t('settings.appearance')}</h1>
            <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition">
              <X size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-8 space-y-4 no-scrollbar">
            {/* Sound Setting */}
            <div className="space-y-2">
              <div 
                onClick={() => setActiveDropdown(activeDropdown === 'sound' ? null : 'sound')}
                className={`bg-bg-secondary rounded-2xl p-4 flex items-center justify-between cursor-pointer transition active:scale-[0.99] ${activeDropdown === 'sound' ? 'ring-1 ring-[var(--color-border-color)]' : ''}`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="text-text-secondary shrink-0">
                    <Volume2 size={22} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-text-secondary text-[11px] font-bold uppercase tracking-widest leading-none mb-1">Sound</div>
                    <div className="text-text-primary text-[15px] font-medium leading-tight truncate">{soundPack}</div>
                  </div>
                </div>
                <div className={`text-text-secondary/30 transition-transform duration-300 ${activeDropdown === 'sound' ? 'rotate-180' : ''}`}>
                  <ChevronDown size={20} />
                </div>
              </div>
              
              <AnimatePresence>
                {activeDropdown === 'sound' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-bg-secondary border border-border-color rounded-2xl p-1.5 space-y-1">
                      {soundPacks.map((pack) => (
                        <button 
                          key={pack}
                          onClick={() => { setSoundPack(pack); setActiveDropdown(null); }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${soundPack === pack ? 'bg-[var(--color-text-primary)]/5 text-text-primary' : 'text-text-secondary hover:bg-[var(--color-text-primary)]/[0.02] hover:text-text-primary'}`}
                        >
                          <span className="text-[15px] font-medium">{pack}</span>
                          {soundPack === pack && <Check size={18} className="text-[var(--color-success)]" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Color Theme Setting */}
            <div className="space-y-2">
              <div 
                onClick={() => setActiveDropdown(activeDropdown === 'theme' ? null : 'theme')}
                className={`bg-bg-secondary rounded-2xl p-4 flex items-center justify-between cursor-pointer transition active:scale-[0.99] ${activeDropdown === 'theme' ? 'ring-1 ring-[var(--color-border-color)]' : ''}`}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="text-text-secondary shrink-0">
                    <ImageIcon size={22} />
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-text-secondary text-[11px] font-bold uppercase tracking-widest leading-none mb-1">Color theme</div>
                    <div className="text-text-primary text-[15px] font-medium leading-tight truncate">{theme}</div>
                  </div>
                </div>
                <div className={`text-text-secondary/30 transition-transform duration-300 ${activeDropdown === 'theme' ? 'rotate-180' : ''}`}>
                  <ChevronDown size={20} />
                </div>
              </div>

              <AnimatePresence>
                {activeDropdown === 'theme' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-bg-secondary border border-border-color rounded-2xl p-1.5 space-y-1">
                      {themes.map((t) => (
                        <button 
                          key={t}
                          onClick={() => { setTheme(t as any); setActiveDropdown(null); }}
                          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${theme === t ? 'bg-[var(--color-text-primary)]/5 text-text-primary' : 'text-text-secondary hover:bg-[var(--color-text-primary)]/[0.02] hover:text-text-primary'}`}
                        >
                          <span className="text-[15px] font-medium">{t}</span>
                          {theme === t && <Check size={18} className="text-[var(--color-success)]" strokeWidth={3} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
