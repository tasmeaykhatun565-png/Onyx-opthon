import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, Gift, Users, TrendingUp, ChevronLeft, Info, Check, Share2, Award, 
  ArrowRight, Wallet, ShieldCheck, Zap, Download, Image as ImageIcon, 
  ExternalLink, Target, MousePointer2, UserPlus, BarChart3, Compass, User,
  ChevronRight, AlertCircle, Sparkles, Send, History as HistoryIcon
} from 'lucide-react';
import { cn } from './utils';
import { useToast } from './Toast';
import { db, handleFirestoreError, OperationType } from './firebase'; // Import db
import { collection, query, where, onSnapshot } from 'firebase/firestore'; // Import firestore functions

interface ReferralPageProps {
  user: any;
  referralSettings: any;
  currencySymbol: string;
  onBack: () => void;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({ user, referralSettings, currencySymbol, onBack }) => {
  const { showToast } = useToast();
  const referralCode = user ? (user.referralCode || (user.uid ? user.uid.slice(0, 8).toUpperCase() : 'LOGIN')) : 'LOGIN';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STATISTICS' | 'PAYOUTS' | 'PROMO'>('DASHBOARD');
  const [withdrawing, setWithdrawing] = useState(false);
  
  const [referralStats, setReferralStats] = useState({
    clicks: 0,
    registrations: 0,
    depositors: 0,
    activeTraders: 0,
    totalEarnings: 0,
    referralBalance: 0,
    recentReferrals: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) return;

    const q = query(collection(db, 'referrals'), where('referrerId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let stats = {
        clicks: 0,
        registrations: 0,
        depositors: 0,
        activeTraders: 0,
        totalEarnings: 0,
        referralBalance: 0,
        recentReferrals: [] as any[]
      };

      snapshot.forEach((doc) => {
        const data = doc.data();
        stats.registrations += 1;
        if (data.status === 'CLICK') stats.clicks += 1;
        if (data.status === 'DEPOSITOR') stats.depositors += 1;
        if (data.status === 'ACTIVE') stats.activeTraders += 1;
        stats.totalEarnings += data.earnings || 0;
        stats.referralBalance += data.earnings || 0;
        stats.recentReferrals.push({ ...data, id: doc.id });
      });

      setReferralStats(stats);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'referrals');
    });

