import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Target, Smile, Frown, CheckCircle } from 'lucide-react';
import { cn } from './utils';
import { format } from 'date-fns';

interface WhatsNewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  announcements: any[];
  onMarkAsRead: (id: string) => void;
  onMarkAllRead: () => void;
  onVote: (id: string, voteType: 'like' | 'dislike') => void;
}

const WhatsNewSheet: React.FC<WhatsNewSheetProps> = ({ isOpen, onClose, announcements, onMarkAsRead, onMarkAllRead, onVote }) => {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [votes, setVotes] = useState<Record<string, 'like' | 'dislike'>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('read-announcements');
      if (stored) {
        setReadIds(JSON.parse(stored));
      }
      const storedVotes = localStorage.getItem('announcement-votes');
      if (storedVotes) {
        setVotes(JSON.parse(storedVotes));
      }
    } catch {}
  }, [isOpen, announcements]);

  const handleMarkAsRead = (id: string) => {
    onMarkAsRead(id);
    setReadIds(prev => [...new Set([...prev, id])]);
  };

  const handleMarkAllRead = () => {
    onMarkAllRead();
    setReadIds(announcements.map(a => a.id));
  };

  const handleVote = (id: string, type: 'like' | 'dislike') => {
    if (votes[id]) return; // Already voted
    onVote(id, type);
    const newVotes = { ...votes, [id]: type };
    setVotes(newVotes);
    localStorage.setItem('announcement-votes', JSON.stringify(newVotes));
  };

  const unreadCount = announcements.filter(a => !readIds.includes(a.id)).length;

  const content = (
    <div className="h-full w-full bg-[#1e1e1e] flex flex-col pt-safe text-white relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#121418] border-b border-white/5 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => selectedAnnouncement ? setSelectedAnnouncement(null) : onClose()} className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-95">
            <ArrowLeft size={24} />
          </button>
          {!selectedAnnouncement ? (
            <h2 className="text-xl font-bold">What's new?</h2>
          ) : (
            <h2 className="text-xl font-bold truncate pr-4">{selectedAnnouncement.title}</h2>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
        {!selectedAnnouncement ? (
          <div className="p-4 space-y-4">
             <div className="flex items-center justify-between mb-2">
               <div className="flex items-center gap-2 font-bold text-[15px]">
                 Unread <span className="w-5 h-5 rounded-full bg-yellow-500 text-black flex items-center justify-center text-xs ml-1">{unreadCount}</span>
               </div>
               {unreadCount > 0 && (
                 <button onClick={handleMarkAllRead} className="text-sm text-gray-400 hover:text-white transition-colors underline decoration-dashed underline-offset-4">
                   Mark all read
                 </button>
               )}
             </div>

             {announcements.length === 0 && (
               <div className="text-center text-gray-500 mt-10">No announcements yet.</div>
             )}

             {announcements.map((announcement) => {
               const isRead = readIds.includes(announcement.id);
               return (
                 <div 
                   key={announcement.id}
                   onClick={() => {
                     setSelectedAnnouncement(announcement);
                     if (!isRead) handleMarkAsRead(announcement.id);
                   }}
                   className="bg-[#2a2d35] rounded-xl p-4 cursor-pointer hover:bg-[#343842] transition-colors relative"
                 >
                   {!isRead && (
                     <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
                   )}
                   <div className="text-sm text-gray-400 mb-2">
                     {announcement.createdAt ? format(new Date(announcement.createdAt), 'dd.MM.yyyy') : ''}
                   </div>
                   <h3 className="text-lg font-bold mb-2 pr-6 flex items-center gap-2">
                     <Target className="text-red-500 shrink-0" size={18} />
                     <span className={cn(!isRead && "text-white", isRead && "text-gray-300")}>{announcement.title}</span>
                   </h3>
                   <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                     {announcement.message}
                   </p>
                   <div className="flex items-center gap-2 text-gray-500 text-sm">
                     <Smile size={16} /> <span>{announcement.likes || 0}</span>
                   </div>
                 </div>
               )
             })}
          </div>
        ) : (
          <div className="flex flex-col">
             <div className="p-4 flex flex-col gap-2">
               <h1 className="text-2xl font-black flex items-center gap-2">
                 <Target className="text-red-500 shrink-0" size={24} />
                 {selectedAnnouncement.title}
               </h1>
               <span className="text-gray-400 text-sm">
                 {selectedAnnouncement.createdAt ? format(new Date(selectedAnnouncement.createdAt), 'dd.MM.yyyy') : ''}
               </span>
             </div>

             {selectedAnnouncement.imageUrl && (
               <div className="w-full h-auto mt-2 mb-4">
                 <img src={selectedAnnouncement.imageUrl} alt={selectedAnnouncement.title} className="w-full object-cover max-h-64" />
               </div>
             )}

             <div className="p-4 text-[15px] leading-relaxed text-gray-300 pb-10">
               <div dangerouslySetInnerHTML={{ __html: selectedAnnouncement.message || '' }} className="prose prose-invert max-w-none prose-a:text-blue-400" />

               {selectedAnnouncement.linkUrl && (
                 <a href={selectedAnnouncement.linkUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-6 rounded-xl transition-colors">
                   Read more
                 </a>
               )}
             </div>

             <div className="p-4 border-t border-white/5 mt-auto flex items-center justify-between">
               <span className="font-bold">Like it?</span>
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => handleVote(selectedAnnouncement.id, 'like')}
                   disabled={!!votes[selectedAnnouncement.id]}
                   className={cn("flex items-center gap-2 bg-[#2a2d35] px-4 py-2 rounded-xl transition-all", votes[selectedAnnouncement.id] === 'like' ? "text-emerald-400 bg-emerald-500/10" : "hover:bg-white/10 disabled:opacity-50")}
                 >
                   <Smile size={18} /> {selectedAnnouncement.likes + (votes[selectedAnnouncement.id] === 'like' ? 1 : 0) || 0}
                 </button>
                 <button 
                   onClick={() => handleVote(selectedAnnouncement.id, 'dislike')}
                   disabled={!!votes[selectedAnnouncement.id]}
                   className={cn("flex items-center gap-2 bg-[#2a2d35] px-4 py-2 rounded-xl transition-all", votes[selectedAnnouncement.id] === 'dislike' ? "text-red-400 bg-red-500/10" : "hover:bg-white/10 disabled:opacity-50")}
                 >
                   <Frown size={18} /> {selectedAnnouncement.dislikes + (votes[selectedAnnouncement.id] === 'dislike' ? 1 : 0) || 0}
                 </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
           initial={{ x: '100%', opacity: 0 }}
           animate={{ x: 0, opacity: 1 }}
           exit={{ x: '100%', opacity: 0 }}
           transition={{ type: "spring", damping: 25, stiffness: 200 }}
           className="fixed inset-0 z-[1001] bg-[#121418] md:w-96 md:left-auto md:right-0 md:border-l md:border-white/5"
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WhatsNewSheet;
