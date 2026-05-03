import React, { useState } from 'react';
import { Search, Compass, BarChart2, X, TrendingUp, ChevronDown } from 'lucide-react';
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

export default function IndicatorSheet({ isOpen, onClose, onSelectIndicator, activeIndicators, initialTab = 'Indicators' }: IndicatorSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('Indicators');
  const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleApplySettings = () => {
    if (editingIndicator) {
      onSelectIndicator(editingIndicator);
      setEditingIndicator(null);
    }
  };

  const renderSection = (title: string, icon: React.ReactNode, items: { id: string, name: string }[]) => {
    const isExpanded = expandedSection === title;
    return (
      <div className="border-b border-white/5 last:border-0">
        <button
          onClick={() => toggleSection(title)}
          className="w-full flex items-center justify-between py-5 px-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-white/40">{icon}</div>
            <span className="text-[17px] font-bold text-white tracking-tight">{title}</span>
          </div>
          <ChevronDown size={18} className={cn("text-white/20 transition-transform duration-300", isExpanded && "rotate-180")} />
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
                  
                  // Professional Color Palette for indicators
                  const colors = [
                    'border-blue-500/20 text-blue-400 bg-blue-500/5',
                    'border-orange-500/20 text-orange-400 bg-orange-500/5',
                    'border-green-500/20 text-green-400 bg-green-500/5',
                    'border-purple-500/20 text-purple-400 bg-purple-500/5',
                    'border-cyan-500/20 text-cyan-400 bg-cyan-500/5',
                    'border-red-500/20 text-red-400 bg-red-500/5',
                  ];
                  const style = colors[idx % colors.length];

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (isActive) {
                          setEditingIndicator(existing);
                        } else {
                          const config: IndicatorConfig = {
                            id: item.id,
                            instanceId: `${item.id}_${Date.now()}`,
                            name: item.name,
                            params: item.id === 'SMA' || item.id === 'EMA' || item.id === 'RSI' ? { period: 10 } : 
                                    item.id === 'BollingerBands' ? { period: 20, stdDev: 2 } : {},
                            color: '#22c55e',
                            visible: true
                          };
                          setEditingIndicator(config);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] text-left",
                        isActive ? "bg-blue-600 border-blue-500 text-white" : cn("border-white/[0.03] bg-white/[0.02]", "hover:border-white/10 hover:bg-white/5")
                      )}
                    >
                      <div className="flex items-center gap-3">
                         <div className={cn("w-2 h-2 rounded-full", isActive ? "bg-white" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
                         <span className="text-[15px] font-bold">{item.name}</span>
                      </div>
                      {isActive ? (
                         <div className="bg-white/20 p-1.5 rounded-lg">
                           <X size={14} className="text-white" />
                         </div>
                      ) : (
                         <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronDown size={14} className="-rotate-90 text-white/40" />
                         </div>
                      )}
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

  const content = (
    <div className="flex flex-col h-full bg-[#1c1c1e] text-white border-r border-white/5 shadow-2xl relative overflow-hidden">
      {/* Settings Overlay */}
      <AnimatePresence>
        {editingIndicator && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50 bg-[#1c1c1e] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h3 className="text-lg font-bold">{editingIndicator.name} Settings</h3>
              <button onClick={() => setEditingIndicator(null)} className="text-white/40 hover:text-white"><X size={20} /></button>
            </div>
            
            <div className="flex-1 p-6 space-y-6">
              {/* Parameters Rendering */}
              {Object.keys(editingIndicator.params).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(editingIndicator.params).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-bold text-white/50 uppercase tracking-wider">{key}</label>
                      <input 
                        type="number"
                        value={value}
                        onChange={(e) => setEditingIndicator({
                          ...editingIndicator,
                          params: { ...editingIndicator.params, [key]: parseFloat(e.target.value) }
                        })}
                        className="w-full bg-[#2c2c2e] border border-white/5 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-white/30 text-sm">No adjustable parameters for this tool.</div>
              )}

              {/* Color Picker (Simplified) */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Line Color</label>
                <div className="flex flex-wrap gap-3">
                  {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#9C27B0', '#ffffff'].map(c => (
                    <button 
                      key={c}
                      onClick={() => setEditingIndicator({ ...editingIndicator, color: c })}
                      className={cn(
                        "w-8 h-8 rounded-full border-2 transition-transform active:scale-95",
                        editingIndicator.color === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => {
                  onSelectIndicator(editingIndicator);
                  setEditingIndicator(null);
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg active:scale-95"
              >
                Apply
              </button>
              {activeIndicators.some(i => i.instanceId === editingIndicator.instanceId) && (
                <button 
                  onClick={() => {
                    onSelectIndicator(editingIndicator, true); // Force remove
                    setEditingIndicator(null);
                  }}
                  className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-colors active:scale-95"
                >
                  Remove
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main List */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <h2 className="text-xl font-bold tracking-tight">Technical Analysis</h2>
        <button 
          onClick={onClose}
          className="text-white/40 hover:text-white transition-colors p-1"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-6 py-4">
        <div className="bg-[#2c2c2e] rounded-lg flex items-center gap-3 px-4 py-2.5 border border-white/5 focus-within:border-white/20 transition-all">
          <Search size={18} className="text-white/40" />
          <input 
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-white text-[14px] focus:outline-none w-full placeholder:text-white/30"
          />
        </div>
      </div>
      
      <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
        {renderSection('Indicators', <Compass size={18} />, TREND_INDICATORS)}
        {renderSection('Oscillators', <BarChart2 size={18} />, OSCILLATORS)}
        {renderSection('Strategies', <TrendingUp size={18} />, STRATEGIES)}
        
        <div className="px-2 py-8 text-white/30 text-[12px] leading-relaxed font-medium">
          All the features offered by the platform can be used for technical analysis. Traders make all trading decisions independently.
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Mode (Bottom Sheet) */}
      <div className="md:hidden">
        <BottomSheet isOpen={isOpen} onClose={onClose} className="h-[85vh] bg-[#1c1c1e]">
           {content}
        </BottomSheet>
      </div>

      {/* Desktop Mode (Sidebar) */}
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