    return () => unsubscribe();
  }, [user]);

  const shareVia = (platform: string) => {
    let url = '';
    const text = encodeURIComponent(`Start trading on OnyxTrade! Use my referral link: ${referralLink}`);
    
    if (platform === 'whatsapp') {
      url = `https://wa.me/?text=${text}`;
    } else if (platform === 'telegram') {
      url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`;
    }
    
    if (url) window.open(url, '_blank');
  };

  const marketingMaterials = [
    { title: 'Promo Banner 1', type: 'Static', size: '1080x1080', preview: 'https://images.unsplash.com/photo-1611974717482-48a8aeb49fb1?auto=format&fit=crop&q=80&w=400' },
    { title: 'Story Template', type: 'Static', size: '1080x1920', preview: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400' },
    { title: 'Trading Logo', type: 'Vector', size: 'SVG', preview: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=400' },
    { title: 'Affiliate Logo', type: 'Vector', size: 'SVG', preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400' }
  ];

  // Calculated stats based on real data
  const stats = {
    earnings: referralStats.totalEarnings,
    balance: referralStats.referralBalance,
    registrations: referralStats.registrations,
    clicks: referralStats.clicks, 
    ftds: referralStats.depositors,
    activeTraders: referralStats.activeTraders,
    conversionRate: referralStats.registrations ? ((referralStats.depositors / referralStats.registrations) * 100).toFixed(1) : "0.0",
    revenueShare: referralSettings.referralPercentage || 50,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Referral link copied to clipboard', 'success');
    });
  };

  const handleWithdraw = () => {
    if (stats.balance < 10) {
      showToast(`Minimum payout amount is ${currencySymbol}10.00`, 'error');
      return;
    }
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      showToast('Payout request submitted successfully!', 'success');
    }, 1500);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#0b0c0d] text-white font-sans selection:bg-blue-500/30">
      {/* Premium Header */}
      <div className="sticky top-0 z-50 bg-[#0b0c0d]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-95">
            <ChevronLeft size={24} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Affiliate Program</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Partner</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-[#1a1a1c] border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
             <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider">Tier 1</span>
           </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        
        {/* Earnings Overview Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617] p-8 border border-white/5 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 px-2 py-1 bg-blue-500/10 rounded-lg inline-block border border-blue-500/20">Partnership Balance</div>
                  <div className="text-5xl font-black text-white tracking-tighter drop-shadow-md">
                    {currencySymbol}{stats.balance.toFixed(2)}
                  </div>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={withdrawing || stats.balance < 10}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  {withdrawing ? 'Processing...' : 'Withdraw Payout'}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-8 border-t border-white/5">
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Today</div>
                  <div className="text-lg font-bold text-green-400">+{currencySymbol}0.00</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Yesterday</div>
                  <div className="text-lg font-bold text-white">{currencySymbol}0.00</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">All Time</div>
                  <div className="text-lg font-bold text-white">{currencySymbol}{stats.earnings.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between shadow-xl">
             <div>
               <div className="flex items-center justify-between mb-6">
                 <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                   <Target size={24} />
                 </div>
                 <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Revenue Share</div>
               </div>
               <h3 className="text-2xl font-bold mb-2">{stats.revenueShare}%</h3>
               <p className="text-xs text-gray-400 leading-relaxed">You earn {stats.revenueShare}% of the platform profit from every trade lost by your referrals.</p>
             </div>
             <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Next Tier</span>
                 <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">70% Share</span>
               </div>
               <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                 <div className="w-[15%] h-full bg-blue-500 rounded-full" />
               </div>
             </div>
          </div>
        </div>

        {/* Affiliate Link Section */}
        <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] p-8 shadow-xl">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 w-full">
              <h2 className="text-xl font-bold mb-2">Your Affiliate Link</h2>
              <p className="text-sm text-gray-400 mb-6">Share this link to invite users. Every signup and trade will be tracked to your account.</p>
              
              <div className="flex gap-3">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 font-mono text-sm text-gray-300 truncate flex items-center">
                  {referralLink}
                </div>
                <button 
                  onClick={handleCopy}
                  className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all active:scale-95 text-gray-300"
                >
                  {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="w-px h-24 bg-white/5 hidden md:block" />

            <div className="flex gap-4">
              <button 
                onClick={() => shareVia('whatsapp')}
                className="w-14 h-14 bg-[#25D366]/10 text-[#25D366] rounded-2xl flex items-center justify-center hover:bg-[#25D366]/20 transition-all active:scale-90"
              >
                <Share2 size={24} />
              </button>
              <button 
                onClick={() => shareVia('telegram')}
                className="w-14 h-14 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl flex items-center justify-center hover:bg-[#0088cc]/20 transition-all active:scale-90"
              >
                <Send size={24} />
              </button>
              <button 
                className="w-14 h-14 bg-white/5 text-white rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
              >
                <Download size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs System */}
        <div className="space-y-6">
          <div className="flex gap-8 border-b border-white/5">
            {['DASHBOARD', 'STATISTICS', 'PAYOUTS', 'PROMO'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={cn(
                  "pb-4 text-xs font-bold uppercase tracking-[0.2em] transition-all relative",
                  activeTab === tab ? "text-blue-500" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full shadow-[0_-4px_10px_rgba(59,130,246,0.5)]" />
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'DASHBOARD' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                 {[
                   { label: 'Clicks', value: stats.clicks, icon: <MousePointer2 size={18} />, color: 'blue' },
                   { label: 'Registrations', value: stats.registrations, icon: <UserPlus size={18} />, color: 'emerald' },
                   { label: 'Depositors (FTD)', value: stats.ftds, icon: <Wallet size={18} />, color: 'purple' },
                   { label: 'Active Traders', value: stats.activeTraders, icon: <Zap size={18} />, color: 'amber' },
                 ].map((card, i) => (
                   <div key={i} className="bg-[#1a1a1c] border border-white/5 p-6 rounded-3xl shadow-lg">
                      <div className={`p-2.5 rounded-xl bg-${card.color}-500/10 text-${card.color}-500 w-fit mb-4`}>
                        {card.icon}
                      </div>
                      <div className="text-3xl font-black text-white mb-0.5">{card.value}</div>
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{card.label}</div>
                   </div>
                 ))}
              </motion.div>
            )}

            {activeTab === 'STATISTICS' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] overflow-hidden">
                   <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Referrel Performance</h3>
                     <div className="flex gap-2">
                        {['7 Days', '30 Days', 'All Time'].map(p => (
                          <button key={p} className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] font-bold text-gray-400 hover:text-white transition-colors">{p}</button>
                        ))}
                     </div>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full">
                       <thead className="bg-white/[0.01]">
                         <tr className="text-left">
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">User Email</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">Registration Date</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">Status</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] text-right">Commission</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {referralStats.recentReferrals.length > 0 ? (
                           referralStats.recentReferrals.map((ref: any, idx: number) => (
                             <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                               <td className="px-6 py-5">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 text-xs font-bold">
                                     {ref.email.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="text-sm font-medium text-gray-300">{ref.email}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-5 text-sm text-gray-500">{new Date(ref.createdAt).toLocaleDateString()}</td>
                               <td className="px-6 py-5">
                                 <span className={cn(
                                   "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                   ref.status === 'Active' ? "bg-green-500/10 text-green-500" : "bg-gray-500/10 text-gray-500"
                                 )}>
                                   {ref.status || 'Active'}
                                 </span>
                               </td>
                               <td className="px-6 py-5 text-sm font-bold text-right text-gray-300">
                                 {currencySymbol}{ref.earnings?.toFixed(2) || '0.00'}
                               </td>
                             </tr>
                           ))
                         ) : (
                           <tr>
                             <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic text-sm">No referrals tracked yet. Start sharing your link to earn!</td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'PAYOUTS' && (
              <motion.div 
                 key="payouts"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                 <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] p-8">
                   <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 w-fit mb-6">
                     <AlertCircle size={24} />
                   </div>
                   <h3 className="text-xl font-bold mb-4">How it works</h3>
                   <div className="space-y-4">
                     {[
                       'Earnings are calculated in real-time on every referral trade.',
                       `Minimum payout amount is ${currencySymbol}10.00.`,
                       'Funds are transferred directly to your balance.',
                       'Payout requests are reviewed internally within 24 hours.'
                     ].map((text, i) => (
                       <div key={i} className="flex gap-3 items-start">
                         <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0 mt-0.5">
                           <Check size={12} strokeWidth={3} />
                         </div>
                         <p className="text-xs text-gray-400 leading-relaxed">{text}</p>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] p-8 flex flex-col justify-center items-center text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                      <HistoryIcon size={32} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No Payout History</h3>
                    <p className="text-xs text-gray-500 max-w-[200px]">You haven't requested any payouts yet. Your earnings will appear here.</p>
                 </div>
              </motion.div>
            )}

            {activeTab === 'PROMO' && (
              <motion.div 
                 key="promo"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                 {marketingMaterials.map((item, idx) => (
                   <div key={idx} className="bg-[#1a1a1c] border border-white/5 rounded-[2rem] overflow-hidden group">
                      <div className="aspect-[16/9] relative bg-black/40 overflow-hidden">
                        <img src={item.preview} alt={item.title} className="w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1c] to-transparent opacity-60" />
                        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {item.size}
                        </div>
                      </div>
                      <div className="p-6 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white mb-1">{item.title}</div>
                          <div className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">{item.type} Material</div>
                        </div>
                        <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                          <Download size={18} className="text-gray-400" />
                        </button>
                      </div>
                   </div>
                 ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
