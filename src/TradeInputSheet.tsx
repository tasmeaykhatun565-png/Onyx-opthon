import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import BottomSheet from './BottomSheet';
import { cn } from './utils';

interface TradeInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  tradeMode: 'TIMER' | 'CLOCK';
  setTradeMode: (mode: 'TIMER' | 'CLOCK') => void;
  clockOffset: number;
  setClockOffset: (offset: number) => void;
  timerDuration: number;
  setTimerDuration: (duration: number) => void;
  expirationTime: number;
  investment: number;
  onInvestmentChange: (amount: number) => void;
  currentPrice: number;
  currencySymbol: string;
}

type Tab = 'DURATION' | 'AMOUNT' | 'STRIKE_PRICES';

export default function TradeInputSheet({ 
  isOpen, 
  onClose, 
  tradeMode,
  setTradeMode,
  clockOffset,
  setClockOffset,
  timerDuration,
  setTimerDuration,
  expirationTime,
  investment,
  onInvestmentChange,
  currentPrice,
  currencySymbol
}: TradeInputSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('DURATION');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} className="bg-[var(--bg-primary)]">
      <div className="flex flex-col h-[550px]">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border-color)] px-4">
          <button 
            onClick={() => setActiveTab('DURATION')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-all relative",
              activeTab === 'DURATION' ? "text-[#22c55e]" : "text-[var(--text-secondary)]"
            )}
          >
            Duration
            {activeTab === 'DURATION' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('AMOUNT')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-all relative flex flex-col items-center",
              activeTab === 'AMOUNT' ? "text-[#22c55e]" : "text-[var(--text-secondary)]"
            )}
          >
            <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-0.5">Amount</span>
            <span>{currencySymbol}{investment}</span>
            {activeTab === 'AMOUNT' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('STRIKE_PRICES')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-all relative flex flex-col items-center",
              activeTab === 'STRIKE_PRICES' ? "text-[#22c55e]" : "text-[var(--text-secondary)]"
            )}
          >
            <span className="text-[10px] text-[var(--text-secondary)] font-medium mb-0.5">Strike prices</span>
            <span>{currentPrice.toFixed(5)}</span>
            {activeTab === 'STRIKE_PRICES' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'DURATION' && (
            <div className="flex flex-col items-center">
              {/* Mode Toggle */}
              <div className="flex bg-[var(--bg-secondary)] rounded-xl p-1 w-full mb-6">
                <button 
                  onClick={() => setTradeMode('TIMER')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-bold transition",
                    tradeMode === 'TIMER' ? "bg-[#a3ff33] text-black" : "text-[var(--text-secondary)]"
                  )}
                >
                  Timer
                </button>
                <button 
                  onClick={() => setTradeMode('CLOCK')}
                  className={cn(
                    "flex-1 py-2.5 rounded-lg text-sm font-bold transition",
                    tradeMode === 'CLOCK' ? "bg-[#a3ff33] text-black" : "text-[var(--text-secondary)]"
                  )}
                >
                  Clock
                </button>
              </div>

              <p className="text-[var(--text-secondary)] text-sm mb-8 font-medium">
                {tradeMode === 'CLOCK' ? 'Trade will close at' : 'Trade will close after'}
              </p>

              {/* Dynamic Pickers based on Mode */}
              {tradeMode === 'TIMER' && (
                <div className="w-full grid grid-cols-3 gap-3 py-4 max-h-[300px] overflow-y-auto scrollbar-hide">
                  {[
                    { label: '1 min', value: 60 },
                    { label: '2 min', value: 120 },
                    { label: '3 min', value: 180 },
                    { label: '4 min', value: 240 },
                    { label: '5 min', value: 300 },
                    { label: '10 min', value: 600 },
                    { label: '15 min', value: 900 },
                    { label: '30 min', value: 1800 },
                    { label: '1 hour', value: 3600 },
                    { label: '2 hours', value: 7200 },
                    { label: '4 hours', value: 14400 },
                    { label: '8 hours', value: 28800 }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTimerDuration(option.value);
                        onClose();
                      }}
                      className={cn(
                        "py-3 rounded-xl font-bold border transition",
                        timerDuration === option.value 
                          ? "bg-[#a3ff33] border-[#a3ff33] text-black" 
                          : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#a3ff33]/50"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {tradeMode === 'CLOCK' && (
                <div className="w-full grid grid-cols-2 gap-3 py-4 max-h-[300px] overflow-y-auto scrollbar-hide">
                  {(() => {
                    const now = currentTime;
                    const msToNextMinute = 60000 - (now % 60000);
                    const nextClose = msToNextMinute < 30000 ? now + msToNextMinute + 60000 : now + msToNextMinute;
                    
                    const offsets = [1, 2, 3, 4, 5, 10, 15, 30, 45, 60];
                    
                    return offsets.map(offset => {
                      const expTime = nextClose + (offset - 1) * 60000;
                      const isSelected = expirationTime === expTime;
                      const remaining = Math.max(0, expTime - now);
                      const m = Math.floor(remaining / 60000);
                      const s = Math.floor((remaining % 60000) / 1000);
                      
                      return (
                        <button
                          key={offset}
                          onClick={() => {
                            setClockOffset(offset);
                            onClose();
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center py-3 rounded-xl border transition",
                            isSelected 
                              ? "bg-[#a3ff33] border-[#a3ff33] text-black" 
                              : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#a3ff33]/50"
                          )}
                        >
                          <span className="font-bold text-lg">{format(expTime, 'HH:mm:ss')}</span>
                          <span className={cn("text-xs mt-1", isSelected ? "text-black/70" : "text-[var(--text-secondary)]")}>
                            {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
                          </span>
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'AMOUNT' && (
            <div className="flex flex-col items-center py-8">
              <p className="text-[var(--text-secondary)] mb-4">Select Investment Amount</p>
              <div className="grid grid-cols-3 gap-3 w-full">
                {(currencySymbol === '৳' ? [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000] : [1, 5, 10, 20, 50, 100, 200, 500, 1000]).map(amt => (
                  <button 
                    key={amt}
                    onClick={() => {
                      onInvestmentChange(amt);
                      onClose();
                    }}
                    className={cn(
                      "py-3 rounded-xl font-bold border transition",
                      investment === amt ? "bg-[#22c55e] border-[#22c55e] text-white" : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]"
                    )}
                  >
                    {currencySymbol}{amt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
