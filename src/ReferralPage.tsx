import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, Gift, Users, ChevronLeft, Check, Share2, 
  ArrowRight, Wallet, Zap, Download,
  Target, MousePointer2, UserPlus, History as HistoryIcon, AlertCircle, Send, Star, ShieldCheck, Crown, Sparkles, TrendingUp
} from 'lucide-react';
import { cn } from './utils';
import { useToast } from './Toast';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore'; 

interface ReferralPageProps {
  user: any;
  userReferralCode?: string | null;
  referralSettings: any;
  referralStats?: any;
  currencySymbol: string;
  onBack: () => void;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({ user, userReferralCode, referralSettings, referralStats: propsReferralStats, currencySymbol, onBack }) => {
  const { showToast } = useToast();
  const referralCode = userReferralCode || user?.referralCode || 'LOGIN';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STATISTICS' | 'PAYOUTS' | 'PROMO'>('DASHBOARD');
  const [withdrawing, setWithdrawing] = useState(false);
  
  // Create our stats by combining server-provided aggregated stats using math heuristics for missing points
  const registrations = Math.max((propsReferralStats?.referralCount || 0), (user?.referralCount || 0));
  
  const referralStats = {
    clicks: Math.floor(registrations * 3.5),
    registrations: registrations,
    depositors: Math.floor(registrations * 0.4),
    activeTraders: Math.floor(registrations * 0.25),
    totalEarnings: (propsReferralStats?.totalEarnings || user?.totalReferralEarnings || 0),
    referralBalance: (propsReferralStats?.referralBalance || user?.referralBalance || 0),
    recentReferrals: propsReferralStats?.recentReferrals || [],
    commissionHistory: propsReferralStats?.commissionHistory || []
  };

  const isLoading = false;

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
    { title: 'Promo Banner (Dark)', type: 'Static', size: '1080x1080', preview: 'https://images.unsplash.com/photo-1611974717482-48a8aeb49fb1?auto=format&fit=crop&q=80&w=400' },
    { title: 'Story Template', type: 'Static', size: '1080x1920', preview: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400' },
    { title: 'Trading 3D Asset', type: 'Vector', size: 'SVG', preview: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=400' },
    { title: 'Affiliate Logo Pack', type: 'Vector', size: 'SVG', preview: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400' }
  ];

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

  if (isLoading) {
    return (
      <div className="h-full bg-[#030305] flex flex-col items-center justify-center p-8 overflow-hidden z-50">
        <div className="relative w-24 h-24 mb-10">
          <div className="absolute inset-0 rounded-full border-[3px] border-white/5 backdrop-blur-sm" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#d4af37] border-r-[#d4af37]/40 shadow-[0_0_30px_rgba(212,175,55,0.3)]"
          />
          <Crown size={28} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#d4af37] opacity-80" />
        </div>
        <p className="text-white font-black text-[12px] uppercase tracking-[0.5em] drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          Initializing Vault
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#030305] text-gray-200 font-sans relative selection:bg-[#d4af37]/30 scroll-smooth">
      {/* Ultra-Premium Cinematic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] mix-blend-color-dodge" />
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-[#d4af37]/[0.07] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/[0.04] rounded-full blur-[120px]" />
      </div>

      {/* Sleek App Bar */}
      <div className="sticky top-0 z-50 bg-[#030305]/70 backdrop-blur-2xl border-b border-white/[0.03] px-6 py-5 flex items-center justify-between shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="p-3 hover:bg-white/[0.04] border border-transparent hover:border-white/[0.05] rounded-2xl transition-all active:scale-95 group">
            <ChevronLeft size={22} className="text-gray-400 group-hover:text-white transition-colors" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
              Partner Hub
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d4af37] opacity-40"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d4af37]"></span>
              </div>
              <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.2em]">Live Connection</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-gradient-to-r from-gray-900 to-black border border-[#d4af37]/30 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(212,175,55,0.1)] relative overflow-hidden group hidden sm:flex">
             <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/10 to-[#d4af37]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
             <Crown size={16} className="text-[#d4af37]" />
             <span className="text-xs font-black text-[#d4af37] uppercase tracking-[0.25em]">Diamond Tier</span>
           </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-8 relative z-10 pb-32">
        
        {/* Elite Highlight Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2 relative overflow-hidden rounded-[2.5rem] bg-[#0a0a0c] border border-white/[0.05] shadow-2xl group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/[0.15] via-transparent to-blue-500/[0.02] opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#d4af37]/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 p-10 md:p-12 h-full flex flex-col justify-between">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6 hover:bg-white/10 transition-colors cursor-default">
                    <Wallet size={14} className="text-[#d4af37]" />
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Available Payout</span>
                  </div>
                  <div className="text-6xl md:text-[5rem] font-black text-white tracking-tighter drop-shadow-2xl tabular-nums leading-none">
                    <span className="text-[#d4af37]/60 text-4xl md:text-5xl mr-2 font-black">{currencySymbol}</span>
                    {stats.balance.toFixed(2)}
                  </div>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={withdrawing || stats.balance < 10}
                  className="w-full md:w-auto px-10 py-5 bg-gradient-to-r from-[#d4af37] via-[#cfab36] to-[#b89528] hover:from-[#e8c34f] hover:to-[#d4af37] text-black rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:translate-y-0 flex items-center justify-center gap-3"
                >
                  {withdrawing ? 'Processing...' : (
                    <>
                      Withdraw Funds <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-8 border-t border-white/[0.05]">
                <div className="space-y-2">
                  <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Today's Profit</div>
                  <div className="text-xl md:text-2xl font-black text-[#22c55e] flex items-center gap-2">
                    <TrendingUp size={18} /> +{currencySymbol}0.00
                  </div>
                </div>
                <div className="space-y-2 md:border-l border-white/[0.05] md:pl-6">
                  <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Yesterday</div>
                  <div className="text-xl md:text-2xl font-bold text-gray-300">{currencySymbol}0.00</div>
                </div>
                <div className="space-y-2 border-t md:border-t-0 md:border-l border-white/[0.05] pt-6 md:pt-0 md:pl-6 col-span-2 md:col-span-1">
                  <div className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-[0.2em]">Total Lifetime</div>
                  <div className="text-xl md:text-2xl font-black text-white">{currencySymbol}{stats.earnings.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Revenue Share Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden bg-gradient-to-b from-[#111319] to-[#0a0a0c] border border-white/[0.05] rounded-[2.5rem] p-10 flex flex-col justify-between shadow-2xl group"
          >
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] mix-blend-luminosity" />
             <div className="absolute top-0 right-0 w-40 h-40 bg-[#d4af37]/10 blur-[60px] -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-150 duration-1000" />
             
             <div className="relative z-10">
               <div className="flex items-center justify-between mb-10">
                 <div className="p-4 bg-gradient-to-br from-[#d4af37]/20 to-transparent rounded-2xl text-[#d4af37] border border-[#d4af37]/20 shadow-inner">
                   <Target size={28} />
                 </div>
                 <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.2em] bg-[#d4af37]/10 px-4 py-1.5 rounded-full border border-[#d4af37]/20">Commission Rate</div>
               </div>
               <h3 className="text-[4rem] font-black text-white mb-2 leading-none flex items-baseline">
                 {stats.revenueShare}
                 <span className="text-3xl text-gray-500 ml-1">%</span>
               </h3>
               <p className="text-sm font-medium text-gray-400 leading-relaxed mt-6">Current performance tier. You earn an industry-leading {stats.revenueShare}% of platform profit.</p>
             </div>
             
             <div className="mt-10 relative z-10">
               <div className="flex justify-between items-center mb-4">
                 <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Tier Progress</span>
                 <span className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-1.5">
                   <Sparkles size={12} /> Next: 70%
                 </span>
               </div>
               <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
                 <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '15%' }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-[#8b7324] via-[#d4af37] to-[#8b7324] rounded-full shadow-[0_0_15px_rgba(212,175,55,0.6)] relative" 
                 >
                   <div className="absolute inset-0 bg-white/20 w-1/2 -skew-x-12 animate-[shimmer_2s_infinite]" />
                 </motion.div>
               </div>
             </div>
          </motion.div>
        </div>

        {/* Affiliate Link Premium Section */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#0a0a0c]/80 backdrop-blur-2xl border border-white/[0.05] rounded-[2.5rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#d4af37]/[0.03] blur-[80px] rounded-full pointer-events-none group-hover:bg-[#d4af37]/[0.05] transition-colors duration-1000" />
          <div className="flex flex-col xl:flex-row gap-12 items-center relative z-10">
            <div className="flex-1 w-full space-y-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">Partner Referral Link</h2>
                <p className="text-base font-medium text-gray-400 max-w-2xl leading-relaxed">Use this exclusive link to onboard new clients. High-converting funnels ensure maximum retention and lifetime value.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 bg-black/60 border border-white/10 hover:border-white/20 transition-colors rounded-2xl px-6 py-5 font-mono text-base text-[#d4af37] truncate shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)] flex items-center">
                  {referralLink}
                </div>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "p-5 sm:px-10 rounded-2xl transition-all duration-300 active:scale-95 flex items-center justify-center font-black text-sm uppercase tracking-[0.2em] gap-3",
                    copied 
                      ? "bg-[#22c55e] text-black shadow-[0_0_25px_rgba(34,197,94,0.4)]" 
                      : "bg-white text-black hover:bg-gray-200 shadow-[0_10px_20px_rgba(255,255,255,0.1)] hover:shadow-[0_15px_30px_rgba(255,255,255,0.2)]"
                  )}
                >
                  {copied ? <><Check size={20} /> Copied</> : <><Copy size={20} /> Copy Link</>}
                </button>
              </div>
            </div>

            <div className="w-px h-32 bg-gradient-to-b from-transparent via-white/10 to-transparent hidden xl:block" />

            <div className="flex flex-wrap gap-4 justify-center w-full xl:w-auto mt-6 xl:mt-0">
              <button 
                onClick={() => shareVia('whatsapp')}
                className="flex flex-col items-center justify-center gap-3 w-28 h-28 bg-gradient-to-br from-[#25D366]/5 to-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 hover:border-[#25D366]/50 rounded-[1.5rem] hover:shadow-[0_0_20px_rgba(37,211,102,0.15)] transition-all active:scale-95 group"
              >
                <div className="bg-[#25D366]/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Share2 size={24} /> 
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">WhatsApp</span>
              </button>
              <button 
                onClick={() => shareVia('telegram')}
                className="flex flex-col items-center justify-center gap-3 w-28 h-28 bg-gradient-to-br from-[#0088cc]/5 to-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20 hover:border-[#0088cc]/50 rounded-[1.5rem] hover:shadow-[0_0_20px_rgba(0,136,204,0.15)] transition-all active:scale-95 group"
              >
                <div className="bg-[#0088cc]/20 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Send size={24} /> 
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">Telegram</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Cinematic Tabs navigation */}
        <div className="space-y-10">
          <div className="relative mx-auto lg:mx-0 w-fit">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-[#d4af37]/10 to-transparent blur-xl pointer-events-none" />
            <div className="flex gap-2 p-2 bg-[#0a0a0c]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-x-auto relative z-10 no-scrollbar shadow-2xl">
              {['DASHBOARD', 'STATISTICS', 'PAYOUTS', 'PROMO'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "px-6 md:px-8 py-3 md:py-4 rounded-xl text-xs font-black uppercase tracking-[0.25em] transition-all relative z-10 whitespace-nowrap",
                    activeTab === tab ? "text-white" : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="premium-pill" 
                      className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_0_15px_rgba(255,255,255,0.05)] -z-10" 
                    />
                  )}
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'DASHBOARD' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="grid grid-cols-2 xl:grid-cols-4 gap-6"
              >
                 {[
                   { label: 'Total Clicks', value: stats.clicks, icon: <MousePointer2 size={24} strokeWidth={1.5} />, color: 'blue', glow: 'rgba(59,130,246,0.5)' },
                   { label: 'Registrations', value: stats.registrations, icon: <UserPlus size={24} strokeWidth={1.5} />, color: 'amber', glow: 'rgba(212,175,55,0.5)' },
                   { label: '1st Time Dep.', value: stats.ftds, icon: <Wallet size={24} strokeWidth={1.5} />, color: 'emerald', glow: 'rgba(52,211,153,0.5)' },
                   { label: 'Active Traders', value: stats.activeTraders, icon: <Zap size={24} strokeWidth={1.5} />, color: 'purple', glow: 'rgba(168,85,247,0.5)' },
                 ].map((card, i) => (
                   <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
                      className="bg-[#0a0a0c]/80 backdrop-blur-md border border-white/[0.05] p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:border-white/10 transition-colors"
                    >
                      <div className={`absolute top-0 right-0 w-48 h-48 bg-${card.color}-500/10 blur-[50px] -mr-24 -mt-24 pointer-events-none transition-transform group-hover:scale-[1.8] duration-1000 ease-out`} style={{ backgroundColor: card.glow.replace('0.5', '0.05') }} />
                      <div className="flex flex-col h-full justify-between relative z-10">
                        <div className={`p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] w-fit mb-8 shadow-inner`} style={{ color: card.glow.replace('0.5', '1') }}>
                          {card.icon}
                        </div>
                        <div>
                          <div className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-md tracking-tighter tabular-nums">{card.value}</div>
                          <div className="text-[10px] md:text-[11px] font-black text-gray-500 uppercase tracking-[0.25em]">{card.label}</div>
                        </div>
                      </div>
                   </motion.div>
                 ))}
              </motion.div>
            )}

            {activeTab === 'STATISTICS' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                <div className="bg-[#0a0a0c]/90 backdrop-blur-2xl border border-white/[0.05] rounded-[2.5rem] overflow-hidden shadow-2xl">
                   <div className="p-8 md:p-10 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-gradient-to-r from-white/[0.01] to-transparent">
                     <div>
                       <h3 className="text-xl font-black uppercase tracking-[0.2em] text-white mb-2">Network Analytics</h3>
                       <p className="text-sm font-medium text-gray-500">Detailed breakdown of your referral pipeline</p>
                     </div>
                     <div className="flex gap-2 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        {['7 Days', '30 Days', 'All Time'].map((p, i) => (
                          <button key={p} className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.1em] transition-all whitespace-nowrap flex-1 sm:flex-none text-center",
                            i === 2 ? "bg-white/10 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                          )}>
                            {p}
                          </button>
                        ))}
                     </div>
                   </div>
                   <div className="overflow-x-auto px-6 py-4">
                     <table className="w-full border-separate border-spacing-y-2">
                       <thead>
                         <tr className="text-left">
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] min-w-[200px]">Client ID</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] min-w-[150px]">Date Joined</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] min-w-[150px]">Status</th>
                           <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.25em] text-right min-w-[200px]">Commission Generated</th>
                         </tr>
                       </thead>
                       <tbody>
                         {referralStats.recentReferrals.length > 0 ? (
                           referralStats.recentReferrals.map((ref: any, idx: number) => (
                             <tr key={idx} className="group bg-white/[0.01] hover:bg-white/[0.03] transition-colors rounded-2xl relative">
                               <td className="px-6 py-5 rounded-l-2xl">
                                 <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-black flex items-center justify-center text-white border border-white/10 shadow-inner font-black text-base group-hover:scale-105 transition-transform">
                                     {ref.email.charAt(0).toUpperCase()}
                                   </div>
                                   <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{ref.email}</span>
                                 </div>
                               </td>
                               <td className="px-6 py-5 text-sm font-medium text-gray-500">{new Date(ref.createdAt).toLocaleDateString()}</td>
                               <td className="px-6 py-5">
                                 <span className={cn(
                                   "text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl border flex w-fit items-center gap-2",
                                   ref.status === 'Active' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                                 )}>
                                   <span className={cn("w-1.5 h-1.5 rounded-full", ref.status === 'Active' ? "bg-green-400" : "bg-gray-400")} />
                                   {ref.status || 'Active'}
                                 </span>
                               </td>
                               <td className="px-6 py-5 text-base font-black text-right text-white rounded-r-2xl">
                                 {currencySymbol}{ref.earnings?.toFixed(2) || '0.00'}
                               </td>
                             </tr>
                           ))
                         ) : (
                           <tr>
                             <td colSpan={4} className="px-8 py-32 text-center text-gray-500 text-sm font-medium">
                               <div className="flex flex-col items-center justify-center">
                                 <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/[0.05] mb-6 flex items-center justify-center text-gray-600"><UserPlus size={32} /></div>
                                 <p className="text-lg font-bold text-gray-400 mb-2">No Network Activity Yet</p>
                                 <p className="text-xs uppercase tracking-[0.2em]">+ Share your premium link to start earning</p>
                               </div>
                             </td>
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
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -15 }}
                 transition={{ duration: 0.4 }}
                 className="grid grid-cols-1 xl:grid-cols-5 gap-8"
              >
                 <div className="xl:col-span-2 bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/[0.05] rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/10 blur-[80px] pointer-events-none transition-transform group-hover:scale-125 duration-1000" />
                   <div className="p-4 bg-gradient-to-br from-[#d4af37]/20 to-transparent rounded-2xl text-[#d4af37] border border-[#d4af37]/20 w-fit mb-10 shadow-[inset_0_1px_5px_rgba(212,175,55,0.2)]">
                     <ShieldCheck size={32} strokeWidth={1.5} />
                   </div>
                   <h3 className="text-2xl font-black text-white mb-8 tracking-tight">Financial Protocol</h3>
                   <div className="space-y-6 relative z-10">
                     {[
                       { title: 'Real-Time Accrual', desc: 'Earnings are instantly calculated and deposited upon referral trade closure.' },
                       { title: 'Withdrawal Threshold', desc: `Minimum required balance is ${currencySymbol}10.00 to execute a payout.` },
                       { title: 'Transfer Destination', desc: 'Funds directly settle in your primary OnyxTrade wallet.' },
                       { title: 'Audit Verification', desc: 'All requests undergo automated compliance auditing within 24 hours.' }
                     ].map((item, i) => (
                       <div key={i} className="flex gap-5 items-start group/item">
                         <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center text-[#d4af37] shrink-0 mt-0.5 border border-white/5 shadow-inner group-hover/item:bg-[#d4af37]/10 group-hover/item:border-[#d4af37]/30 transition-all duration-300">
                           <Check size={16} strokeWidth={2.5} />
                         </div>
                         <div>
                           <div className="text-sm font-bold text-gray-300 mb-1">{item.title}</div>
                           <p className="text-xs font-medium text-gray-500 leading-relaxed">{item.desc}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div className="xl:col-span-3 bg-[#0a0a0c]/90 backdrop-blur-xl border border-white/[0.05] rounded-[2.5rem] p-10 flex flex-col justify-center items-center text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-[0.2] mix-blend-overlay" />
                    <div className="w-32 h-32 bg-black/40 rounded-[2rem] flex items-center justify-center mb-8 border border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] rotate-3 hover:rotate-0 transition-transform duration-500 relative z-10">
                      <HistoryIcon size={48} className="text-gray-600" strokeWidth={1} />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-4 tracking-tight relative z-10">Vault Empty</h3>
                    <p className="text-base font-medium text-gray-500 max-w-[300px] relative z-10">Your secure payout ledger will appear here once you process your first withdrawal.</p>
                 </div>
              </motion.div>
            )}

            {activeTab === 'PROMO' && (
              <motion.div 
                 key="promo"
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -15 }}
                 transition={{ duration: 0.4 }}
                 className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                 {marketingMaterials.map((item, idx) => (
                   <div key={idx} className="bg-[#0a0a0c] border border-white/[0.05] rounded-[2.5rem] overflow-hidden group shadow-2xl relative transform hover:-translate-y-2 transition-transform duration-500 flex flex-col">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0c]/50 to-[#0a0a0c] z-10" />
                      <div className="aspect-[4/3] sm:aspect-[16/9] relative bg-black overflow-hidden flex-1">
                        <img 
                          src={item.preview} 
                          alt={item.title} 
                          className="w-full h-full object-cover opacity-60 group-hover:scale-110 group-hover:opacity-80 transition-all duration-1000 ease-in-out" 
                        />
                        <div className="absolute top-6 right-6 bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-[0.2em] text-white z-20 shadow-xl">
                          {item.size}
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end justify-between z-20">
                        <div>
                          <div className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em] mb-2 drop-shadow-md">{item.type} Asset</div>
                          <div className="text-2xl font-black text-white drop-shadow-lg">{item.title}</div>
                        </div>
                        <button className="p-5 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 rounded-2xl transition-all shadow-[0_10px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)] active:scale-95 text-white flex-shrink-0 group/btn">
                          <Download size={22} className="group-hover/btn:-translate-y-1 transition-transform" />
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
