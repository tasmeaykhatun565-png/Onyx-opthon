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
              <div className="flex bg-[var(--bg-secondary)] rounded-2xl p-1.5 w-full mb-6 border border-[var(--border-color)]">
                <button 
                  onClick={() => setTradeMode('TIMER')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300",
                    tradeMode === 'TIMER' 
                      ? "bg-[#22c55e] text-white shadow-lg shadow-green-500/20" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Timer
                </button>
                <button 
                  onClick={() => setTradeMode('CLOCK')}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300",
                    tradeMode === 'CLOCK' 
                      ? "bg-[#22c55e] text-white shadow-lg shadow-green-500/20" 
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  Clock
                </button>
              </div>

              <p className="text-[var(--text-secondary)] text-[11px] uppercase tracking-[0.1em] mb-6 font-bold opacity-60">
                {tradeMode === 'CLOCK' ? 'Trade will close at' : 'Trade will close after'}
              </p>

              {/* Dynamic Pickers based on Mode */}
              {tradeMode === 'TIMER' && (
                <div className="w-full grid grid-cols-3 gap-2.5 py-2 max-h-[320px] overflow-y-auto scrollbar-hide">
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
                        "py-3.5 rounded-xl font-bold text-xs border transition-all duration-200",
                        timerDuration === option.value 
                          ? "bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                          : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/30"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}

              {tradeMode === 'CLOCK' && (
                <div className="w-full grid grid-cols-2 gap-3 py-2 max-h-[320px] overflow-y-auto scrollbar-hide">
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
                            "flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group",
                            isSelected 
                              ? "bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e] shadow-[0_0_20px_rgba(34,197,94,0.1)]" 
                              : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/30"
                          )}
                        >
                          {isSelected && (
                            <div className="absolute top-0 right-0 w-6 h-6 bg-[#22c55e] rounded-bl-xl flex items-center justify-center">
                              <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 -mt-0.5" />
                            </div>
                          )}
                          <span className="font-bold text-base tracking-tight">{format(expTime, 'HH:mm:ss')}</span>
                          <span className={cn(
                            "text-[10px] mt-1 font-medium tracking-wider", 
                            isSelected ? "text-[#22c55e]/80" : "text-[var(--text-secondary)]"
                          )}>
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
            <div className="flex flex-col items-center py-4">
              <p className="text-[var(--text-secondary)] text-[11px] uppercase tracking-[0.1em] mb-6 font-bold opacity-60">
                Select Investment Amount
              </p>
              <div className="grid grid-cols-3 gap-2.5 w-full">
                {(currencySymbol === '৳' ? [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000] : [1, 5, 10, 20, 50, 100, 200, 500, 1000]).map(amt => (
                  <button 
                    key={amt}
                    onClick={() => {
                      onInvestmentChange(amt);
                      onClose();
                    }}
                    className={cn(
                      "py-3.5 rounded-xl font-bold text-xs border transition-all duration-200",
                      investment === amt 
                        ? "bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e] shadow-[0_0_15px_rgba(34,197,94,0.1)]" 
                        : "bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/30"
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
