import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, X, Check } from 'lucide-react';
import { CURRENCIES } from './App';

interface CurrencySheetProps {
  isOpen: boolean;
  onClose: () => void;
  currency: typeof CURRENCIES[0];
  setCurrency: (c: typeof CURRENCIES[0]) => void;
}

export default function CurrencySheet({ isOpen, onClose, currency, setCurrency }: CurrencySheetProps) {
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
            <button onClick={onClose} className="text-text-secondary/70 hover:text-white transition">
              <ChevronLeft size={28} />
            </button>
            <h1 className="text-[17px] font-bold text-white absolute left-1/2 -translate-x-1/2">Currency</h1>
            <button onClick={onClose} className="text-text-secondary/70 hover:text-white transition">
              <X size={28} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 no-scrollbar">
            {CURRENCIES.map((c: any) => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c);
                  onClose(); 
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition active:scale-[0.99] group ${currency.code === c.code ? 'bg-bg-secondary' : 'hover:bg-white/[0.02]'}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl group-hover:scale-110 transition-transform duration-300">{c.flag}</span>
                  <span className={`text-[15px] font-medium transition-colors ${currency.code === c.code ? 'text-text-primary' : 'text-text-secondary/40 group-hover:text-text-secondary/70'}`}>
                    {c.name} ({c.code})
                  </span>
                </div>
                {currency.code === c.code && (
                  <Check size={20} className="text-[#00e676]" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
