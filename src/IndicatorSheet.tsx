import React, { useState } from 'react';
import { Search, Lock, Compass, BarChart2, Pencil, Percent, Menu, Minus, Equal, ArrowUpRight, Square, TrendingUp, HelpCircle } from 'lucide-react';
import BottomSheet from './BottomSheet';
import { cn } from './utils';

import { IndicatorConfig } from './types';

interface IndicatorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndicator: (indicator: IndicatorConfig) => void;
  activeIndicators: IndicatorConfig[];
}

const INDICATORS_LIST = [
  { id: 'BollingerBands', name: 'Bollinger Bands' },
  { id: 'EMA', name: 'EMA' },
  { id: 'ParabolicSAR', name: 'Parabolic SAR' },
  { id: 'SMA', name: 'SMA' },
  { id: 'Volumes', name: 'Volumes' },
  { id: 'WMA', name: 'WMA' },
  { id: 'BillWilliams', name: "Bill Williams' fractals", locked: true },
  { id: 'PivotPoints', name: 'Pivot Points', locked: true },
];

const OSCILLATORS_LIST = [
  { id: 'AverageDirectionalIndex', name: 'Average Directional Index (ADX)' },
  { id: 'AwesomeOscillator', name: 'Awesome Oscillator' },
  { id: 'CCI', name: 'CCI' },
  { id: 'MACD', name: 'MACD' },
  { id: 'RSI', name: 'RSI' },
  { id: 'RateOfChange', name: 'Rate of Change (ROC)' },
  { id: 'Stochastic', name: 'Stochastic Oscillator' },
  { id: 'WilliamsR', name: 'Williams %R' },
  { id: 'ATR', name: 'Average True Range (ATR)' },
];

const DRAWING_LIST = [
  { id: 'FibonacciFan', name: 'Fibonacci Fan', icon: TrendingUp },
  { id: 'FibonacciLevels', name: 'Fibonacci Levels', icon: Menu },
  { id: 'HorizontalLine', name: 'Horizontal Line', icon: Minus },
  { id: 'ParallelChannel', name: 'Parallel channel', icon: Equal },
  { id: 'Ray', name: 'Ray', icon: ArrowUpRight },
  { id: 'Rectangle', name: 'Rectangle', icon: Square },
  { id: 'TrendLine', name: 'Trend Line', icon: TrendingUp },
  { id: 'VerticalLine', name: 'Vertical Line', icon: Minus, iconClass: "rotate-90" },
];

const STRATEGIES_LIST = [
  {
    category: 'AI-POWERED',
    count: 3,
    items: [
      { id: 'SmartRSI15', name: 'Smart RSI 15', type: 'FT', color: 'bg-purple-500' },
      { id: 'SmartRSI30', name: 'Smart RSI 30', type: 'FT', color: 'bg-purple-500' },
      { id: 'SmartRSI60', name: 'Smart RSI 60', type: 'FT', color: 'bg-purple-500' },
    ]
  },
  {
    category: 'BASIC',
    count: 42,
    items: [
      { id: 'JapanesePearl', name: 'Japanese Pearl', type: 'FT', color: 'bg-blue-500' },
      { id: 'JapaneseTrend', name: 'Japanese Trend', type: 'FT', color: 'bg-blue-500' },
      { id: 'Reflection', name: 'Reflection', type: 'FT', color: 'bg-blue-500' },
      { id: 'RelativeStrengthLaw', name: 'Relative Strength Law', type: 'FT', color: 'bg-blue-500' },
      { id: 'SlidingOnAverages', name: 'Sliding on Averages', type: 'FT', color: 'bg-blue-500' },
      { id: 'AverageIntersection', name: 'Average Intersection', type: 'FX', color: 'bg-blue-500' },
      { id: 'ChasingTheTrend', name: 'Chasing the Trend', type: 'FX', color: 'bg-blue-500' },
    ]
  }
];

