import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, Gift, Users, TrendingUp, ChevronLeft, Info, Check, Share2, Award, 
  ArrowRight, Wallet, ShieldCheck, Zap, Download, Image as ImageIcon, 
  ExternalLink, Target, MousePointer2, UserPlus, BarChart3, Compass, User,
  ChevronRight, AlertCircle, Sparkles
} from 'lucide-react';
import { cn } from './utils';
import { useToast } from './Toast';

interface ReferralPageProps {
  user: any;
  referralSettings: any;
  currencySymbol: string;
  onBack: () => void;
  referralStats: any;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({ user, referralSettings, currencySymbol, onBack, referralStats }) => {
  const { showToast } = useToast();
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
    if (affiliateStats.referralBalance < 10) {
      showToast(`Minimum transfer amount is ${currencySymbol}10.00`, 'error');
      return;
    }
    setWithdrawing(true);
    setTimeout(() => {
      setWithdrawing(false);
      showToast('Transfer request submitted successfully! Our team will review it.', 'success');
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
    <div className="h-full overflow-y-auto bg-[var(--bg-secondary)] text-[var(--text-primary)] pb-24 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[var(--bg-secondary)]/90 backdrop-blur-3xl border-b border-[var(--border-color)] px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)] rounded-full transition-colors">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Referral Program</h1>
        </div>
        <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] px-3 py-1.5 rounded-full flex items-center gap-2">
           <Award size={14} className="text-blue-500" />
           <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Level 1</span>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-8 max-w-4xl mx-auto">
        {/* Modern Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-[#1E293B] to-[#0F172A] p-8 md:p-10 text-white shadow-xl border border-white/5"
        >
          <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[100px] -mr-40 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold mb-6 border border-blue-500/20">
                <Sparkles size={14} /> Earn up to {referralSettings.referralPercentage}% Commission
              </div>

              <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4 text-white">
                Invite friends.<br />
                <span className="text-gray-400">Earn together.</span>
              </h2>
              
              <p className="text-gray-400 text-sm md:text-base mb-8 leading-relaxed max-w-md">
                Build your network and earn ongoing commissions on every trade your referrals make. Fast payouts straight to your main wallet.
              </p>

              {/* Share Box */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-2 flex items-center gap-2 border border-white/10 w-full max-w-md">
                <div className="flex-1 px-4 py-3 bg-black/20 rounded-xl overflow-hidden">
                  <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Your Unique Link</div>
                  <div className="font-mono text-sm truncate text-gray-200">{referralLink}</div>
                </div>
                <button 
                  onClick={handleCopy}
                  className="h-full aspect-square flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                >
                  {copied ? <Check size={20} strokeWidth={2.5} /> : <Copy size={20} strokeWidth={2.5} />}
                </button>
              </div>
            </div>

            {/* Quick Stats on Desktop / Below on Mobile */}
            <div className="w-full md:w-auto flex flex-row md:flex-col gap-4">
              <div className="flex-1 bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
                 <div className="text-gray-400 text-xs font-medium mb-1">Total Earned</div>
                 <div className="text-2xl font-semibold text-white">{currencySymbol}{affiliateStats.totalEarnings.toFixed(2)}</div>
              </div>
              <div className="flex-1 bg-white/5 backdrop-blur-lg border border-white/10 p-5 rounded-2xl">
                 <div className="text-gray-400 text-xs font-medium mb-1">Active Network</div>
                 <div className="text-2xl font-semibold text-white">{affiliateStats.registrations} <span className="text-sm font-normal text-gray-500">Users</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => shareVia('whatsapp')} className="flex flex-col items-center justify-center gap-2 py-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] hover:border-[#25D366]/50 hover:bg-[#25D366]/5 text-[var(--text-secondary)] hover:text-[#25D366] transition-all group">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[#25D366]/10">
               <Share2 size={18} />
            </div>
            <span className="text-xs font-medium">WhatsApp</span>
          </button>
          <button onClick={() => shareVia('telegram')} className="flex flex-col items-center justify-center gap-2 py-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] hover:border-[#0088cc]/50 hover:bg-[#0088cc]/5 text-[var(--text-secondary)] hover:text-[#0088cc] transition-all group">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[#0088cc]/10">
               <Share2 size={18} />
            </div>
            <span className="text-xs font-medium">Telegram</span>
          </button>
          <button onClick={() => shareVia('twitter')} className="flex flex-col items-center justify-center gap-2 py-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] hover:border-[#1DA1F2]/50 hover:bg-[#1DA1F2]/5 text-[var(--text-secondary)] hover:text-[#1DA1F2] transition-all group">
             <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[#1DA1F2]/10">
               <Share2 size={18} />
            </div>
            <span className="text-xs font-medium">Twitter</span>
          </button>
        </div>

        {/* Custom Tabs */}
        <div className="border-b border-[var(--border-color)] flex gap-6 px-2">
          <button 
            onClick={() => setActiveTab('OVERVIEW')}
            className={cn("pb-4 text-sm font-medium transition-colors relative", activeTab === 'OVERVIEW' ? "text-blue-500" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
          >
            Dashboard
            {activeTab === 'OVERVIEW' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('NETWORK')}
            className={cn("pb-4 text-sm font-medium transition-colors relative", activeTab === 'NETWORK' ? "text-blue-500" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}
          >
            Network Details
            {activeTab === 'NETWORK' && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'OVERVIEW' ? (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Available Balance Card */}
                <div className="bg-[var(--bg-primary)] rounded-[2rem] p-6 border border-[var(--border-color)] flex flex-col justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--text-secondary)] mb-2">Available for Transfer</div>
                    <div className="text-4xl font-semibold text-[var(--text-primary)] mb-6">{currencySymbol}{affiliateStats.referralBalance.toFixed(2)}</div>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[var(--text-secondary)]">Minimum transfer</span>
                        <span className="font-medium">{currencySymbol}10.00</span>
                      </div>
                      
                      <div className="w-full h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (affiliateStats.referralBalance / 10) * 100)}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    disabled={affiliateStats.referralBalance < 10}
                    className="w-full py-4 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-full font-medium text-sm border border-[var(--border-color)] disabled:opacity-50 transition-colors hover:bg-[var(--border-color)]"
                  >
                    {affiliateStats.referralBalance >= 10 ? 'Transfer to Wallet' : `Current balance too low`}
                  </button>
                </div>

                {/* Tier Progress */}
                <div className="bg-[var(--bg-primary)] rounded-[2rem] p-6 border border-[var(--border-color)]">
                   <div className="flex items-center justify-between mb-8">
                     <div>
                       <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">Current Tier</div>
                       <div className="text-2xl font-semibold text-blue-500">{affiliateStats.currentTier}</div>
                     </div>
                     <ShieldCheck size={32} className="text-[var(--border-color)]" />
                   </div>

                   <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 border border-[var(--border-color)] mb-6">
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-sm font-medium text-[var(--text-secondary)]">Progress to {affiliateStats.nextTier}</span>
                       <span className="text-sm font-semibold">{affiliateStats.progress.toFixed(0)}%</span>
                     </div>
                     <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden mb-2">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${affiliateStats.progress}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                     </div>
                     <div className="text-xs text-[var(--text-secondary)] text-right">
                       Need {affiliateStats.refsToNextTier} more users
                     </div>
                   </div>

                   <div className="flex justify-between items-center">
                     <span className="text-sm text-[var(--text-secondary)]">Current Rate</span>
                     <span className="text-sm font-semibold">{referralSettings.referralPercentage}% Commission</span>
                   </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Performance Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)]">
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{affiliateStats.registrations}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Total Signups</div>
                  </div>
                  <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)]">
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{affiliateStats.activeTraders}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Active Traders</div>
                  </div>
                  <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)]">
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{affiliateStats.conversionRate}%</div>
                    <div className="text-xs text-[var(--text-secondary)]">Conversion Rate</div>
                  </div>
                  <div className="bg-[var(--bg-primary)] p-5 rounded-2xl border border-[var(--border-color)]">
                    <div className="text-2xl font-semibold text-[var(--text-primary)] mb-1">{affiliateStats.totalClicks}</div>
                    <div className="text-xs text-[var(--text-secondary)]">Link Clicks</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="network"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Similar redesign for network tab... cleaner borders, less gradient noise */}
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Recent Signups</h3>
                <div className="bg-[var(--bg-primary)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden">
                  <div className="divide-y divide-[var(--border-color)]">
                    {recentReferrals.map((ref) => (
                      <div key={ref.id} className="flex items-center justify-between p-5 hover:bg-[var(--bg-secondary)] transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-color)]">
                            <User size={18} className="text-[var(--text-secondary)]" />
                          </div>
                          <div>
                            <div className="font-medium text-[var(--text-primary)] mb-0.5">{ref.email}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{ref.date}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                            {ref.earnings > 0 ? `+${currencySymbol}${ref.earnings.toFixed(2)}` : '—'}
                          </div>
                          <div className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full inline-block", ref.status === 'Active' ? "bg-green-500/10 text-green-500" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)]")}>
                            {ref.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-4">Commission Log</h3>
                <div className="bg-[var(--bg-primary)] rounded-[2rem] border border-[var(--border-color)] overflow-hidden">
                  <div className="divide-y divide-[var(--border-color)]">
                    {commissionHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                            <TrendingUp size={18} />
                          </div>
                          <div>
                            <div className="font-medium text-[var(--text-primary)] mb-0.5">{item.type}</div>
                            <div className="text-xs text-[var(--text-secondary)]">{item.date} • {item.asset}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-green-500">+{currencySymbol}{item.amount.toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
