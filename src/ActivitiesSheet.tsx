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
  onOpenCalendar: () => void;
  inSidebar?: boolean;
  unreadAnnouncementsCount?: number;
  clientAds?: any[];
}

const ActivitiesSheet: React.FC<ActivitiesSheetProps> = ({ 
  isOpen, onClose, onOpenLeaderboard, onOpenRewards, onOpenTournaments, 
  onOpenWhatsNew, onOpenReferral, onOpenCalendar, inSidebar = false, 
  unreadAnnouncementsCount = 0, clientAds = [] 
}) => {
  const content = (
    <div className={cn(
      "h-full w-full bg-bg-primary flex flex-col pt-safe scrollbar-hide",
      !inSidebar && "fixed md:relative right-0 top-0 md:w-80 border-l border-border-color z-50 shadow-2xl"
    )}>
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4">
        <h2 className="text-xl font-bold text-text-primary tracking-tight">Activities</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-text-primary transition-colors p-1">
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
                className="min-w-[130px] h-36 rounded-2xl p-4 flex flex-col justify-end relative overflow-hidden group cursor-pointer transition-transform active:scale-95 bg-bg-tertiary"
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
                 <span className="text-[13px] font-bold text-text-primary leading-tight relative shadow-sm drop-shadow-md z-10">{ad.title}</span>
              </a>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {/* Tournaments */}
          <div 
            onClick={onOpenTournaments}
            className="bg-bg-tertiary rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-bg-secondary transition-all group shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary">
                 <Trophy size={24} strokeWidth={1.5} />
               </div>
               <span className="text-[15px] font-bold text-text-primary">Tournaments</span>
            </div>
            <ChevronRight size={20} className="text-text-secondary" />
          </div>

          {/* Bonuses, Calendar, Top-20 Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div 
              onClick={onOpenRewards}
              className="bg-bg-tertiary rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-bg-secondary transition-all group shadow-sm"
            >
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
                <Gift size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-bold text-text-primary text-center leading-tight">Bonuses</span>
            </div>

            <div 
              onClick={onOpenCalendar}
              className="bg-bg-tertiary rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-bg-secondary transition-all group shadow-sm"
            >
              <div className="w-12 h-12 bg-[#a855f7]/10 rounded-2xl flex items-center justify-center text-[#a855f7]">
                <Calendar size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-bold text-text-primary text-center leading-tight">Calendar</span>
            </div>

            <div 
              onClick={onOpenLeaderboard}
              className="bg-bg-tertiary rounded-2xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-bg-secondary transition-all group shadow-sm relative"
            >
              <div className="absolute top-3 right-3 w-2 h-2 bg-[#ff4757] rounded-full drop-shadow-[0_0_4px_rgba(255,71,87,0.8)]" />
              <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary">
                <User size={24} strokeWidth={1.5} />
              </div>
              <span className="text-[13px] font-bold text-text-primary text-center leading-tight">Top-20</span>
            </div>
          </div>

          {/* What's new? */}
          <div onClick={onOpenWhatsNew} className="bg-bg-tertiary rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-bg-secondary transition-all active:scale-[0.98] group">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary">
                 <Megaphone size={24} strokeWidth={1.5} />
               </div>
               <span className="text-[15px] font-bold text-text-primary">What's new?</span>
            </div>
            <div className="flex items-center gap-3">
              {unreadAnnouncementsCount > 0 && (
                <div className="min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full px-1.5 shadow-lg shadow-red-500/20">
                  {unreadAnnouncementsCount}
                </div>
              )}
              <ChevronRight size={20} className="text-text-secondary" />
            </div>
          </div>

          {/* Invite Friends */}
          <div onClick={onOpenReferral} className="bg-bg-tertiary rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-bg-secondary transition-all active:scale-[0.98] group">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center text-text-secondary">
                 <UserPlus size={24} strokeWidth={1.5} />
               </div>
               <span className="text-[15px] font-bold text-text-primary">Invite Friends</span>
            </div>
            <ChevronRight size={20} className="text-text-secondary" />
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
