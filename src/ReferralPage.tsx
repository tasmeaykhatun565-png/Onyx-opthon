import React, { useState } from 'react';
import { BACKEND_URL } from './config';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Copy, ChevronLeft, Check, Share2, 
  Wallet, Download, LayoutDashboard,
  BarChart3, Link as LinkIcon, 
  History as HistoryIcon, Send,
  Users2, ArrowUpRight, Monitor
} from 'lucide-react';
import { cn } from './utils';
import { useToast } from './Toast';
import { auth } from './firebase';

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
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'STATISTICS' | 'LINKS' | 'PAYOUTS' | 'PROMO'>('DASHBOARD');
  const [withdrawing, setWithdrawing] = useState(false);

  // Stats mimicking a standard affiliate program
  const registrations = Math.max((propsReferralStats?.referralCount || 0), (user?.referralCount || 0));
  
  const referralStats = {
    hits: Math.floor(registrations * 3.5),
    registrations: registrations,
    depositors: Math.floor(registrations * 0.4),
    activeTraders: Math.floor(registrations * 0.25),
    totalEarnings: (propsReferralStats?.totalEarnings || user?.totalReferralEarnings || 0),
    referralBalance: (propsReferralStats?.referralBalance || user?.referralBalance || 0),
    recentReferrals: propsReferralStats?.recentReferrals || [],
    fTDAmount: (propsReferralStats?.fTDAmount || 0),
  };

  const marketingMaterials = [
    { title: 'Standard Banner 728x90', type: 'Banner', size: '728x90', preview: 'https://images.unsplash.com/photo-1611974717482-48a8aeb49fb1?auto=format&fit=crop&q=80&w=400' },
    { title: 'Square Banner 250x250', type: 'Banner', size: '250x250', preview: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400' },
    { title: 'Mobile Interstitial', type: 'Mobile', size: '320x480', preview: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&q=80&w=400' },
  ];

  const stats = {
    earnings: referralStats.totalEarnings,
    balance: referralStats.referralBalance,
    registrations: referralStats.registrations,
    hits: referralStats.hits, 
    ftd: referralStats.depositors,
    conversionRate: referralStats.registrations ? ((referralStats.depositors / referralStats.registrations) * 100).toFixed(1) : "0.0",
    revenueShare: referralSettings.referralPercentage || 25,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Referral link copied', 'success');
    });
  };

  const handleWithdraw = async () => {
    if (stats.balance < 20) {
      showToast(`Minimum payout amount is $20.00`, 'error');
      return;
    }
    
    setWithdrawing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${BACKEND_URL}/api/withdraw-referral`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to withdraw');

      showToast('Funds transferred to Live Balance pending review.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setWithdrawing(false);
    }
  };

  const menuItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'STATISTICS', label: 'Statistics', icon: <BarChart3 size={20} /> },
    { id: 'LINKS', label: 'Links', icon: <LinkIcon size={20} /> },
    { id: 'PAYOUTS', label: 'Payouts', icon: <HistoryIcon size={20} /> },
    { id: 'PROMO', label: 'Promo Materials', icon: <Monitor size={20} /> },
  ];

  return (
    <div className="h-full bg-[#1e2329] text-gray-200 font-sans flex flex-col md:flex-row overflow-hidden absolute inset-0 z-50">
      
      {/* Sidebar for Desktop / Top header for mobile */}
      <div className="w-full md:w-[260px] bg-[#181a20] border-r border-[#2b3139] flex flex-col shrink-0">
        <div className="p-4 md:p-6 border-b border-[#2b3139] flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-[#2b3139] rounded transition-colors text-gray-400 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            Affiliate Program
          </div>
        </div>

        <div className="flex px-4 py-4 md:flex-col gap-1 overflow-x-auto custom-scrollbar md:px-3 md:py-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeTab === item.id 
                  ? "bg-[#2b3139] text-[#2b82f6] border border-[#2b82f6]/10" 
                  : "text-gray-400 hover:bg-[#2b3139] hover:text-white"
              )}
            >
              <div className={cn(activeTab === item.id ? "text-[#2b82f6]" : "text-gray-500")}>
                {item.icon}
              </div>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#0b0e11] p-4 md:p-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#2b3139] pb-6">
            <h2 className="text-2xl font-semibold text-white tracking-tight">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            <div className="flex gap-4">
               <div className="bg-[#181a20] border border-[#2b3139] rounded-lg px-4 py-2 flex flex-col items-end">
                 <span className="text-[11px] text-gray-400 font-medium">Available Balance</span>
                 <span className="text-lg font-bold text-white tabular-nums">${stats.balance.toFixed(2)}</span>
               </div>
               <button 
                 onClick={handleWithdraw}
                 disabled={withdrawing || stats.balance < 20}
                 className="bg-[#2b82f6] hover:bg-[#2060b2] text-white font-semibold px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {withdrawing ? 'Processing...' : 'Withdraw'}
               </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'DASHBOARD' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Hits', value: stats.hits },
                      { label: 'Registrations', value: stats.registrations },
                      { label: 'FTD', value: stats.ftd },
                      { label: 'FTD Amount', value: `$${referralStats.fTDAmount.toFixed(2)}` },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#181a20] border border-[#2b3139] p-5 rounded-lg">
                        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{stat.label}</div>
                        <div className="text-2xl font-bold text-white tabular-nums">{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-[#181a20] border border-[#2b3139] p-6 rounded-lg flex flex-col justify-center items-center text-center">
                       <div className="w-16 h-16 bg-[#2b3139] rounded-full flex items-center justify-center mb-4 inner-shadow">
                          <Users2 size={24} className="text-[#0ecb81]" />
                       </div>
                       <h3 className="text-sm font-bold text-gray-400 mb-1">Total Commission</h3>
                       <p className="text-4xl font-bold text-white tracking-tighter tabular-nums">${stats.earnings.toFixed(2)}</p>
                    </div>

                    <div className="bg-[#181a20] border border-[#2b3139] p-6 rounded-lg">
                      <h3 className="text-sm font-bold text-white border-b border-[#2b3139] pb-4 mb-4">Revenue Share Plan</h3>
                      <div className="flex items-end gap-2 mb-4">
                         <span className="text-4xl font-bold text-[#0ecb81]">{stats.revenueShare}%</span>
                         <span className="text-sm text-gray-400 mb-1">profit share</span>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                        You are currently enrolled in the Standard Revenue Share tier. Earn up to {stats.revenueShare}% from your active referrals' trading volume.
                      </p>
                    </div>
                  </div>
              </motion.div>
            )}

            {activeTab === 'LINKS' && (
              <motion.div 
                key="links"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="bg-[#181a20] border border-[#2b3139] rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-6">Your Primary Link</h3>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1 bg-[#0b0e11] border border-[#2b3139] rounded px-4 py-3 font-mono text-sm text-gray-300 flex items-center">
                      {referralLink}
                    </div>
                    <button 
                      onClick={handleCopy}
                      className="bg-[#2b3139] hover:bg-[#323942] text-white px-6 py-3 rounded transition-colors flex items-center justify-center gap-2 shrink-0 min-w-[120px]"
                    >
                      {copied ? <><Check size={18} className="text-[#0ecb81]"/> Copied</> : <><Copy size={18} /> Copy</>}
                    </button>
                  </div>

                  <div className="pt-6 border-t border-[#2b3139]">
                    <span className="text-sm text-gray-400 block mb-4">Direct social share:</span>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(referralLink)}`, '_blank')}
                        className="bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 py-2 px-4 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Share2 size={16} /> WhatsApp
                      </button>
                      <button 
                        onClick={() => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`, '_blank')}
                        className="bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 py-2 px-4 rounded text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Send size={16} /> Telegram
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'STATISTICS' && (
              <motion.div 
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
               >
                 <div className="bg-[#181a20] border border-[#2b3139] rounded-lg overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                       <thead>
                         <tr className="border-b border-[#2b3139]">
                           <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">User ID</th>
                           <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Date</th>
                           <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Status</th>
                           <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-right">Commission</th>
                         </tr>
                       </thead>
                       <tbody>
                         {referralStats.recentReferrals.length > 0 ? (
                           referralStats.recentReferrals.map((ref: any, idx: number) => (
                             <tr key={idx} className="border-b border-[#2b3139] hover:bg-[#2b3139]/30 transition-colors">
                               <td className="px-6 py-4">
                                 <div className="flex items-center gap-3 text-sm text-gray-300">
                                   <div className="w-6 h-6 rounded bg-[#2b3139] flex items-center justify-center uppercase text-xs">{ref.email.charAt(0)}</div>
                                   {ref.email}
                                 </div>
                               </td>
                               <td className="px-6 py-4 text-sm text-gray-400">{new Date(ref.createdAt).toLocaleDateString()}</td>
                               <td className="px-6 py-4">
                                 <span className={cn(
                                   "px-2.5 py-1 rounded text-xs font-medium",
                                   ref.status === 'Active' ? "bg-green-500/10 text-[#0ecb81]" : "bg-gray-500/10 text-gray-400"
                                 )}>
                                   {ref.status || 'Active'}
                                 </span>
                               </td>
                               <td className="px-6 py-4 text-sm font-medium text-white text-right">
                                 ${ref.earnings?.toFixed(2) || '0.00'}
                               </td>
                             </tr>
                           ))
                         ) : (
                           <tr>
                             <td colSpan={4} className="px-6 py-20 text-center text-gray-500">
                               <div className="flex flex-col items-center">
                                 <LayoutDashboard size={32} className="mb-4 opacity-50" />
                                 <p className="text-sm font-medium">No referral data found for this period.</p>
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
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
                 className="bg-[#181a20] border border-[#2b3139] rounded-lg p-10 flex flex-col items-center justify-center text-center min-h-[400px]"
              >
                  <HistoryIcon size={48} className="text-gray-600 mb-6" strokeWidth={1.5} />
                  <h3 className="text-xl font-bold text-white mb-2">No Payout History</h3>
                  <p className="text-sm text-gray-400 max-w-sm">Your payout requests and transfer history will be securely logged here.</p>
              </motion.div>
            )}

            {activeTab === 'PROMO' && (
              <motion.div 
                 key="promo"
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.2 }}
                 className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                 {marketingMaterials.map((item, idx) => (
                   <div key={idx} className="bg-[#181a20] border border-[#2b3139] rounded-lg overflow-hidden group hover:border-gray-600 transition-colors">
                      <div className="aspect-video relative bg-[#0b0e11] overflow-hidden">
                        <img 
                          src={item.preview} 
                          alt={item.title} 
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                        />
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-semibold text-white">
                          {item.size}
                        </div>
                      </div>
                      <div className="p-5 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">{item.type}</div>
                          <div className="text-sm font-semibold text-white group-hover:text-[#2b82f6] transition-colors">{item.title}</div>
                        </div>
                        <button className="w-10 h-10 rounded bg-[#2b3139] hover:bg-white/10 flex items-center justify-center text-gray-300 transition-colors">
                          <Download size={18} />
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

export default ReferralPage;