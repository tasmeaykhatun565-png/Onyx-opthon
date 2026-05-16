import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Calendar as CalendarIcon, 
  Info, 
  Filter, 
  Search,
  Bell,
  Clock,
  TrendingUp,
  AlertTriangle,
  History
} from 'lucide-react';
import { cn } from './utils';
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

interface EconomicCalendarProps {
  onBack: () => void;
}

interface EconomicEvent {
  id: number;
  time: string;
  date: Date;
  currency: string;
  country: string;
  event: string;
  impact: 'low' | 'medium' | 'high';
  actual: string;
  forecast: string;
  previous: string;
  description: string;
}

const eventData: EconomicEvent[] = [
  {
    id: 1,
    time: '14:30',
    date: new Date(),
    currency: 'USD',
    country: 'United States',
    event: 'Core Durable Goods Orders (MoM) (Mar)',
    impact: 'high',
    actual: '0.2%',
    forecast: '0.2%',
    previous: '0.3%',
    description: 'Measures the change in the total value of new orders for long-lasting manufactured goods, excluding transportation items.'
  },
  {
    id: 2,
    time: '14:30',
    date: new Date(),
    currency: 'USD',
    country: 'United States',
    event: 'Durable Goods Orders (MoM) (Mar)',
    impact: 'medium',
    actual: '2.6%',
    forecast: '2.5%',
    previous: '0.7%',
    description: 'Measures the change in the total value of new orders for long-lasting manufactured goods.'
  },
  {
    id: 3,
    time: '16:00',
    date: new Date(),
    currency: 'USD',
    country: 'United States',
    event: 'Pending Home Sales (MoM) (Mar)',
    impact: 'medium',
    actual: '---',
    forecast: '0.3%',
    previous: '1.6%',
    description: 'Measures the change in the number of homes under contract to be sold but still awaiting the closing transaction.'
  },
  {
    id: 4,
    time: '16:30',
    date: new Date(),
    currency: 'USD',
    country: 'United States',
    event: 'Crude Oil Inventories',
    impact: 'high',
    actual: '---',
    forecast: '1.600M',
    previous: '2.735M',
    description: 'Measures the weekly change in the number of barrels of commercial crude oil held by US firms.'
  },
  {
    id: 5,
    time: '18:00',
    date: new Date(),
    currency: 'EUR',
    country: 'Eurozone',
    event: 'ECB President Lagarde Speaks',
    impact: 'high',
    actual: '---',
    forecast: '---',
    previous: '---',
    description: 'Speeches by the ECB President often provide clues regarding future monetary policy.'
  },
  {
    id: 6,
    time: '20:00',
    date: addDays(new Date(), 1),
    currency: 'JPY',
    country: 'Japan',
    event: 'Unemployment Rate',
    impact: 'low',
    actual: '---',
    forecast: '2.5%',
    previous: '2.6%',
    description: 'Measures the percentage of the total work force that is unemployed and actively seeking employment.'
  },
  {
    id: 7,
    time: '09:00',
    date: addDays(new Date(), 1),
    currency: 'GPB',
    country: 'United Kingdom',
    event: 'GDP (YoY)',
    impact: 'high',
    actual: '---',
    forecast: '0.2%',
    previous: '0.1%',
    description: 'Measures the annualized change in the inflation-adjusted value of all goods and services produced by the economy.'
  },
];

