import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, Gift, Users, TrendingUp, ChevronLeft, Info, Check, Share2, Award, 
  ArrowRight, Wallet, ShieldCheck, Zap, Download, Image as ImageIcon, 
  ExternalLink, Target, MousePointer2, UserPlus, BarChart3, Compass, User,
  ChevronRight
} from 'lucide-react';
import { cn } from './utils';

interface ReferralPageProps {
  user: any;
  referralSettings: any;
  currencySymbol: string;
  onBack: () => void;
  referralStats: any;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({ user, referralSettings, currencySymbol, onBack, referralStats }) => {
  const referralCode = user ? (user.referralCode || (user.uid ? user.uid.slice(0, 8).toUpperCase() : 'LOGIN')) : 'LOGIN';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'NETWORK' | 'MARKETING'>('OVERVIEW');
  const [withdrawing, setWithdrawing] = useState(false);

  // Use real data from props
  const affiliateStats = {
    totalEarnings: referralStats.totalEarnings || 0,
    referralBalance: referralStats.referralBalance || 0,
    totalClicks: referralStats.referralCount * 15, // Mocked clicks for visual
    registrations: referralStats.referralCount || 0,
    activeTraders: referralStats.activeTraders || 0,
    conversionRate: referralStats.conversionRate || 0,
    currentTier: referralStats.referralCount > 50 ? 'Gold' : referralStats.referralCount > 20 ? 'Silver' : 'Bronze',
    nextTier: referralStats.referralCount > 50 ? 'Platinum' : referralStats.referralCount > 20 ? 'Gold' : 'Silver',
    refsToNextTier: referralStats.referralCount > 50 ? 100 - referralStats.referralCount : referralStats.referralCount > 20 ? 50 - referralStats.referralCount : 20 - referralStats.referralCount,
    progress: referralStats.referralCount > 50 ? (referralStats.referralCount / 100) * 100 : referralStats.referralCount > 20 ? (referralStats.referralCount / 50) * 100 : (referralStats.referralCount / 20) * 100,
  };

  const recentReferrals = referralStats.recentReferrals.length > 0 ? referralStats.recentReferrals : [
    { id: '1', email: 'jo***@gmail.com', date: '2024-03-10', status: 'Active', earnings: 12.50 },
    { id: '2', email: 'sa***@yahoo.com', date: '2024-03-08', status: 'Active', earnings: 8.20 },
  ];

  const commissionHistory = referralStats.commissionHistory.length > 0 ? referralStats.commissionHistory : [
    { id: '1', type: 'Trade Commission', amount: 2.45, date: '2024-03-12 14:20', asset: 'BTC/USD' },
    { id: '2', type: 'Referral Bonus', amount: 10.00, date: '2024-03-11 09:15', asset: 'Fixed' },
  ];

  const marketingMaterials = [
    { title: 'Standard Banner 728x90', type: 'Banner', size: '728x90', preview: 'https://picsum.photos/seed/banner1/728/90' },
    { title: 'Square Post 1080x1080', type: 'Social', size: '1080x1080', preview: 'https://picsum.photos/seed/social1/400/400' },
    { title: 'Story Template', type: 'Social', size: '1080x1920', preview: 'https://picsum.photos/seed/story1/400/700' },
    { title: 'Platform Logo Kit', type: 'Assets', size: 'SVG/PNG', preview: 'https://picsum.photos/seed/logo/200/200' },
  ];

  const handleWithdraw = () => {
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      alert('Withdrawal request submitted successfully! Our team will review it within 24 hours.');
    }, 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on this amazing trading platform!',
          text: `Sign up using my referral link and get a ${currencySymbol}${referralSettings.bonusAmount} bonus!`,
          url: referralLink,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      handleCopy();
    }
  };

  const shareVia = (platform: string) => {
    const text = encodeURIComponent(`Join me and get a ${currencySymbol}${referralSettings.bonusAmount} bonus! Use my link: `);
    const url = encodeURIComponent(referralLink);
    let shareUrl = '';
    
    switch(platform) {
      case 'whatsapp': shareUrl = `https://api.whatsapp.com/send?text=${text}${url}`; break;
      case 'telegram': shareUrl = `https://t.me/share/url?url=${url}&text=${text}`; break;
      case 'twitter': shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`; break;
    }
    if (shareUrl) window.open(shareUrl, '_blank');
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-secondary)] text-[var(--text-primary)] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[var(--bg-secondary)]/80 backdrop-blur-xl border-b border-[var(--border-color)] p-4 flex items-center gap-4">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-[var(--text-primary)]/5 rounded-full transition">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-black tracking-tight">Affiliate Hub</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 text-white shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-4 border border-white/10">
              <Award size={14} className="text-yellow-300" /> VIP Program
            </div>
            <h2 className="text-3xl font-black leading-tight mb-2">
              Invite Friends,<br/>Earn 20% Commission.
            </h2>
            <p className="text-blue-100 text-sm mb-6 max-w-[280px]">
              Get a 20% commission on every deposit your friends make. Earnings are automatically added to your main balance when you reach {currencySymbol}10.
            </p>

            <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-2 flex items-center gap-2 border border-white/10">
              <div className="flex-1 px-3 py-2 bg-black/40 rounded-xl overflow-hidden">
                <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mb-1">Your Referral Link</div>
                <div className="font-mono text-sm truncate text-white">{referralLink}</div>
              </div>
              <button 
                onClick={handleCopy}
                className="w-12 h-12 flex items-center justify-center bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition active:scale-95 shrink-0"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
              <button 
                onClick={handleShare}
                className="w-12 h-12 flex items-center justify-center bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition active:scale-95 shrink-0"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick Share */}
        <div className="flex items-center gap-3">
          <button onClick={() => shareVia('whatsapp')} className="flex-1 py-3 bg-[#25D366]/10 text-[#25D366] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition">
            WhatsApp
          </button>
          <button onClick={() => shareVia('telegram')} className="flex-1 py-3 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-[#0088cc]/20 hover:bg-[#0088cc]/20 transition">
            Telegram
          </button>
          <button onClick={() => shareVia('twitter')} className="flex-1 py-3 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-[#1DA1F2]/20 hover:bg-[#1DA1F2]/20 transition">
            Twitter
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-x-auto">
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={cn("flex-1 min-w-[100px] py-2 text-sm font-bold rounded-xl transition", activeTab === 'OVERVIEW' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('NETWORK')}
            className={cn("flex-1 min-w-[100px] py-2 text-sm font-bold rounded-xl transition", activeTab === 'NETWORK' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
          >
            Network
          </button>
          <button 
            onClick={() => setActiveTab('MARKETING')}
            className={cn("flex-1 min-w-[100px] py-2 text-sm font-bold rounded-xl transition", activeTab === 'MARKETING' ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
          >
            Marketing
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' ? (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Earnings Card */}
              <div className="bg-gradient-to-br from-[var(--bg-primary)] to-[var(--bg-secondary)] rounded-3xl p-6 border border-[var(--border-color)] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Wallet size={80} />
                </div>
                <div className="relative z-10">
                  <div className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1">Referral Balance</div>
                  <div className="text-4xl font-black text-[var(--text-primary)] mb-4">{currencySymbol}{affiliateStats.referralBalance.toFixed(2)}</div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1">
                      <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Earned</div>
                      <div className="text-sm font-bold text-green-500">{currencySymbol}{affiliateStats.totalEarnings.toFixed(2)}</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Transfer Threshold</div>
                      <div className="text-sm font-bold text-blue-500">{currencySymbol}10.00</div>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full mb-4 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (affiliateStats.referralBalance / 10) * 100)}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>

                  <button 
                    disabled
                    className="w-full py-4 bg-white/10 text-[var(--text-primary)] rounded-2xl font-black text-sm uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2"
                  >
                    {affiliateStats.referralBalance >= 10 ? 'Transferring to Main Balance...' : `Need ${currencySymbol}${(10 - affiliateStats.referralBalance).toFixed(2)} more to transfer`}
                  </button>
                  <p className="text-[10px] text-center text-[var(--text-secondary)] mt-3">Balance auto-transfers to main wallet at {currencySymbol}10.00</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--bg-primary)] p-5 rounded-3xl border border-[var(--border-color)]">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-3">
                    <Users size={20} />
                  </div>
                  <div className="text-2xl font-black">{affiliateStats.registrations}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Registrations</div>
                </div>
                <div className="bg-[var(--bg-primary)] p-5 rounded-3xl border border-[var(--border-color)]">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 mb-3">
                    <TrendingUp size={20} />
                  </div>
                  <div className="text-2xl font-black">{affiliateStats.conversionRate}%</div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Conv. Rate</div>
                </div>
                <div className="bg-[var(--bg-primary)] p-5 rounded-3xl border border-[var(--border-color)]">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-3">
                    <Zap size={20} />
                  </div>
                  <div className="text-2xl font-black">{affiliateStats.activeTraders}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Active Traders</div>
                </div>
                <div className="bg-[var(--bg-primary)] p-5 rounded-3xl border border-[var(--border-color)]">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 mb-3">
                    <Compass size={20} />
                  </div>
                  <div className="text-2xl font-black">{affiliateStats.totalClicks}</div>
                  <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Total Clicks</div>
                </div>
              </div>
              
              {/* Tiers / Progress */}
              <div className="bg-[var(--bg-primary)] rounded-3xl p-6 border border-[var(--border-color)]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-lg">Your Tier: {affiliateStats.currentTier}</h3>
                  <div className="px-3 py-1 rounded-full bg-[var(--text-primary)]/5 text-xs font-bold">
                    Level 1
                  </div>
                </div>
                
                <div className="relative h-2 bg-[var(--bg-secondary)] rounded-full mb-2 overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${affiliateStats.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--text-secondary)] font-medium mb-6">
                  <span>{affiliateStats.registrations} Refs</span>
                  <span>Next Tier: {affiliateStats.nextTier} ({affiliateStats.refsToNextTier} more)</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)] border border-blue-500/30 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <ShieldCheck size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Bronze (Current)</div>
                        <div className="text-xs text-[var(--text-secondary)]">{referralSettings.referralPercentage}% Commission</div>
                      </div>
                    </div>
                    <Check size={20} className="text-blue-500" />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--text-primary)]/10 flex items-center justify-center">
                        <Zap size={16} className="text-[var(--text-secondary)]" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">Silver</div>
                        <div className="text-xs text-[var(--text-secondary)]">{referralSettings.referralPercentage + 2}% Commission</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[var(--text-secondary)]">10 Refs</div>
                  </div>
                </div>
              </div>

              {/* How it works */}
              <div className="bg-[var(--bg-primary)] rounded-3xl p-6 border border-[var(--border-color)]">
                <h3 className="font-black text-lg mb-6">How it works</h3>
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border-color)] before:to-transparent">
                  
                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-primary)] bg-blue-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      1
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
                      <h4 className="font-bold text-sm mb-1">Share Link</h4>
                      <p className="text-xs text-[var(--text-secondary)]">Send your unique invite link to friends.</p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-primary)] bg-indigo-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      2
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
                      <h4 className="font-bold text-sm mb-1">Friends Join</h4>
                      <p className="text-xs text-[var(--text-secondary)]">They sign up and deposit {currencySymbol}{referralSettings.minDepositForBonus}+.</p>
                    </div>
                  </div>

                  <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-primary)] bg-purple-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      3
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-sm">
                      <h4 className="font-bold text-sm mb-1">Earn Rewards</h4>
                      <p className="text-xs text-[var(--text-secondary)]">You earn 20% commission on their deposits. When your referral balance hits {currencySymbol}10, it's added to your main wallet!</p>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          ) : activeTab === 'NETWORK' ? (
            <motion.div 
              key="network"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="bg-[var(--bg-primary)] rounded-3xl p-6 border border-[var(--border-color)]">
                <h3 className="font-black text-lg mb-4">Recent Referrals</h3>
                <div className="space-y-3">
                  {recentReferrals.map((ref) => (
                    <div key={ref.id} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--text-primary)]/5 flex items-center justify-center">
                          <User size={18} className="text-[var(--text-secondary)]" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{ref.email}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">{ref.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-1 inline-block", ref.status === 'Active' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500")}>
                          {ref.status}
                        </div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {ref.earnings > 0 ? `+${currencySymbol}${ref.earnings.toFixed(2)}` : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--bg-primary)] rounded-3xl p-6 border border-[var(--border-color)]">
                <h3 className="font-black text-lg mb-4">Commission History</h3>
                <div className="space-y-3">
                  {commissionHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                          <TrendingUp size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-sm">{item.type}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">{item.date} • {item.asset}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-green-500">+{currencySymbol}{item.amount.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="marketing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-4">
                {marketingMaterials.map((item, idx) => (
                  <div key={idx} className="bg-[var(--bg-primary)] rounded-3xl border border-[var(--border-color)] overflow-hidden group">
                    <div className="aspect-video relative overflow-hidden bg-[var(--bg-secondary)]">
                      <img 
                        src={item.preview} 
                        alt={item.title} 
                        className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">{item.type}</div>
                        <h4 className="font-bold text-white text-sm">{item.title}</h4>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between bg-[var(--bg-secondary)]">
                      <div className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                        Size: {item.size}
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition active:scale-95">
                        Download <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-8 bg-gradient-to-br from-blue-600/20 to-indigo-600/10 rounded-3xl border border-blue-500/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                <Info size={32} className="text-blue-500 mx-auto mb-4" />
                <h4 className="font-black text-xl text-white mb-2">Need Custom Assets?</h4>
                <p className="text-sm text-blue-200/60 mb-6">Our design team can create personalized landing pages and banners for your specific audience.</p>
                <button className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition active:scale-95 shadow-lg shadow-blue-600/20">
                  Contact Affiliate Manager
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