export default function IndicatorSheet({ isOpen, onClose, onSelectIndicator, activeIndicators }: IndicatorSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Indicators');

  const renderContent = () => {
    if (activeTab === 'Indicators') {
      const filtered = INDICATORS_LIST.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return (
        <div className="flex flex-col">
          {filtered.map((indicator) => (
            <button
              key={indicator.id}
              onClick={() => {
                if (!indicator.locked) {
                  onSelectIndicator({
                    id: indicator.id,
                    name: indicator.name,
                    params: {}, // Default params
                    color: '#2962FF', // Default color
                    visible: true
                  });
                }
              }}
              disabled={indicator.locked}
              className="w-full flex items-center justify-between py-5 text-left border-b border-transparent hover:bg-white/5 transition-colors px-2 rounded-lg"
            >
              <span className={cn(
                "text-[17px] font-medium tracking-wide",
                indicator.locked ? "text-[#666666]" : "text-[#e0e0e0]"
              )}>
                {indicator.name}
              </span>
              {indicator.locked ? (
                <Lock size={20} className="text-[#666666]" />
              ) : (
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center",
                  activeIndicators.some(i => i.id === indicator.id) ? "bg-blue-500 border-blue-500" : "border-[#666666]"
                )}>
                  {activeIndicators.some(i => i.id === indicator.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              )}
            </button>
          ))}
        </div>
      );
    }

    if (activeTab === 'Oscillators') {
      const filtered = OSCILLATORS_LIST.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return (
        <div className="flex flex-col">
          {filtered.map((oscillator) => (
            <button
              key={oscillator.id}
              onClick={() => {
                onSelectIndicator({
                  id: oscillator.id,
                  name: oscillator.name,
                  params: {}, // Default params
                  color: '#2962FF', // Default color
                  visible: true
                });
              }}
              className="w-full flex items-center justify-between py-5 text-left border-b border-transparent hover:bg-white/5 transition-colors px-2 rounded-lg"
            >
              <span className="text-[17px] font-medium tracking-wide text-[#e0e0e0]">
                {oscillator.name}
              </span>
              <div className={cn(
                "w-5 h-5 rounded-full border flex items-center justify-center",
                activeIndicators.some(i => i.id === oscillator.id) ? "bg-blue-500 border-blue-500" : "border-[#666666]"
              )}>
                {activeIndicators.some(i => i.id === oscillator.id) && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (activeTab === 'Drawing') {
      const filtered = DRAWING_LIST.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return (
        <div className="flex flex-col">
          {filtered.map((drawing) => {
            const Icon = drawing.icon;
            return (
              <button
                key={drawing.id}
                onClick={() => {
                  onSelectIndicator({
                    id: drawing.id,
                    name: drawing.name,
                    params: {}, // Default params
                    color: '#FFFFFF', // Default color
                    visible: true
                  });
                }}
                className="w-full flex items-center justify-between py-5 text-left border-b border-transparent hover:bg-white/5 transition-colors px-2 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Icon size={24} className={cn("text-white", drawing.iconClass)} />
                  <span className="text-[17px] font-medium tracking-wide text-[#e0e0e0]">
                    {drawing.name}
                  </span>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center",
                  activeIndicators.some(i => i.id === drawing.id) ? "bg-blue-500 border-blue-500" : "border-[#666666]"
                )}>
                  {activeIndicators.some(i => i.id === drawing.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </button>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'Strategies') {
      return (
        <div className="flex flex-col space-y-6">
          <p className="text-[#888888] text-[15px] leading-relaxed px-2">
            Sets of indicators and oscillators that help you find the right moments to open and close trades
          </p>
          
          {STRATEGIES_LIST.map((group) => (
            <div key={group.category} className="flex flex-col">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[#888888] text-[13px] font-bold tracking-widest">{group.category}</h3>
                  {group.category === 'AI-POWERED' && (
                    <HelpCircle size={14} className="text-[#888888]" />
                  )}
                </div>
                <span className="text-[#888888] text-[13px] font-bold">{group.count}</span>
              </div>
              
              <div className="flex flex-col">
                {group.items.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() => {
                      onSelectIndicator({
                        id: strategy.id,
                        name: strategy.name,
                        params: {}, // Default params
                        color: strategy.color || '#2962FF', // Default color
                        visible: true
                      });
                    }}
                    className="w-full flex items-center justify-between py-5 text-left border-b border-transparent hover:bg-white/5 transition-colors px-2 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative flex items-center justify-center w-6 h-6">
                        <div className={cn("absolute inset-0 rounded-full opacity-20", strategy.color)} />
                        <div className={cn("w-3 h-3 rounded-full", strategy.color)} />
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-full mix-blend-overlay" />
                      </div>
                      <span className="text-[17px] font-medium tracking-wide text-[#e0e0e0]">
                        {strategy.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#e0e0e0] font-bold text-[15px]">
                        {strategy.type}
                      </span>
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center",
                        activeIndicators.some(i => i.id === strategy.id) ? "bg-blue-500 border-blue-500" : "border-[#666666]"
                      )}>
                        {activeIndicators.some(i => i.id === strategy.id) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} className="h-[92vh] bg-[#121212]">
      <div className="flex flex-col flex-1 min-h-0 bg-[#121212] text-white">
        {/* Search Bar */}
        <div className="px-4 pt-2 pb-4 shrink-0">
          <div className="bg-[#1e1e1e] rounded-full flex items-center gap-3 px-4 py-3 border border-transparent">
            <Search size={20} className="text-[#888888]" />
            <input 
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-[16px] focus:outline-none w-full placeholder:text-[#888888]"
            />
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 px-4 pb-20 overflow-y-auto custom-scrollbar">
          {renderContent()}
        </div>

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between px-6 py-3 bg-[#121212] border-t border-[#1e1e1e] pb-safe mt-auto">
          <button 
            onClick={() => setActiveTab('Indicators')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-colors",
              activeTab === 'Indicators' ? "text-white" : "text-[#888888]"
            )}
          >
            <Compass size={24} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">Indicators</span>
          </button>
          <button 
            onClick={() => setActiveTab('Oscillators')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-colors",
              activeTab === 'Oscillators' ? "text-white" : "text-[#888888]"
            )}
          >
            <BarChart2 size={24} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">Oscillators</span>
          </button>
          <button 
            onClick={() => setActiveTab('Drawing')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-colors",
              activeTab === 'Drawing' ? "text-white" : "text-[#888888]"
            )}
          >
            <Pencil size={24} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">Drawing</span>
          </button>
          <button 
            onClick={() => setActiveTab('Strategies')}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-colors",
              activeTab === 'Strategies' ? "text-white" : "text-[#888888]"
            )}
          >
            <Percent size={24} strokeWidth={1.5} />
            <span className="text-[11px] font-medium">Strategies</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