export const EconomicCalendar: React.FC<EconomicCalendarProps> = ({ onBack }) => {
  const [activeRange, setActiveRange] = useState<'Yesterday' | 'Today' | 'Tomorrow' | 'This Week'>('Today');
  const [searchQuery, setSearchQuery] = useState('');
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const filteredEvents = useMemo(() => {
    return eventData.filter(event => {
      // Impact match
      if (impactFilter !== 'all' && event.impact !== impactFilter) return false;

      // Search match
      if (searchQuery && !event.event.toLowerCase().includes(searchQuery.toLowerCase()) && !event.currency.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Date range match
      const today = new Date();
      if (activeRange === 'Today') return isSameDay(event.date, today);
      if (activeRange === 'Yesterday') return isSameDay(event.date, addDays(today, -1));
      if (activeRange === 'Tomorrow') return isSameDay(event.date, addDays(today, 1));
      if (activeRange === 'This Week') {
        const start = startOfWeek(today);
        const end = endOfWeek(today);
        return event.date >= start && event.date <= end;
      }
      return true;
    });
  }, [activeRange, searchQuery, impactFilter]);

  const toggleEventDetail = (id: number) => {
    setSelectedEventId(selectedEventId === id ? null : id);
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary text-white font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col border-b border-white/5 bg-bg-primary/95 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center justify-between p-4 px-5">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 flex items-center justify-center text-text-primary hover:bg-bg-secondary transition-all rounded-full"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-xl font-black text-text-primary tracking-tight">Economic Calendar</h1>
              <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest leading-none">Market Volatility Events</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-white rounded-full transition-colors relative">
              <Bell size={20} />
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-primary" />
            </button>
          </div>
        </div>

        {/* Date Selector Row */}
        <div className="px-5 pb-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2">
            {(['Yesterday', 'Today', 'Tomorrow', 'This Week'] as const).map((label) => (
              <button 
                key={label}
                onClick={() => setActiveRange(label)}
                className={cn(
                  "px-5 py-2 rounded-xl text-[13px] font-black tracking-tight transition-all border whitespace-nowrap",
                  activeRange === label 
                    ? "bg-white text-black border-white shadow-lg shadow-white/5" 
                    : "bg-bg-secondary text-text-secondary border-transparent hover:border-white/10 hover:text-text-primary"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="px-5 pb-5 flex gap-2">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search currency, events..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary/50 border border-white/5 rounded-2xl py-2.5 pl-11 pr-4 text-xs font-medium focus:outline-none focus:border-blue-500/50 transition-all focus:bg-bg-secondary"
            />
          </div>
          <div className="flex border border-white/5 rounded-2xl overflow-hidden bg-bg-secondary/50">
            {(['high', 'medium', 'low'] as const).map((impact) => (
              <button
                key={impact}
                onClick={() => setImpactFilter(impactFilter === impact ? 'all' : impact)}
                className={cn(
                  "px-3 py-2 transition-all flex items-center justify-center",
                  impactFilter === impact 
                    ? "bg-blue-600 text-white" 
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                )}
                title={`Filter by ${impact} impact`}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  impact === 'high' ? "bg-red-500" : impact === 'medium' ? "bg-orange-500" : "bg-yellow-500",
                  impactFilter === impact ? "bg-white" : ""
                )} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 pb-32">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} className="text-blue-500" />
            <span className="text-sm font-black text-text-primary tracking-tight">
              {format(new Date(), 'EEEE, MMMM dd')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-text-secondary font-black uppercase tracking-widest">
            <Clock size={12} />
            {format(new Date(), 'HH:mm')} UTC
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event, index) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                layout
                className={cn(
                  "bg-bg-secondary/40 backdrop-blur-sm rounded-[24px] border border-white/5 overflow-hidden transition-all",
                  selectedEventId === event.id ? "border-blue-500/30 scale-[1.02] shadow-2xl shadow-blue-500/5" : "hover:border-white/10"
                )}
              >
                <div 
                  className="p-5 cursor-pointer"
                  onClick={() => toggleEventDetail(event.id)}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-black text-blue-400 bg-blue-400/10 px-3 py-1.5 rounded-xl">
                        {event.time}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                           <span className="text-[11px] font-black text-text-primary leading-none">{event.currency}</span>
                           <span className="text-[9px] font-bold text-text-secondary/60 leading-none mt-1">{event.country}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      {[1, 2, 3].map((i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "w-1.5 h-4 rounded-full transition-all",
                            i <= (event.impact === 'high' ? 3 : event.impact === 'medium' ? 2 : 1)
                              ? event.impact === 'high' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-orange-500"
                              : "bg-white/10"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <h3 className="text-[15px] font-black text-text-primary mb-5 leading-tight tracking-tight">
                    {event.event}
                  </h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Actual</span>
                      <span className={cn(
                        "text-sm font-black",
                        event.actual === '---' 
                          ? "text-text-secondary/40" 
                          : parseFloat(event.actual) > parseFloat(event.forecast) ? "text-green-500" : "text-text-primary"
                      )}>{event.actual}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Forecast</span>
                      <span className="text-sm font-black text-text-primary/90">{event.forecast}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-text-secondary uppercase tracking-widest mb-1">Previous</span>
                      <span className="text-sm font-black text-text-primary/90">{event.previous}</span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {selectedEventId === event.id && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5 bg-white/5 p-5"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-text-secondary leading-relaxed font-medium">
                          {event.description}
                        </p>
                      </div>
                      <div className="flex gap-2">
                         <button className="flex-1 bg-white/10 hover:bg-white/20 text-text-primary py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2">
                           <History size={14} /> Historical Data
                         </button>
                         <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-2">
                           <TrendingUp size={14} /> Trade Setup
                         </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 flex flex-col items-center justify-center text-center opacity-50"
            >
               <History size={48} className="text-text-secondary mb-4 opacity-20" />
               <p className="text-sm font-bold text-text-secondary">No events found for this filter</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-blue-600/10 rounded-[28px] p-6 border border-blue-600/20 mt-8 flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-600/10 blur-[40px] rounded-full group-hover:scale-150 transition-transform duration-700" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <h4 className="text-[13px] font-black text-text-primary leading-tight">Pro Trading Tip</h4>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest leading-tight">Volatility Awareness</p>
            </div>
          </div>
          <p className="text-[11px] text-text-secondary/80 leading-relaxed font-medium relative z-10">
            Market volatility tends to peak during "High" impact news events. Consider reducing position sizes or avoiding entries 15 minutes before and after high-impact USD events.
          </p>
        </div>
      </div>
    </div>
  );
};

