import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Delete, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from './utils';

interface PendingOrderSheetProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  currentPrice: number;
  onPlaceOrder: (order: {
    type: 'PRICE' | 'TIME';
    value: string;
    minProfitability: number;
    direction: 'UP' | 'DOWN';
  }) => void;
}

export default function PendingOrderSheet({ 
  isOpen, 
  onClose, 
  assetName, 
  currentPrice,
  onPlaceOrder 
}: PendingOrderSheetProps) {
  const [tab, setTab] = useState<'PRICE' | 'TIME'>('PRICE');
  const [profitability, setProfitability] = useState(0);
  const [inputValue, setInputValue] = useState(currentPrice.toFixed(5));
  const [direction, setDirection] = useState<'UP' | 'DOWN'>('UP');

  const handleNumberClick = (num: string) => {
    setInputValue(prev => {
      if (prev === '0' && num !== '.') return num;
      if (num === '.' && prev.includes('.')) return prev;
      return prev + num;
    });
  };

  const handleDelete = () => {
    setInputValue(prev => prev.slice(0, -1) || '0');
  };

  const handleTabChange = (newTab: 'PRICE' | 'TIME') => {
    setTab(newTab);
    if (newTab === 'PRICE') {
      setInputValue(currentPrice.toFixed(5));
    } else {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setInputValue(`${hours}:${minutes}`);
    }
  };

  const profitabilityOptions = [
    { label: 'Any Profitability', value: 0 },
    { label: 'from 70%', value: 70 },
    { label: 'from 80%', value: 80 },
    { label: 'from 90%', value: 90 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="relative bg-[#111214] rounded-t-[32px] overflow-hidden border-t border-white/5 pb-safe max-h-[90vh]"
          >
            <div className="flex justify-center pt-3">
              <div className="w-10 h-1 bg-white/10 rounded-full" />
            </div>

            <div className="p-5 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">Place an Order on {assetName}</h2>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40"
              >
                <HelpCircle size={18} />
              </button>
            </div>

            <div className="px-5 pb-6">
              {/* Tabs */}
              <div className="flex border-b border-white/5 mb-5">
                <button 
                  onClick={() => handleTabChange('PRICE')}
                  className={cn(
                    "flex-1 py-3 text-[15px] font-bold transition relative",
                    tab === 'PRICE' ? "text-[#a3ff12]" : "text-white/40"
                  )}
                >
                  By Price
                  {tab === 'PRICE' && <motion.div layoutId="tab-underline" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#a3ff12]" />}
                </button>
                <button 
                  onClick={() => handleTabChange('TIME')}
                  className={cn(
                    "flex-1 py-3 text-[15px] font-bold transition relative",
                    tab === 'TIME' ? "text-[#a3ff12]" : "text-white/40"
                  )}
                >
                  By Time
                  {tab === 'TIME' && <motion.div layoutId="tab-underline" className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#a3ff12]" />}
                </button>
              </div>

              {/* Profitability Scroll */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {profitabilityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setProfitability(opt.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all",
                      profitability === opt.value 
                        ? "bg-[#a3ff12] text-black" 
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/5"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Input Field Display */}
              <div className="mt-2 bg-white/[0.02] border border-[#a3ff12] rounded-2xl p-4 mb-4 shadow-[0_0_20px_rgba(163,255,18,0.05)]">
                <div className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">
                  {tab === 'PRICE' ? 'Opening Price' : 'Opening Time'}
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  {inputValue}
                </div>
              </div>

              <p className="text-[11px] text-white/40 mb-5 leading-tight px-1">
                Your trade will be opened if the asset {tab === 'PRICE' ? 'price reaches' : 'time matches'} <span className="text-white font-bold">{inputValue}</span>
              </p>

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-y-2 gap-x-6 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num.toString())}
                    className="h-12 flex items-center justify-center text-2xl font-medium text-white/90 active:scale-75 transition-all"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleDelete}
                  className="h-12 flex items-center justify-center text-white/60 active:scale-75 transition-all"
                >
                  <Delete size={24} strokeWidth={1.5} />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-6">
                <button 
                  onClick={() => setDirection('UP')}
                  className={cn(
                    "flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    direction === 'UP' ? "bg-[#22c55e] text-white shadow-[0_4px_15px_rgba(34,197,94,0.3)]" : "bg-white/5 text-white/40 border border-white/5"
                  )}
                >
                  <ArrowUp size={18} strokeWidth={3} />
                  Up
                </button>
                <button 
                  onClick={() => setDirection('DOWN')}
                  className={cn(
                    "flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    direction === 'DOWN' ? "bg-[#ff4d4d] text-white shadow-[0_4px_15px_rgba(255,77,77,0.3)]" : "bg-white/5 text-white/40 border border-white/5"
                  )}
                >
                  <ArrowDown size={18} strokeWidth={3} />
                  Down
                </button>
              </div>

              {/* Save Button */}
              <button
                onClick={() => {
                  onPlaceOrder({ 
                    type: tab, 
                    value: inputValue, 
                    minProfitability: profitability, 
                    direction 
                  });
                  onClose();
                }}
                className="w-full bg-[#a3ff12] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#92e610] transition-all active:scale-[0.98] shadow-lg shadow-[#a3ff12]/20"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
