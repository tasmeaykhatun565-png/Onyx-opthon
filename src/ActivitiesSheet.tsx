import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Gift, Calendar, User, Megaphone, UserPlus, GraduationCap, ChevronRight } from 'lucide-react';
import { cn } from './utils';

interface ActivitiesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLeaderboard: () => void;
  onOpenRewards: () => void;
  onOpenTournaments: () => void;
  onOpenWhatsNew: () => void;
  onOpenReferral: () => void;
  inSidebar?: boolean;
  unreadAnnouncementsCount?: number;
  clientAds?: any[];
}

const ActivitiesSheet: React.FC<ActivitiesSheetProps> = ({ isOpen, onClose, onOpenLeaderboard, onOpenRewards, onOpenTournaments, onOpenWhatsNew, onOpenReferral, inSidebar = false, unreadAnnouncementsCount = 0, clientAds = [] }) => {
  const content = (
    <div className={cn(
      "h-full w-full bg-[#121418] flex flex-col pt-safe scrollbar-hide",
      !inSidebar && "fixed md:relative right-0 top-0 md:w-80 border-l border-white/5 z-50 shadow-2xl"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Activities</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1">
          <X size={24} strokeWidth={2.5} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 space-y-4 overflow-y-auto scrollbar-hide pb-10">
        {/* Horizontal Scroll Section (Cards) */}
        {clientAds && clientAds.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
            {clientAds.map((ad, idx) => (
              <a 
                key={ad.id || idx}
                href={ad.linkUrl || '#'} 
                target={ad.linkUrl ? "_blank" : undefined}
                rel="noreferrer"
                className="min-w-[130px] h-36 rounded-2xl p-4 flex flex-col justify-end relative overflow-hidden group cursor-pointer transition-transform active:scale-95 bg-[#1e1e1e]"
                style={{
                  backgroundImage: ad.imageUrl && (!ad.imageUrl.startsWith('bg-') && !ad.imageUrl.startsWith('#')) ? `url(${ad.imageUrl})` : 'none',
                  backgroundColor: (!ad.imageUrl || ad.imageUrl.startsWith('#')) ? (ad.imageUrl || '#1e1e1e') : '',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                 {ad.imageUrl && !ad.imageUrl.startsWith('#') && (
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                 )}
                 <span className="text-[13px] font-bold text-white leading-tight relative shadow-sm drop-shadow-md z-10">{ad.title}</span>
              </a>
            ))}
          </div>
        )}

        {/* Tournaments Row */}
        <div 
          onClick={onOpenTournaments}
          className="bg-[#1e1e1e] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all group shadow-sm active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400">
               <Trophy size={24} strokeWidth={1.5} />
             </div>
             <span className="text-[15px] font-bold text-white">Tournaments</span>
          </div>
          <ChevronRight size={20} className="text-gray-600" />
        </div>

        {/* Grid (Bonuses, Calendar, Top-20) */}
        <div className="grid grid-cols-3 gap-3">
          {/* Bonuses */}
          <div 
            onClick={onOpenRewards}
            className="aspect-square rounded-2xl bg-[#1e1e1e] p-3 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-all active:scale-[0.95] group"
          >
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
              <Gift size={20} />
            </div>
            <span className="text-[12px] font-bold text-[#fefefe]">Bonuses</span>
          </div>

          {/* Calendar */}
          <div className="aspect-square rounded-2xl bg-[#1e1e1e] p-3 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-all active:scale-[0.95] group">
            <div className="w-10 h-10 bg-[#a855f7]/10 rounded-xl flex items-center justify-center text-[#a855f7]">
              <Calendar size={20} />
            </div>
            <span className="text-[12px] font-bold text-[#fefefe]">Calendar</span>
          </div>

          {/* Top-20 (Leaderboard) */}
          <div 
            onClick={onOpenLeaderboard}
            className="aspect-square rounded-2xl bg-[#1e1e1e] p-3 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-white/[0.03] transition-all active:scale-[0.95] group relative"
          >
            <div className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
              <div className="relative">
                <User size={20} />
                <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-gray-400 rounded-full border border-[#1e1e1e]" />
              </div>
            </div>
            <span className="text-[12px] font-bold text-[#fefefe]">Top-20</span>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-3 pt-2">
          {/* What's new? */}
          <div onClick={onOpenWhatsNew} className="bg-[#1e1e1e] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all active:scale-[0.98] group">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400">
                 <Megaphone size={22} strokeWidth={1.5} />
               </div>
               <span className="text-[15px] font-bold text-white">What's new?</span>
            </div>
            <div className="flex items-center gap-3">
              {unreadAnnouncementsCount > 0 && (
                <div className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full px-1.5 shadow-lg shadow-red-500/20">
                  {unreadAnnouncementsCount}
                </div>
              )}
              <ChevronRight size={20} className="text-gray-600" />
            </div>
          </div>

          {/* Invite Friends */}
          <div onClick={onOpenReferral} className="bg-[#1e1e1e] rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-all active:scale-[0.98] group">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-400">
                 <UserPlus size={22} strokeWidth={1.5} />
               </div>
               <span className="text-[15px] font-bold text-white">Invite Friends</span>
            </div>
            <ChevronRight size={20} className="text-gray-600" />
          </div>
        </div>
      </div>
    </div>
  );

  if (inSidebar) return isOpen ? content : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] md:hidden"
          />

          {/* Desktop/Mobile Sheet */}
          <motion.aside
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-80 z-[101] flex flex-col md:hidden"
          >
            {content}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ActivitiesSheet;
