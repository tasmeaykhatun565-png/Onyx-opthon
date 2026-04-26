import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Clock, Shield, ChevronRight, Share2, Users, FileText, Info } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { cn } from './utils';

interface TournamentsPageProps {
  isOpen: boolean;
  onClose: () => void;
  socket: Socket | null;
  currencySymbol?: string;
}

const TournamentsPage: React.FC<TournamentsPageProps> = ({ isOpen, onClose, socket, currencySymbol = '$' }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<any | null>(null);

  useEffect(() => {
    if (socket && isOpen) {
      socket.emit('get-tournaments');
      
      const handleTournamentsList = (data: any[]) => {
        setTournaments(data);
      };

      const handleTournamentsUpdated = (data: any[]) => {
        setTournaments(data);
      };

      socket.on('tournaments-list', handleTournamentsList);
      socket.on('tournaments-updated', handleTournamentsUpdated);

      return () => {
        socket.off('tournaments-list', handleTournamentsList);
        socket.off('tournaments-updated', handleTournamentsUpdated);
      };
    }
  }, [socket, isOpen]);

  const getTimeRemaining = (endTime: number) => {
    const total = endTime - Date.now();
    if (total <= 0) return "Finished";
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  };

  const getProgress = (start: number, end: number) => {
    const total = end - start;
    const elapsed = Date.now() - start;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-[#121418] z-[500] flex flex-col pt-safe"
        >
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b border-white/5">
            <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
            <h1 className="ml-2 text-xl font-bold text-white tracking-tight">Tournaments</h1>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 pb-32 space-y-5 scrollbar-hide">
             {tournaments.map((t, idx) => (
                <motion.div 
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-[#1e1e1e] rounded-[24px] overflow-hidden border border-white/5 shadow-2xl group flex flex-col"
                >
                   {/* Banner Area */}
                   <div className="h-44 relative bg-[#2a2a2a] overflow-hidden">
                      <img 
                        src={t.imageUrl || 'https://images.unsplash.com/photo-1611974714851-eb604e60805c?q=80&w=2070&auto=format&fit=crop'} 
                        alt="" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e] via-transparent to-black/20" />
                      
                      <div className="absolute top-5 left-6">
                         <h3 className="text-3xl font-black text-white italic tracking-tighter drop-shadow-xl">{t.title}</h3>
                         <div className="mt-3 inline-flex items-center gap-2 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                            <Clock size={12} className="text-yellow-500" strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/90">
                               {t.status === 'active' ? 'Until end' : 'Until start'}: {getTimeRemaining(t.status === 'active' ? t.endTime : t.startTime)}
                            </span>
                         </div>
                      </div>

                      {t.isLocked && (
                         <div className="absolute top-6 right-6 w-10 h-10 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 flex items-center justify-center text-orange-500 shadow-xl">
                            <Shield size={20} strokeWidth={2.5} />
                         </div>
                      )}

                      {/* Line Progress */}
                      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/5">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${getProgress(t.startTime, t.endTime)}%` }}
                           transition={{ duration: 1, ease: "easeOut" }}
                           className="h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                         />
                      </div>
                   </div>

                   {/* Footer Info */}
                   <div className="p-5 flex justify-between items-center bg-[#1e1e1e]">
                      <div>
                         <p className="text-[10px] font-black text-gray-500 uppercase tracking-[2px] mb-1 italic">Prize fund</p>
                         <p className="text-2xl font-black text-yellow-500 font-mono italic tracking-tighter">
                            {currencySymbol}{t.prizeFund.toLocaleString()}
                         </p>
                      </div>
                      <button 
                        onClick={() => setSelectedTournament(t)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3.5 rounded-[18px] text-[13px] font-black uppercase tracking-tight transition shadow-lg shadow-yellow-500/10 active:scale-95"
                      >
                         Read more
                      </button>
                   </div>
                </motion.div>
             ))}

             {tournaments.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
                   <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <Trophy size={40} className="text-gray-400" />
                   </div>
                   <p className="font-black text-xl italic tracking-tighter uppercase text-white">Zero Arena Data</p>
                   <p className="text-[10px] uppercase tracking-widest mt-2 font-bold text-gray-400">No active arenas in the terminal at this moment</p>
                </div>
             )}
          </div>

          {/* Details Overlay */}
          <AnimatePresence>
            {selectedTournament && (
               <motion.div
                 initial={{ y: '100%' }}
                 animate={{ y: 0 }}
                 exit={{ y: '100%' }}
                 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                 className="fixed inset-0 bg-[#121418] z-[600] flex flex-col pt-safe"
               >
                  <div className="flex items-center px-6 py-4 border-b border-white/5 bg-[#121418]">
                    <button onClick={() => setSelectedTournament(null)} className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                      <ArrowLeft size={24} strokeWidth={2.5} />
                    </button>
                    <h2 className="ml-2 text-xl font-bold text-white tracking-tight italic uppercase">Arena Details</h2>
                    <button className="ml-auto p-2 text-gray-400">
                       <Share2 size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                     <div className="h-72 relative">
                        <img 
                          src={selectedTournament.imageUrl || 'https://images.unsplash.com/photo-1621416848469-e01dae52899d?q=80&w=2070&auto=format&fit=crop'} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121418] via-[#121418]/20 to-transparent" />
                        
                        <div className="absolute bottom-10 left-6 right-6">
                           <h1 className="text-4xl font-black italic tracking-tighter text-white leading-none mb-3 drop-shadow-2xl">
                              {selectedTournament.title}
                           </h1>
                           <div className="flex gap-2">
                              <span className="bg-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase tracking-[2px] px-3 py-1.5 rounded-xl border border-yellow-500/30 backdrop-blur-xl transition-all">Verified Event</span>
                              <span className="bg-blue-500/20 text-blue-500 text-[9px] font-black uppercase tracking-[2px] px-3 py-1.5 rounded-xl border border-blue-500/30 backdrop-blur-xl transition-all">{selectedTournament.status}</span>
                           </div>
                        </div>
                     </div>

                     <div className="px-6 pb-32">
                        <div className="grid grid-cols-2 gap-4 mb-10">
                           <div className="bg-[#1e1e1e] p-5 rounded-[24px] border border-white/5 shadow-xl">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 italic">Total Prize Pool</p>
                              <p className="text-2xl font-black text-yellow-500 font-mono tracking-tighter italic">{currencySymbol}{selectedTournament.prizeFund.toLocaleString()}</p>
                           </div>
                           <div className="bg-[#1e1e1e] p-5 rounded-[24px] border border-white/5 shadow-xl flex flex-col justify-center">
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1.5 italic">Entry Rule</p>
                              <p className="text-[11px] font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                                 {selectedTournament.isLocked ? <><Shield size={14} className="text-orange-500" /> PRO PASS REQUIRED</> : "FREE TO ALL TRADERS"}
                              </p>
                           </div>
                        </div>

                        <div className="space-y-10">
                           <div className="relative">
                              <div className="absolute -left-6 top-0 bottom-0 w-1 bg-yellow-500" />
                              <h3 className="text-[13px] font-black text-white uppercase tracking-[3px] mb-5 flex items-center gap-3">
                                 <FileText size={18} className="text-yellow-500" strokeWidth={3} /> Description
                              </h3>
                              <p className="text-gray-400 text-[13px] leading-relaxed font-medium">
                                 {selectedTournament.description || "Enter the arena to prove your skills. Compete againstthousands of professional traders in a real-time environment. This event is designed to reward the most consistent and strategic traders on the platform."}
                              </p>
                           </div>

                           <div className="relative">
                              <div className="absolute -left-6 top-0 bottom-0 w-1 bg-blue-500" />
                              <h3 className="text-[13px] font-black text-white uppercase tracking-[3px] mb-5 flex items-center gap-3">
                                 <Info size={18} className="text-blue-500" strokeWidth={3} /> Arena Regulations
                              </h3>
                              <div className="bg-[#1e1e1e] rounded-[24px] p-6 border border-white/5 space-y-5 shadow-2xl">
                                 {selectedTournament.rules ? (
                                    <p className="text-gray-400 text-sm whitespace-pre-wrap leading-loose font-medium italic ">{selectedTournament.rules}</p>
                                 ) : (
                                    <>
                                       <div className="flex gap-4 items-start">
                                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                          <p className="text-[12px] text-gray-300 font-bold leading-tight uppercase tracking-tight">Minimum trade amount to qualify: {currencySymbol}1</p>
                                       </div>
                                       <div className="flex gap-4 items-start">
                                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                          <p className="text-[12px] text-gray-300 font-bold leading-tight uppercase tracking-tight">Tournament score is based on the highest NET PROFIT (Total Wins - Total Losses).</p>
                                       </div>
                                       <div className="flex gap-4 items-start">
                                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                                          <p className="text-[12px] text-gray-300 font-bold leading-tight uppercase tracking-tight">Rewards will be credited directly to your Real Account balance after audit.</p>
                                       </div>
                                    </>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="p-6 bg-[#121418] border-t border-white/5 pb-safe">
                     <button className="w-full bg-yellow-500 h-16 rounded-[24px] font-black text-[14px] uppercase tracking-[6px] italic shadow-2xl shadow-yellow-500/20 active:scale-[0.98] transition-all hover:bg-yellow-400">
                        Join Arena
                     </button>
                  </div>
               </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TournamentsPage;
