import React, { useState } from 'react';
import { Search, Compass, BarChart2, X, TrendingUp, ChevronDown, Settings } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';

import { IndicatorConfig } from './types';
import { INDICATORS_LIST } from './constants';

interface IndicatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndicator: (indicator: IndicatorConfig, forceRemove?: boolean) => void;
  activeIndicators: IndicatorConfig[];
  initialTab?: string;
}

const TREND_INDICATORS = [
  { id: 'SMA', name: 'SMA' },
  { id: 'EMA', name: 'EMA' },
  { id: 'WMA', name: 'WMA' },
  { id: 'BollingerBands', name: 'Bollinger Bands' },
  { id: 'ParabolicSAR', name: 'Parabolic SAR' },
  { id: 'Volumes', name: 'Volumes' },
];

const OSCILLATORS = [
  { id: 'RSI', name: 'RSI' },
  { id: 'MACD', name: 'MACD' },
  { id: 'Stochastic', name: 'Stochastic' },
  { id: 'CCI', name: 'CCI' },
  { id: 'ATR', name: 'ATR' },
  { id: 'WilliamsR', name: 'Williams %R' },
  { id: 'AverageDirectionalIndex', name: 'ADX' },
  { id: 'Momentum', name: 'Momentum' },
  { id: 'AwesomeOscillator', name: 'Awesome Oscillator' },
  { id: 'RateOfChange', name: 'Rate Of Change' },
];

const STRATEGIES = [
  { id: 'JapanesePearl', name: 'Japanese Pearl' },
  { id: 'JapaneseTrend', name: 'Japanese Trend' },
  { id: 'Reflection', name: 'Reflection' },
  { id: 'RelativeStrengthLaw', name: 'Relative Strength Law' },
  { id: 'SlidingOnAverages', name: 'Sliding On Averages' },
  { id: 'AverageIntersection', name: 'Average Intersection' },
  { id: 'ChasingTheTrend', name: 'Chasing The Trend' },
  { id: 'SmartRSI15', name: 'Smart RSI 15' },
  { id: 'SmartRSI30', name: 'Smart RSI 30' },
  { id: 'SmartRSI60', name: 'Smart RSI 60' },
];


