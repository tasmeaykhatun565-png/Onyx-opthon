import React, { useState, useEffect, useMemo } from 'react';
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

const FlagIcon = ({ code }: { code: string }) => {
  return (
    <img 
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} 
      alt={code}
      className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
    />
  );
};

export function LeaderboardPage({ onBack, currencySymbol = '$', currentUser, socket }: { onBack: () => void, currencySymbol?: string, currentUser?: { name?: string; profit?: number }, socket?: any }) {


  const [period, setPeriod] = useState('1 day');
  const [lastUpdate, setLastUpdate] = useState(format(new Date(), 'HH:mm:ss'));
  const [userCountryCode, setUserCountryCode] = useState<string>('BD'); // Default country code
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Attempt to get user's actual country
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data && data.country_code) {
          setUserCountryCode(data.country_code);
        }
      })
      .catch((err) => {
        console.log('Could not fetch country flag', err);
      });
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    // Request initial data
    socket.emit('request-leaderboard');

    const handleLeaderboardUpdate = (data: any[]) => {
       console.log('Received leaderboard update', data);
       let updatedLeaderboard = [...data];
       
       if (currentUser?.name && currentUser?.profit !== undefined && currentUser.profit > 0) {
          const userProfit = currentUser.profit; 
          const userEntry: LeaderboardEntry = {
            id: 'current-user',
            name: currentUser.name,
            profit: userProfit,
            countryCode: userCountryCode,
            isCurrentUser: true,
          };
          
          updatedLeaderboard.push(userEntry);
       }
       // Sort descending and keep top 20
       updatedLeaderboard.sort((a, b) => b.profit - a.profit);
       
       // Ensure we only slice if there's more than 20
       if (updatedLeaderboard.length > 20) {
           updatedLeaderboard = updatedLeaderboard.slice(0, 20);
       }
       
       setLeaderboard(updatedLeaderboard);
       setLastUpdate(format(new Date(), 'HH:mm:ss'));
    };

    socket.on('leaderboard-update', handleLeaderboardUpdate);
    
    return () => {
        socket.off('leaderboard-update', handleLeaderboardUpdate);
    };
  }, [socket, currentUser, userCountryCode]);


  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(format(new Date(), 'HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = format(new Date(), 'dd MMMM yyyy');

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
                    <span className="text-[22px] font-bold text-white tabular-nums tracking-tight">{lastUpdate}</span>
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
              <span className="text-base font-bold text-gray-200">Today, {todayStr}</span>
              <ChevronDown size={20} className="text-gray-500" />
           </button>
        </div>

        {/* Ranking List */}
        <div className="space-y-4 mt-8 pb-10">
           {leaderboard.map((entry, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between px-3 rounded-2xl py-3.5 transition-all", 
                    entry.isCurrentUser 
                      ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                      : "hover:bg-white/5"
                  )}
                >
                   <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-7 h-7 flex items-center justify-center text-[13px] font-black rounded-lg shadow-sm font-mono",
                        rank === 1 ? "bg-gradient-to-br from-[#ffd700] to-[#b8860b] text-black" : 
                        rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-black" : 
                        rank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" : 
                        "bg-white/5 text-gray-500"
                      )}>
                        {rank}
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="relative">
                            <FlagIcon code={entry.countryCode} />
                            {isTop3 && (
                               <Medal size={10} className={cn(
                                 "absolute -top-2 -right-2",
                                 rank === 1 ? "text-[#ffd700]" : rank === 2 ? "text-gray-300" : "text-amber-600"
                               )} />
                            )}
                         </div>
                         <div className="flex flex-col">
                            <span className={cn(
                              "text-[14px] font-bold tracking-tight leading-tight",
                              isTop3 ? "text-white" : "text-gray-300",
                              entry.isCurrentUser ? "text-emerald-400" : ""
                            )}>
                              {entry.name.toUpperCase()}
                            </span>
                            {entry.isCurrentUser && (
                               <span className="text-[10px] font-black text-emerald-500/80 uppercase tracking-widest mt-0.5">
                                 Your Daily Performance
                               </span>
                            )}
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex flex-col items-end">
                      <span className={cn(
                        "text-[16px] font-black tabular-nums tracking-tighter", 
                        entry.isCurrentUser ? "text-emerald-400" : (isTop3 ? "text-white" : "text-gray-200")
                      )}>
                        {currencySymbol}{entry.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {entry.profit >= 5000 && <span className="ml-0.5 text-[10px] opacity-60">+</span>}
                      </span>
                      <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Profit</span>
                   </div>
                </motion.div>
              );
           })}
        </div>
      </div>
    </div>
  );
}
