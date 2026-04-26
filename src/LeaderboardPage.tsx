import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ChevronLeft, Medal, Users, TrendingUp, Globe, Zap, Target, X, Info, ChevronDown, Award, Star, ChevronRight, Calendar } from 'lucide-react';
import { cn } from './utils';
import { format } from 'date-fns';

interface LeaderboardEntry {
  id: string;
  name: string;
  profit: number;
  countryCode: string;
  isCurrentUser?: boolean;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: 'Sebas.Trader', profit: 25000.00, countryCode: 'CO' },
  { id: '2', name: 'DANITRADER', profit: 25000.00, countryCode: 'CO' },
  { id: '3', name: 'DULCE***', profit: 21345.50, countryCode: 'MX' },
  { id: '4', name: 'ID82341***', profit: 18420.20, countryCode: 'ID' },
  { id: '5', name: 'Yusuf_Trade', profit: 15420.15, countryCode: 'TR' },
  { id: '6', name: 'Abdullah.K', profit: 12100.40, countryCode: 'AE' },
  { id: '7', name: 'Binomo_Pro', profit: 10850.90, countryCode: 'IN' },
  { id: '8', name: 'CharlyTrader17', profit: 5610.00, countryCode: 'CO' },
  { id: '9', name: 'Dbs3nzii', profit: 4626.35, countryCode: 'KW' },
  { id: '10', name: 'FTRADER2', profit: 4484.00, countryCode: 'AR' },
  { id: '11', name: 'ID182137***', profit: 4300.53, countryCode: 'CO' },
  { id: '12', name: 'Tradinghub9729', profit: 3532.88, countryCode: 'IN' },
  { id: '13', name: 'Musongyesquare', profit: 3456.02, countryCode: 'ZA' },
  { id: '14', name: 'Dehbalaji', profit: 1738.14, countryCode: 'IN' },
  { id: '15', name: 'BINOMO_TAMIL', profit: 1688.13, countryCode: 'IN' },
  { id: '16', name: 'ID58070***', profit: 1504.48, countryCode: 'ID' },
  { id: '17', name: 'JDRG_842', profit: 1185.28, countryCode: 'MX' },
  { id: '18', name: 'YEYOELTREMENDO', profit: 1165.71, countryCode: 'CO' },
  { id: '19', name: 'Hz_SIGNAL', profit: 1070.00, countryCode: 'IN' },
  { id: '20', name: 'JULIAN_TRADER', profit: 1048.00, countryCode: 'AR' },
];

const FlagIcon = ({ code }: { code: string }) => {
  return (
    <img 
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} 
      alt={code}
      className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
    />
  );
};

export function LeaderboardPage({ onBack, currencySymbol = '$' }: { onBack: () => void, currencySymbol?: string }) {
  const [period, setPeriod] = useState('1 day');
  const [lastUpdate, setLastUpdate] = useState(format(new Date(), 'HH:mm:ss'));

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(format(new Date(), 'HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-full bg-[#121212] text-white font-sans flex flex-col relative overflow-y-auto scrollbar-hide">
      {/* Header */}
      <div className="flex items-center gap-6 px-4 py-5 sticky top-0 bg-[#121212] z-20">
        <button 
          onClick={onBack} 
          className="text-gray-400 hover:text-white transition"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-white">Top-20</h1>
      </div>

      <div className="flex-1 w-full flex flex-col gap-6 px-4 pb-10">
        {/* Hall of Fame Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full rounded-2xl overflow-hidden aspect-[4/1.2] shadow-2xl border border-white/5 bg-[#1a1a1a]"
        >
           {/* Gold Dots Pattern */}
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffd700 0.5px, transparent 0.5px)', backgroundSize: '10px 10px' }} />
           
           <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 z-10">
              <span className="text-[9px] font-bold text-[#ffd700] uppercase tracking-[0.2em] opacity-80">
                Best traders of the week announced
              </span>
              <div className="flex items-center gap-6">
                 <span className="text-3xl font-light tracking-[0.3em] text-white">HALL</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] shadow-[0_0_8px_#ffd700]" />
                 <span className="text-3xl font-light tracking-[0.3em] text-white">OF</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-[#ffd700] shadow-[0_0_8px_#ffd700]" />
                 <span className="text-3xl font-light tracking-[0.3em] text-white">FAME</span>
              </div>
           </div>
        </motion.div>

        <div>
           <p className="text-sm font-bold text-gray-500 mb-6">Traders with the biggest profit</p>
           
           <div className="flex justify-between items-start mb-8">
              <div className="flex flex-col">
                 <span className="text-[22px] font-bold text-white tracking-tight">20,000+</span>
                 <span className="text-[13px] text-gray-500 font-medium">Participants a day</span>
              </div>
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-2">
                    <span className="text-[22px] font-bold text-white tabular-nums tracking-tight">00:30:55</span>
                    <Info size={18} className="text-gray-600" />
                 </div>
                 <span className="text-[13px] text-gray-500 font-medium text-right">Latest update</span>
              </div>
           </div>
        </div>

        {/* Promo Card */}
        <div className="bg-[#1e1e1e] rounded-3xl p-6 border border-white/5 flex flex-col gap-4">
           <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-300">
              <Globe size={24} />
           </div>
           <div className="flex flex-col gap-2">
              <h3 className="text-lg font-bold text-white leading-tight">Make trades to reach Bivax's top</h3>
              <p className="text-[13px] leading-relaxed text-gray-500">
                 Start earning funds on your real account, and your name will appear in the list of Bivax traders. Trade wisely, and you'll move today's Top traders!
              </p>
           </div>
        </div>

        {/* Period Selector */}
        <div className="space-y-2 mt-2">
           <label className="text-[11px] text-gray-600 font-black uppercase tracking-widest ml-1">Period</label>
           <button className="w-full bg-[#1e1e1e] border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
              <span className="text-base font-bold text-gray-200">Today, 24 April 2026</span>
              <ChevronDown size={20} className="text-gray-500" />
           </button>
        </div>

        {/* Ranking List */}
        <div className="space-y-4 mt-8 pb-10">
           {MOCK_LEADERBOARD.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              
              return (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={entry.id}
                  className="flex items-center justify-between px-1"
                >
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-6 h-6 flex items-center justify-center text-xs font-bold rounded-md",
                        rank === 1 ? "bg-[#ffd700] text-black" : 
                        rank === 2 ? "bg-gray-400 text-black" : 
                        rank === 3 ? "bg-amber-600 text-white" : 
                        "text-gray-500"
                      )}>
                        {rank}
                      </div>
                      <div className="flex items-center gap-3">
                         <FlagIcon code={entry.countryCode} />
                         <span className={cn(
                           "text-[15px] font-bold tracking-tight",
                           isTop3 ? "text-white" : "text-gray-300"
                         )}>
                           {entry.name}
                         </span>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-end">
                      <span className="text-[15px] font-bold text-gray-100 tabular-nums">
                        {currencySymbol}{entry.profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {entry.profit >= 25000 && "+"}
                      </span>
                   </div>
                </motion.div>
              );
           })}
        </div>
      </div>
    </div>
  );
}