export function IndicatorSheetContent({ 
  onClose, 
  onSelectIndicator, 
  activeIndicators, 
  initialTab = 'Indicators' 
}: Omit<IndicatorSheetProps, 'isOpen'>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>(initialTab);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderSection = (title: string, icon: React.ReactNode, items: { id: string, name: string }[]) => {
    const isExpanded = expandedSection === title;
    return (
      <div className="border-b border-border-color last:border-0">
        <button
          onClick={() => toggleSection(title)}
          className="w-full flex items-center justify-between py-5 px-4 hover:bg-text-secondary/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-text-secondary">{icon}</div>
            <span className="text-[17px] font-bold text-text-primary tracking-tight">{title}</span>
          </div>
          <ChevronDown size={18} className={cn("text-text-secondary transition-transform duration-300", isExpanded && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pb-6 grid grid-cols-1 gap-2 px-4">
                {items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())).map((item, idx) => {
                  const existing = activeIndicators.find(i => i.id === item.id);
                  const isActive = !!existing;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isActive) {
                          onSelectIndicator(existing!, true);
                        } else {
                          const config: IndicatorConfig = {
                            id: item.id,
                            instanceId: `${item.id}_${Date.now()}`,
                            name: item.name,
                            params: item.id === 'SMA' || item.id === 'EMA' || item.id === 'RSI' ? { period: 10 } : 
                                    item.id === 'BollingerBands' ? { period: 20, stdDev: 2 } : 
                                    item.id === 'MACD' ? { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } : {},
                            color: '#22c55e',
                            visible: true
                          };
                          onSelectIndicator(config);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] text-left group",
                        isActive ? "bg-blue-600/10 border-blue-500/40 text-white" : "border-border-color bg-bg-primary hover:border-text-secondary/20"
                      )}
                    >
                      <div className="flex items-center gap-3">
                         <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" : "bg-bg-tertiary")} />
                         <span className={cn("text-[15px] font-bold transition-colors", isActive ? "text-white" : "text-text-primary group-hover:text-white")}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingIndicator(existing!);
                            }}
                            className="bg-white/10 p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                          >
                            <Settings size={18} className="text-white" />
                          </button>
                        )}
                        {!isActive && (
                          <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <ChevronDown size={14} className="-rotate-90 text-text-secondary" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary text-white relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border-color shrink-0">
        <h2 className="text-xl font-black tracking-tight">{editingIndicator ? "Settings" : "Indicators"}</h2>
        <button 
          onClick={editingIndicator ? () => setEditingIndicator(null) : onClose}
          className="text-text-secondary/40 hover:text-white transition-colors p-2 -mr-2"
        >
          {editingIndicator ? <ChevronDown className="rotate-90" size={20} /> : <X size={20} />}
        </button>
      </div>

      {/* Settings Overlay */}
      <AnimatePresence mode="wait">
        {editingIndicator ? (
          <motion.div 
            key="settings"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="mb-6">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] block mb-1">Active Tool</span>
                <h3 className="text-2xl font-black">{editingIndicator.name}</h3>
              </div>

              {Object.keys(editingIndicator.params).length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(editingIndicator.params).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                       <div className="flex justify-between items-center">
                         <label className="text-[11px] font-black text-text-secondary/50 uppercase tracking-widest">{key}</label>
                         <span className="text-xs font-bold text-blue-500">{value}</span>
                       </div>
                       <input 
                         type="range"
                         min="1"
                         max="100"
                         step="1"
                         value={value as number}
                         onChange={(e) => {
                           const newConfig = {
                             ...editingIndicator,
                             params: { ...editingIndicator.params, [key]: parseFloat(e.target.value) }
                           };
                           setEditingIndicator(newConfig);
                           onSelectIndicator(newConfig);
                         }}
                         className="w-full h-1.5 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-blue-500"
                       />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-text-secondary/30 text-sm italic">No parameters to adjust</div>
              )}

              <div className="space-y-3 pt-4">
                <label className="text-[11px] font-black text-text-secondary/50 uppercase tracking-widest block">Stroke Color</label>
                <div className="flex flex-wrap gap-3">
                  {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#9C27B0', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => {
                        const newConfig = { ...editingIndicator, color: c };
                        setEditingIndicator(newConfig);
                        onSelectIndicator(newConfig);
                      }}
                      className={cn(
                        "w-10 h-10 rounded-xl border-2 transition-all active:scale-90 flex items-center justify-center",
                        editingIndicator.color === c ? "border-white scale-110 shadow-lg shadow-black/50" : "border-transparent bg-white/5"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {editingIndicator.color === c && <div className="w-2 h-2 rounded-full bg-bg-secondary" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-border-color flex flex-col gap-3">
              <button 
                onClick={() => setEditingIndicator(null)}
                className="w-full py-4 bg-white text-black font-black rounded-2xl transition hover:bg-gray-100 active:scale-95 shadow-lg uppercase tracking-widest text-xs"
              >
                Apply & Back
              </button>
              {activeIndicators.some(i => i.instanceId === editingIndicator.instanceId) && (
                <button 
                  onClick={() => {
                    onSelectIndicator(editingIndicator, true); 
                    setEditingIndicator(null);
                  }}
                  className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black rounded-2xl transition active:scale-95 uppercase tracking-widest text-xs"
                >
                  Remove Tool
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="bg-bg-primary rounded-xl flex items-center gap-3 px-4 py-3 border border-border-color focus-within:border-blue-500/50 transition-all shadow-inner">
                <Search size={16} className="text-text-secondary" />
                <input 
                  type="text"
                  placeholder="Search tools"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-text-primary text-sm focus:outline-none w-full placeholder:text-text-secondary/50 font-medium"
                />
              </div>
            </div>
            
            <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
              {renderSection('Indicators', <Compass size={18} />, TREND_INDICATORS)}
              {renderSection('Oscillators', <BarChart2 size={18} />, OSCILLATORS)}
              {renderSection('Strategies', <TrendingUp size={18} />, STRATEGIES)}
              
              <div className="px-2 py-8 text-text-secondary/20 text-[10px] leading-relaxed font-black uppercase tracking-widest text-center">
                Platform analysis tools for professional traders
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IndicatorSheet({ isOpen, onClose, onSelectIndicator, activeIndicators, initialTab = 'Indicators' }: IndicatorSheetProps) {
  const content = (
    <IndicatorSheetContent 
      onClose={onClose}
      onSelectIndicator={onSelectIndicator}
      activeIndicators={activeIndicators}
      initialTab={initialTab}
    />
  );
  return (
    <>
      <div className="md:hidden">
        <BottomSheet isOpen={isOpen} onClose={onClose} className="h-[85vh] bg-bg-secondary">
           {content}
        </BottomSheet>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="hidden md:block h-full relative z-30"
          >
            {content}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
