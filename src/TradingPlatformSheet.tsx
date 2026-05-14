import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, X, Shield, TrendingUp, Clock } from 'lucide-react';

import { useTranslation } from './i18n';

interface TradingPlatformSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ToggleItem = ({ label, subtitle, icon: Icon, checked, onChange }: { label: string, subtitle?: string, icon?: React.ElementType, checked: boolean, onChange: (checked: boolean) => void }) => (
  <div className="bg-bg-secondary rounded-2xl p-4 flex items-center justify-between cursor-pointer transition active:scale-[0.99]" onClick={() => onChange(!checked)}>
    <div className="flex items-center gap-4 overflow-hidden">
      {Icon && <div className="text-text-secondary/40 shrink-0"><Icon size={22} /></div>}
      <div className="overflow-hidden">
        <div className="text-white text-[15px] font-medium leading-tight truncate">{label}</div>
        {subtitle && <div className="text-text-secondary/40 text-[13px] leading-snug mt-0.5 line-clamp-2">{subtitle}</div>}
      </div>
    </div>
    <div className={`w-11 h-6 rounded-full relative shrink-0 transition-colors duration-200 ${checked ? 'bg-[#00e676]' : 'bg-bg-tertiary'}`}>
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${checked ? 'left-6' : 'left-1'}`}></div>
    </div>
  </div>
);

export default function TradingPlatformSheet({ isOpen, onClose }: TradingPlatformSheetProps) {
  const { t } = useTranslation();
  const [hiddenBalances, setHiddenBalances] = React.useState(false);
  const [oneClickTrade, setOneClickTrade] = React.useState(false);
  const [oneClickClose, setOneClickClose] = React.useState(false);
  const [flatMarketProtection, setFlatMarketProtection] = React.useState(false);
  const [tradeScaling, setTradeScaling] = React.useState(false);
  const [strikePrices, setStrikePrices] = React.useState(false);
  const [oneClickFlip, setOneClickFlip] = React.useState(false);

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
            <h1 className="text-[17px] font-bold text-white absolute left-1/2 -translate-x-1/2">{t('settings.trading_platform')}</h1>
            <button onClick={onClose} className="text-text-secondary/70 hover:text-white transition">
              <X size={28} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
            <section>
              <h2 className="text-text-secondary/40 text-[11px] font-bold uppercase tracking-widest mb-3 ml-2">Accounts</h2>
              <ToggleItem label="Hidden balances" subtitle="Hide your live account balances" checked={hiddenBalances} onChange={setHiddenBalances} />
            </section>

            <section>
              <h2 className="text-text-secondary/40 text-[11px] font-bold uppercase tracking-widest mb-3 ml-2">Trades</h2>
              <div className="space-y-2">
                <ToggleItem label="1-click trade" subtitle="Open trades without confirmation" checked={oneClickTrade} onChange={setOneClickTrade} />
                <ToggleItem label="1-click close" subtitle="Close trades without confirmation" checked={oneClickClose} onChange={setOneClickClose} />
              </div>
            </section>

            <section>
              <h2 className="text-text-secondary/40 text-[11px] font-bold uppercase tracking-widest mb-3 ml-2">Fixed Time</h2>
              <div className="space-y-2">
                <div className="bg-bg-secondary rounded-2xl p-4 transition active:scale-[0.99]" onClick={() => setFlatMarketProtection(!flatMarketProtection)}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-4">
                            <div className="text-text-secondary/50"><Shield size={22} /></div>
                            <div className="text-white text-[15px] font-medium leading-tight">Flat Market Protection</div>
                        </div>
                        <div className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-200 ${flatMarketProtection ? 'bg-[#00e676]' : 'bg-bg-tertiary'}`}>
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${flatMarketProtection ? 'left-6' : 'left-1'}`}></div>
                        </div>
                    </div>
                    <p className="text-text-secondary/40 text-[13px] leading-snug mb-3">Get the trade amount back with no loss or gain if opening and closing quotes differ by 1 tick (the last digit)</p>
                    <div className="flex items-center gap-1 text-[#00e676] text-[13px] font-semibold">
                      <Shield size={14} />
                      Learn More &gt;
                    </div>
                </div>
                <ToggleItem label="Trade Scaling" subtitle="Change the trade amount by multiplying and dividing its value" icon={TrendingUp} checked={tradeScaling} onChange={setTradeScaling} />
                <ToggleItem label="Strike prices" subtitle="Show strike prices on the chart" checked={strikePrices} onChange={setStrikePrices} />
                <ToggleItem label="1-click flip" subtitle="Flip trade direction without confirmation" icon={Clock} checked={oneClickFlip} onChange={setOneClickFlip} />
              </div>
            </section>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
