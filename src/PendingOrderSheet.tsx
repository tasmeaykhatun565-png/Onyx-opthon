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
  const [profitability, setProfitability] = useState(70);
  const [inputValue, setInputValue] = useState(currentPrice.toFixed(5));
  const [direction, setDirection] = useState<'UP' | 'DOWN'>('UP');

  const handleNumberClick = (num: string) => {
    if (num === '.') {
      if (!inputValue.includes('.')) {
        setInputValue(prev => prev + '.');
      }
    } else {
      setInputValue(prev => {
        if (prev === '0') return num;
        return prev + num;
      });
    }
  };

  const handleDelete = () => {
    setInputValue(prev => prev.slice(0, -1) || '0');
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
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[#151515] rounded-t-[24px] overflow-hidden border-t border-white/10 pb-safe"
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 pb-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">Place an Order on {assetName}</h2>
              <HelpCircle size={20} className="text-white/40" />
            </div>

            <div className="px-6 pb-6">
              {/* Tabs */}
              <div className="flex border-b border-white/10 mb-6">
                <button 
                  onClick={() => setTab('PRICE')}
                  className={cn(
                    "flex-1 py-3 text-sm font-bold transition relative",
                    tab === 'PRICE' ? "text-[#22c55e]" : "text-white/40"
                  )}
                >
                  By Price
                  {tab === 'PRICE' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
                </button>
                <button 
                  onClick={() => setTab('TIME')}
                  className={cn(
                    "flex-1 py-3 text-sm font-bold transition relative",
                    tab === 'TIME' ? "text-[#22c55e]" : "text-white/40"
                  )}
                >
                  By Time
                  {tab === 'TIME' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
                </button>
              </div>

              {/* Profitability */}
              <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
                {profitabilityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setProfitability(opt.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition",
                      profitability === opt.value 
                        ? "bg-[#22c55e] text-black" 
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Input Field */}
              <div className="bg-white/5 border border-[#22c55e] rounded-2xl p-4 mb-4">
                <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">
                  {tab === 'PRICE' ? 'Opening Price' : 'Opening Time'}
                </div>
                <div className="text-2xl font-bold text-white">
                  {inputValue}
                </div>
              </div>

              <p className="text-[10px] text-white/40 mb-6 leading-relaxed">
                Your trade will be opened if the asset {tab === 'PRICE' ? 'price reaches' : 'time matches'} {inputValue} and the profitability is {profitability}% or higher
              </p>

              {/* Direction Selection */}
              <div className="flex gap-4 mb-6">
                <button 
                  onClick={() => setDirection('UP')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2",
                    direction === 'UP' ? "bg-[#22c55e] text-black" : "bg-white/5 text-white/60"
                  )}
                >
                  <ArrowUp size={18} />
                  Up
                </button>
                <button 
                  onClick={() => setDirection('DOWN')}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2",
                    direction === 'DOWN' ? "bg-[#ef4444] text-white" : "bg-white/5 text-white/60"
                  )}
                >
                  <ArrowDown size={18} />
                  Down
                </button>
              </div>

              {/* Numeric Keypad */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num.toString())}
                    className="h-12 flex items-center justify-center text-2xl font-medium text-white hover:bg-white/5 rounded-xl transition active:scale-90"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleDelete}
                  className="h-12 flex items-center justify-center text-white hover:bg-white/5 rounded-xl transition active:scale-90"
                >
                  <Delete size={24} />
                </button>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => {
                  onPlaceOrder({ type: tab, value: inputValue, minProfitability: profitability, direction });
                  onClose();
                }}
                className="w-full bg-[#22c55e] text-black font-black py-4 rounded-2xl text-lg hover:bg-[#1eb054] transition active:scale-[0.98] shadow-lg shadow-[#22c55e]/20"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
