import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Calendar as CalendarIcon, Info, Clock, Globe } from 'lucide-react';
import { cn } from './utils';
import { format } from 'date-fns';

interface EconomicCalendarProps {
  onBack: () => void;
}

const events = [
  {
    id: 1,
    time: '14:30',
    currency: 'USD',
    event: 'Core Durable Goods Orders (MoM) (Mar)',
    impact: 'high',
    actual: '0.2%',
    forecast: '0.2%',
    previous: '0.3%'
  },
  {
    id: 2,
    time: '14:30',
    currency: 'USD',
    event: 'Durable Goods Orders (MoM) (Mar)',
    impact: 'medium',
    actual: '2.6%',
    forecast: '2.5%',
    previous: '0.7%'
  },
  {
    id: 3,
    time: '16:00',
    currency: 'USD',
    event: 'Pending Home Sales (MoM) (Mar)',
    impact: 'medium',
    actual: '---',
    forecast: '0.3%',
    previous: '1.6%'
  },
  {
    id: 4,
    time: '16:30',
    currency: 'USD',
    event: 'Crude Oil Inventories',
    impact: 'high',
    actual: '---',
    forecast: '1.600M',
    previous: '2.735M'
  },
  {
    id: 5,
    time: '18:00',
    currency: 'RUB',
    event: 'Interest Rate Decision (Apr)',
    impact: 'high',
    actual: '16.00%',
    forecast: '16.00%',
    previous: '16.00%'
  },
  {
    id: 6,
    time: '20:00',
    currency: 'USD',
    event: '7-Year Note Auction',
    impact: 'low',
    actual: '---',
    forecast: '---',
    previous: '4.185%'
  }
];

export const EconomicCalendar: React.FC<EconomicCalendarProps> = ({ onBack }) => {
  return (
    <div className="flex flex-col h-full bg-[#0a0b0d] text-white font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-[#0a0b0d] sticky top-0 z-10">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">Economic Calendar</h1>
      </div>

      {/* Date Selector */}
      <div className="flex items-center px-4 py-3 border-b border-white/5 bg-[#0f1115]">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-1">
          {['Yesterday', 'Today', 'Tomorrow', 'This Week'].map((label, idx) => (
            <button 
              key={label}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                idx === 1 ? "bg-white text-black" : "bg-white/5 text-gray-400 hover:bg-white/10"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-gray-400">
            {format(new Date(), 'EEEE, MMMM dd')}
          </span>
        </div>

        {events.map((event) => (
          <div 
            key={event.id}
            className="bg-[#16171b] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="text-sm font-mono font-bold text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                  {event.time}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                    <Globe size={12} className="text-gray-400" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-white/80">{event.currency}</span>
                </div>
              </div>
              
              <div className="flex gap-0.5">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "w-1 h-3 rounded-full",
                      i <= (event.impact === 'high' ? 3 : event.impact === 'medium' ? 2 : 1)
                        ? "bg-orange-500"
                        : "bg-white/10"
                    )}
                  />
                ))}
              </div>
            </div>

            <h3 className="text-sm font-bold text-white mb-4 leading-tight group-hover:text-blue-400 transition-colors">
              {event.event}
            </h3>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Actual</span>
                <span className={cn(
                  "text-xs font-bold",
                  event.actual === '---' ? "text-gray-400" : "text-white"
                )}>{event.actual}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Forecast</span>
                <span className="text-xs font-bold text-white">{event.forecast}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Previous</span>
                <span className="text-xs font-bold text-white">{event.previous}</span>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-blue-500/5 rounded-2xl p-5 border border-blue-500/10 mt-6 flex gap-4">
          <Info size={20} className="text-blue-500 shrink-0" />
          <p className="text-xs text-blue-200/60 leading-relaxed">
            The Economic Calendar displays important global financial events that may affect market volatility. 
            High impact events generally result in significant price movements.
          </p>
        </div>
      </div>
    </div>
  );
};
