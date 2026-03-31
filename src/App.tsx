import { IndicatorConfig } from './types';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, AreaChart, Area, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { AdminPanel } from './AdminPanel';
import { 
  ArrowUp, ArrowDown, Wallet, History, Settings, Bell, Menu, X, 
  User, ChevronDown, ChevronUp, Signal, Compass, BarChart2, HelpCircle, 
  Briefcase, Gift, LayoutGrid, Plus, Minus, Divide, Clock, Percent,
  ChevronLeft, Copy, Box, Link as LinkIcon, CalendarDays, ChevronRight,
  Shuffle, Target, ChevronsUp, GraduationCap, MessageCircle, BookOpen,
  Trophy, ShoppingBag, ArrowUpDown, Mail, UserCheck, Key, Shield, ShieldCheck, Zap, Check, Grid, Image, Activity, LogOut,
  Search, Info, AlignLeft, Star, MoreVertical, Lock, Video, FileText, Phone, Youtube, Globe, Send, Bitcoin, Gem, TrendingUp, RefreshCw, Users, Newspaper
} from 'lucide-react';
import { playSound } from './sounds';
import { cn } from './utils';
import { AnimatePresence, motion } from 'motion/react';
import SupportChat from './SupportChat';
import SocialChat from './SocialChat';
import PaymentsSheet from './PaymentsSheet';
import ChartSettingsSheet from './ChartSettingsSheet';
import AccountsSheet from './AccountsSheet';
import TradeInputSheet from './TradeInputSheet';
import RiskManagementSheet from './RiskManagementSheet';
import { TradingChart } from './TradingChart';
import Auth from './Auth';
import { LockScreen } from './LockScreen';
import { 
  TradingPlatformSettings, AppearanceSettings, NotificationSettings,
  PersonalInformationSettings, ContactSettings, VerificationSettings,
  PasswordSettings, TwoFactorSettings, AppPinSettings
} from './SettingsSubPages';

import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, arrayUnion, setDoc, getDoc, collection, query, orderBy, limit, getDocs, getDocFromServer } from 'firebase/firestore';
import InfoPage from './InfoPage';
import HomePage from './HomePage';

import { ReferralPage } from './ReferralPage';
import IndicatorSheet from './IndicatorSheet';
import OnboardingModal from './OnboardingModal';
import PendingOrderSheet from './PendingOrderSheet';

import { io, Socket } from 'socket.io-client';
import { ToastProvider } from './Toast';
import { useTranslation } from './i18n';

// --- Types ---
type OHLCData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  formattedTime: string;
};

type TickData = {
  time: number;
  price: number;
};

type Trade = {
  id: string;
  type: 'UP' | 'DOWN';
  entryPrice: number;
  closePrice?: number;
  amount: number;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'ACTIVE' | 'WIN' | 'LOSS';
  accountType: string;
  payout: number;
  profit?: number;
  asset: string;
  assetShortName: string;
  assetFlag: string;
  assetCategory: 'Crypto' | 'Forex' | 'Stocks' | 'Commodities';
  userEmail?: string;
};

type TradeResult = {
  id: string;
  profit: number;
  isWin: boolean;
};

type Asset = {
  id: string;
  name: string;
  shortName: string;
  payout: number;
  category: 'Crypto' | 'Forex' | 'Stocks' | 'Commodities';
  flag: string; // Emoji or Icon representation
  icon: string;
  basePrice: number;
  volatility: number;
  isFrozen?: boolean;
};

type Account = {
  id: string;
  name: string;
  currency: string;
  symbol: string;
  balance: number;
  type: 'DEMO' | 'REAL';
  flag: string;
};

// --- Constants ---
const ASSETS: Asset[] = [
  { id: 'aud_chf', name: 'AUD/CHF (OTC)', shortName: 'AUD/CHF', payout: 92, category: 'Forex', flag: '🇦🇺🇨🇭', icon: '💱', basePrice: 0.5720, volatility: 0.0002 },
  { id: 'aud_jpy', name: 'AUD/JPY (OTC)', shortName: 'AUD/JPY', payout: 92, category: 'Forex', flag: '🇦🇺🇯🇵', icon: '💱', basePrice: 97.50, volatility: 0.02 },
  { id: 'aud_usd', name: 'AUD/USD (OTC)', shortName: 'AUD/USD', payout: 90, category: 'Forex', flag: '🇦🇺🇺🇸', icon: '💱', basePrice: 0.6550, volatility: 0.0002 },
  { id: 'eur_aud', name: 'EUR/AUD (OTC)', shortName: 'EUR/AUD', payout: 91, category: 'Forex', flag: '🇪🇺🇦🇺', icon: '💱', basePrice: 1.6550, volatility: 0.0002 },
  { id: 'eur_cad', name: 'EUR/CAD (OTC)', shortName: 'EUR/CAD', payout: 92, category: 'Forex', flag: '🇪🇺🇨🇦', icon: '💱', basePrice: 1.4650, volatility: 0.0002 },
  { id: 'eur_gbp', name: 'EUR/GBP (OTC)', shortName: 'EUR/GBP', payout: 90, category: 'Forex', flag: '🇪🇺🇬🇧', icon: '💱', basePrice: 0.8550, volatility: 0.0002 },
  { id: 'eur_jpy', name: 'EUR/JPY (OTC)', shortName: 'EUR/JPY', payout: 91, category: 'Forex', flag: '🇪🇺🇯🇵', icon: '💱', basePrice: 163.50, volatility: 0.02 },
  { id: 'eur_usd', name: 'EUR/USD (OTC)', shortName: 'EUR/USD', payout: 92, category: 'Forex', flag: '🇪🇺🇺🇸', icon: '💱', basePrice: 1.0845, volatility: 0.0002 },
  { id: 'gbp_aud', name: 'GBP/AUD (OTC)', shortName: 'GBP/AUD', payout: 92, category: 'Forex', flag: '🇬🇧🇦🇺', icon: '💱', basePrice: 1.9350, volatility: 0.0003 },
  { id: 'gbp_cad', name: 'GBP/CAD (OTC)', shortName: 'GBP/CAD', payout: 92, category: 'Forex', flag: '🇬🇧🇨🇦', icon: '💱', basePrice: 1.7150, volatility: 0.0003 },
  { id: 'gbp_chf', name: 'GBP/CHF (OTC)', shortName: 'GBP/CHF', payout: 92, category: 'Forex', flag: '🇬🇧🇨🇭', icon: '💱', basePrice: 1.1350, volatility: 0.0003 },
  { id: 'gbp_usd', name: 'GBP/USD (OTC)', shortName: 'GBP/USD', payout: 92, category: 'Forex', flag: '🇬🇧🇺🇸', icon: '💱', basePrice: 1.2670, volatility: 0.0003 },
  { id: 'nzd_usd', name: 'NZD/USD (OTC)', shortName: 'NZD/USD', payout: 91, category: 'Forex', flag: '🇳🇿🇺🇸', icon: '💱', basePrice: 0.6150, volatility: 0.0002 },
  { id: 'usd_aed', name: 'USD/AED (OTC)', shortName: 'USD/AED', payout: 91, category: 'Forex', flag: '🇺🇸🇦🇪', icon: '💱', basePrice: 3.67, volatility: 0.001 },
  { id: 'usd_ars', name: 'USD/ARS (OTC)', shortName: 'USD/ARS', payout: 92, category: 'Forex', flag: '🇺🇸🇦🇷', icon: '💱', basePrice: 830.50, volatility: 1.5 },
  { id: 'usd_bdt', name: 'USD/BDT (OTC)', shortName: 'USD/BDT', payout: 91, category: 'Forex', flag: '🇺🇸🇧🇩', icon: '💱', basePrice: 109.50, volatility: 0.5 },
  { id: 'usd_brl', name: 'USD/BRL (OTC)', shortName: 'USD/BRL', payout: 91, category: 'Forex', flag: '🇺🇸🇧🇷', icon: '💱', basePrice: 4.95, volatility: 0.01 },
  { id: 'usd_cad', name: 'USD/CAD (OTC)', shortName: 'USD/CAD', payout: 91, category: 'Forex', flag: '🇺🇸🇨🇦', icon: '💱', basePrice: 1.3550, volatility: 0.0002 },
  { id: 'usd_chf', name: 'USD/CHF (OTC)', shortName: 'USD/CHF', payout: 92, category: 'Forex', flag: '🇺🇸🇨🇭', icon: '💱', basePrice: 0.8850, volatility: 0.0002 },
  { id: 'usd_cop', name: 'USD/COP (OTC)', shortName: 'USD/COP', payout: 92, category: 'Forex', flag: '🇺🇸🇨🇴', icon: '💱', basePrice: 3950.50, volatility: 5.0 },
  { id: 'usd_dzd', name: 'USD/DZD (OTC)', shortName: 'USD/DZD', payout: 91, category: 'Forex', flag: '🇺🇸🇩🇿', icon: '💱', basePrice: 134.50, volatility: 0.5 },
  { id: 'usd_egp', name: 'USD/EGP (OTC)', shortName: 'USD/EGP', payout: 92, category: 'Forex', flag: '🇺🇸🇪🇬', icon: '💱', basePrice: 30.90, volatility: 0.1 },
  { id: 'usd_idr', name: 'USD/IDR (OTC)', shortName: 'USD/IDR', payout: 93, category: 'Forex', flag: '🇺🇸🇮🇩', icon: '💱', basePrice: 15600.0, volatility: 20.0 },
  { id: 'usd_inr', name: 'USD/INR (OTC)', shortName: 'USD/INR', payout: 92, category: 'Forex', flag: '🇺🇸🇮🇳', icon: '💱', basePrice: 83.00, volatility: 0.1 },
  { id: 'usd_mxn', name: 'USD/MXN (OTC)', shortName: 'USD/MXN', payout: 92, category: 'Forex', flag: '🇺🇸🇲🇽', icon: '💱', basePrice: 17.05, volatility: 0.05 },
  { id: 'usd_pkr', name: 'USD/PKR (OTC)', shortName: 'USD/PKR', payout: 91, category: 'Forex', flag: '🇺🇸🇵🇰', icon: '💱', basePrice: 279.50, volatility: 1.0 },
  { id: 'usd_sar', name: 'USD/SAR (OTC)', shortName: 'USD/SAR', payout: 92, category: 'Forex', flag: '🇺🇸🇸🇦', icon: '💱', basePrice: 3.75, volatility: 0.001 },
  { id: 'usd_try', name: 'USD/TRY (OTC)', shortName: 'USD/TRY', payout: 92, category: 'Forex', flag: '🇺🇸🇹🇷', icon: '💱', basePrice: 31.20, volatility: 0.05 },
  { id: 'usd_zar', name: 'USD/ZAR (OTC)', shortName: 'USD/ZAR', payout: 91, category: 'Forex', flag: '🇺🇸🇿🇦', icon: '💱', basePrice: 19.10, volatility: 0.02 },
  { id: 'btc_usd', name: 'Bitcoin (OTC)', shortName: 'BTC/USD', payout: 90, category: 'Crypto', flag: '₿', icon: '🪙', basePrice: 51241.67, volatility: 15.5 },
  { id: 'eth_usd', name: 'Ethereum (OTC)', shortName: 'ETH/USD', payout: 90, category: 'Crypto', flag: 'Ξ', icon: '🪙', basePrice: 2950.12, volatility: 2.5 },
  { id: 'sol_usd', name: 'Solana (OTC)', shortName: 'SOL/USD', payout: 88, category: 'Crypto', flag: '◎', icon: '🪙', basePrice: 105.45, volatility: 0.8 },
  { id: 'xrp_usd', name: 'Ripple (OTC)', shortName: 'XRP/USD', payout: 88, category: 'Crypto', flag: '✕', icon: '🪙', basePrice: 0.54, volatility: 0.005 },
  { id: 'gold_usd', name: 'Gold (OTC)', shortName: 'GOLD', payout: 92, category: 'Commodities', flag: '🟡', icon: '🛢️', basePrice: 2035.50, volatility: 0.5 },
  { id: 'silver_usd', name: 'Silver (OTC)', shortName: 'SILVER', payout: 90, category: 'Commodities', flag: '⚪', icon: '🛢️', basePrice: 22.80, volatility: 0.05 },
  { id: 'oil_usd', name: 'Crude Oil (OTC)', shortName: 'OIL', payout: 89, category: 'Commodities', flag: '🛢️', icon: '🛢️', basePrice: 78.40, volatility: 0.2 },
  { id: 'aapl_usd', name: 'Apple (OTC)', shortName: 'AAPL', payout: 92, category: 'Stocks', flag: '🍎', icon: '📈', basePrice: 182.30, volatility: 0.5 },
  { id: 'googl_usd', name: 'Google (OTC)', shortName: 'GOOGL', payout: 92, category: 'Stocks', flag: '🔍', icon: '📈', basePrice: 145.60, volatility: 0.4 },
  { id: 'tsla_usd', name: 'Tesla (OTC)', shortName: 'TSLA', payout: 91, category: 'Stocks', flag: '⚡', icon: '📈', basePrice: 195.20, volatility: 1.2 },
  { id: 'amzn_usd', name: 'Amazon (OTC)', shortName: 'AMZN', payout: 91, category: 'Stocks', flag: '📦', icon: '📈', basePrice: 175.40, volatility: 0.6 },
  { id: 'msft_usd', name: 'Microsoft (OTC)', shortName: 'MSFT', payout: 92, category: 'Stocks', flag: '💻', icon: '📈', basePrice: 410.50, volatility: 0.8 },
  { id: 'meta_usd', name: 'Meta (OTC)', shortName: 'META', payout: 92, category: 'Stocks', flag: '♾️', icon: '📈', basePrice: 485.20, volatility: 1.5 },
  { id: 'nflx_usd', name: 'Netflix (OTC)', shortName: 'NFLX', payout: 91, category: 'Stocks', flag: '🎬', icon: '📈', basePrice: 590.40, volatility: 1.0 },
  { id: 'nvda_usd', name: 'Nvidia (OTC)', shortName: 'NVDA', payout: 93, category: 'Stocks', flag: '🎮', icon: '📈', basePrice: 785.30, volatility: 2.5 },
  { id: 'baba_usd', name: 'Alibaba (OTC)', shortName: 'BABA', payout: 89, category: 'Stocks', flag: '🇨🇳', icon: '📈', basePrice: 75.20, volatility: 0.8 },
  { id: 'doge_usd', name: 'Dogecoin (OTC)', shortName: 'DOGE/USD', payout: 85, category: 'Crypto', flag: '🐕', icon: '🪙', basePrice: 0.085, volatility: 0.002 },
  { id: 'ada_usd', name: 'Cardano (OTC)', shortName: 'ADA/USD', payout: 87, category: 'Crypto', flag: '₳', icon: '🪙', basePrice: 0.58, volatility: 0.01 },
  { id: 'dot_usd', name: 'Polkadot (OTC)', shortName: 'DOT/USD', payout: 87, category: 'Crypto', flag: '●', icon: '🪙', basePrice: 7.45, volatility: 0.15 },
  { id: 'copper_usd', name: 'Copper (OTC)', shortName: 'COPPER', payout: 88, category: 'Commodities', flag: '🥉', icon: '🛢️', basePrice: 3.85, volatility: 0.02 },
  { id: 'gas_usd', name: 'Natural Gas (OTC)', shortName: 'NATGAS', payout: 88, category: 'Commodities', flag: '🔥', icon: '🛢️', basePrice: 1.85, volatility: 0.05 },
  { id: 'corn_usd', name: 'Corn (OTC)', shortName: 'CORN', payout: 85, category: 'Commodities', flag: '🌽', icon: '🛢️', basePrice: 4.50, volatility: 0.02 },
  { id: 'wheat_usd', name: 'Wheat (OTC)', shortName: 'WHEAT', payout: 85, category: 'Commodities', flag: '🌾', icon: '🛢️', basePrice: 5.80, volatility: 0.03 },
  { id: 'link_usd', name: 'Chainlink (OTC)', shortName: 'LINK/USD', payout: 88, category: 'Crypto', flag: '🔗', icon: '🪙', basePrice: 18.50, volatility: 0.2 },
  { id: 'matic_usd', name: 'Polygon (OTC)', shortName: 'MATIC/USD', payout: 88, category: 'Crypto', flag: '🟣', icon: '🪙', basePrice: 0.95, volatility: 0.01 },
  { id: 'uni_usd', name: 'Uniswap (OTC)', shortName: 'UNI/USD', payout: 87, category: 'Crypto', flag: '🦄', icon: '🪙', basePrice: 7.20, volatility: 0.1 },
  { id: 'dis_usd', name: 'Disney (OTC)', shortName: 'DIS', payout: 90, category: 'Stocks', flag: '🏰', icon: '📈', basePrice: 110.50, volatility: 0.4 },
  { id: 'pypl_usd', name: 'PayPal (OTC)', shortName: 'PYPL', payout: 90, category: 'Stocks', flag: '💳', icon: '📈', basePrice: 60.20, volatility: 0.5 },
  { id: 'nke_usd', name: 'Nike (OTC)', shortName: 'NKE', payout: 90, category: 'Stocks', flag: '👟', icon: '📈', basePrice: 105.40, volatility: 0.3 },
];

const INITIAL_BALANCE = 12273.67;

// --- Helper Functions ---
const getTimeFrameInMs = (tf: string): number => {
  const value = parseInt(tf);
  const unit = tf.replace(String(value), '');
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
};

// --- Helper Components ---
const AssetIcon = ({ 
  shortName, 
  category, 
  flag, 
  size = "md" 
}: { 
  shortName: string, 
  category?: string, 
  flag?: string, 
  size?: "sm" | "md" | "lg" 
}) => {
  const containerSize = size === "sm" ? "w-6 h-6" : size === "lg" ? "w-12 h-12" : "w-8 h-8";
  const flagSize = size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  const fontSize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-2xl" : "text-lg";

  if (category === 'Forex') {
    const currencies = shortName.split('/');
    if (currencies.length === 2) {
      const c1 = currencies[0].toLowerCase();
      const c2 = currencies[1].toLowerCase();
      
      const countryMap: Record<string, string> = {
        aud: 'au', chf: 'ch', jpy: 'jp', usd: 'us', eur: 'eu',
        cad: 'ca', gbp: 'gb', nzd: 'nz', aed: 'ae', ars: 'ar',
        bd: 'bd', bdt: 'bd', brl: 'br', cop: 'co', dzd: 'dz',
        egp: 'eg', idr: 'id', inr: 'in', mxn: 'mx', pkr: 'pk',
        sar: 'sa', try: 'tr', zar: 'za'
      };

      const code1 = countryMap[c1] || c1.substring(0, 2);
      const code2 = countryMap[c2] || c2.substring(0, 2);

      return (
        <div className={cn("relative flex items-center justify-center", containerSize)}>
          <div className={cn("absolute left-0 top-0 rounded-full border-2 border-[#101114] overflow-hidden z-10 shadow-md", flagSize)}>
            <img 
              src={`https://flagcdn.com/w80/${code1}.png`} 
              alt={c1} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className={cn("absolute right-0 bottom-0 rounded-full border-2 border-[#101114] overflow-hidden z-20 shadow-md", flagSize)}>
            <img 
              src={`https://flagcdn.com/w80/${code2}.png`} 
              alt={c2} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      );
    }
  }
  
  return (
    <div className={cn("rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center border border-[var(--border-color)] shadow-sm", containerSize, fontSize)}>
      {flag}
    </div>
  );
};

// --- Asset Selector Component ---
function AssetSelector({ 
  isOpen, 
  onClose, 
  onSelect, 
  currentAssetId,
  marketAssets
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (asset: Asset) => void;
  currentAssetId: string;
  marketAssets: Record<string, any>;
}) {
  const [activeTab, setActiveTab] = useState('Fixed Time');
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Forex': true,
    'Crypto': true,
    'Stocks': true,
    'Commodities': true
  });

  const toggleSection = (category: string) => {
    setOpenSections(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const filteredAssets = ASSETS.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.shortName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {
      'Forex': [],
      'Crypto': [],
      'Stocks': [],
      'Commodities': []
    };
    filteredAssets.forEach(asset => {
      if (groups[asset.category]) {
        groups[asset.category].push(asset);
      }
    });
    return groups;
  }, [filteredAssets]);

  const categoryIcons: Record<string, React.ReactNode> = {
    'Forex': <Globe size={18} className="text-blue-400" />,
    'Crypto': <Bitcoin size={18} className="text-orange-400" />,
    'Stocks': <TrendingUp size={18} className="text-green-400" />,
    'Commodities': <Gem size={18} className="text-yellow-400" />
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full bg-[var(--bg-primary)] font-sans flex flex-col">
       {/* Header */}
       <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
         <h2 className="text-xl font-bold text-[var(--text-primary)]">Select an asset</h2>
         <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition p-1 rounded-full hover:bg-[var(--bg-tertiary)]">
            <X size={24} />
         </button>
       </div>

       {/* Search */}
       <div className="px-4 py-3">
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
            <input 
                type="text" 
                placeholder="Search by name or ticker" 
                className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] pl-10 pr-4 py-3 rounded-xl border border-[var(--border-color)] focus:outline-none focus:border-blue-500 transition placeholder:text-[var(--text-secondary)]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
         </div>
       </div>

       {/* Tabs */}
       <div className="flex items-center px-4 gap-2 mb-2 overflow-x-auto scrollbar-hide">
          {['Favorites', 'Fixed Time', '5s Scalping'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition",
                    activeTab === tab 
                        ? "bg-[#3b82f6] text-white" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                )}
              >
                {tab}
              </button>
          ))}
       </div>

       {/* List Header */}
       <div className="flex-1 overflow-y-auto pb-20">
          {(Object.entries(groupedAssets) as [string, Asset[]][]).map(([category, assets]) => (
            <div key={category} className="mb-2">
              {assets.length > 0 && (
                <>
                  <button 
                      onClick={() => toggleSection(category)}
                      className="w-full flex items-center justify-between px-4 py-3 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition border-b border-[var(--border-color)]"
                  >
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                            {categoryIcons[category]}
                          </div>
                          <span className="font-bold text-[var(--text-primary)]">{category}</span>
                          <span className="text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-secondary)]">{assets.length}</span>
                      </div>
                      {openSections[category] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>

                  {openSections[category] && (
                      <div className="divide-y divide-[var(--border-color)]">
                          {assets.map(asset => {
                              const dynamicAsset = marketAssets[asset.shortName];
                              const isFrozen = dynamicAsset?.isFrozen;
                              
                              return (
                                  <div 
                                      key={asset.id}
                                      onClick={() => {
                                          if (isFrozen) return;
                                          onSelect(asset);
                                          onClose();
                                      }}
                                      className={cn(
                                          "flex items-center justify-between px-4 py-4 hover:bg-[var(--bg-tertiary)] cursor-pointer transition",
                                          asset.id === currentAssetId && "bg-[var(--bg-tertiary)]",
                                          isFrozen && "opacity-50 cursor-not-allowed"
                                      )}
                                  >
                                      <div className="flex items-center">
                                          <div className="mr-3 relative">
                                              <AssetIcon 
                                                  shortName={asset.shortName} 
                                                  category={asset.category} 
                                                  flag={asset.flag} 
                                              />
                                              {isFrozen && (
                                                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-[var(--bg-primary)]">
                                                      <Lock size={8} className="text-white" />
                                                  </div>
                                              )}
                                          </div>
                                          <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[var(--text-primary)] font-bold text-sm">{asset.name.split('(')[0].trim()}</span>
                                                <span className="text-[10px] bg-blue-500/10 text-blue-500 font-bold px-1.5 py-0.5 rounded">
                                                    {dynamicAsset?.payout || asset.payout}%
                                                </span>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-medium">OTC</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {isFrozen ? (
                                                  <span className="text-[10px] text-red-500 font-bold uppercase">Closed</span>
                                                ) : (
                                                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">Market Open</span>
                                                )}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                          {isFrozen ? (
                                              <Lock size={16} className="text-[var(--text-secondary)]" />
                                          ) : (
                                              <div className="flex flex-col items-end">
                                              </div>
                                          )}
                                          <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1">
                                             <Star size={16} />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}
                </>
              )}
            </div>
          ))}
       </div>
    </div>
  );
}

function TradeHistoryLog({ 
  trades, 
  pendingOrders,
  onClose, 
  currencySymbol, 
  exchangeRate, 
  onSelectTrade,
  onCancelPendingOrder
}: { 
  trades: Trade[], 
  pendingOrders: any[],
  onClose: () => void, 
  currencySymbol: string, 
  exchangeRate: number, 
  onSelectTrade: (t: Trade) => void,
  onCancelPendingOrder: (id: number) => void
}) {
  const [activeTab, setActiveTab] = useState<'CLOSED' | 'PENDING'>('CLOSED');

  return (
    <motion.div 
      initial={{ opacity: 0, x: "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 text-white/60 hover:text-white transition">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-xl font-bold text-white">Trade History</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 border-b border-white/10">
        <button 
          onClick={() => setActiveTab('CLOSED')}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition relative",
            activeTab === 'CLOSED' ? "text-[#22c55e]" : "text-white/40"
          )}
        >
          Closed
          {activeTab === 'CLOSED' && <motion.div layoutId="history-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
        </button>
        <button 
          onClick={() => setActiveTab('PENDING')}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition relative",
            activeTab === 'PENDING' ? "text-[#22c55e]" : "text-white/40"
          )}
        >
          Pending
          {activeTab === 'PENDING' && <motion.div layoutId="history-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#22c55e]" />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {activeTab === 'CLOSED' ? (
          trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History size={48} className="text-white/10 mb-4" />
              <p className="text-white/40 text-sm">No trade history yet</p>
            </div>
          ) : (
            trades.map(trade => (
              <TradeItem 
                key={trade.id} 
                trade={trade} 
                onClick={() => onSelectTrade(trade)} 
                currencySymbol={currencySymbol} 
                exchangeRate={exchangeRate}
              />
            ))
          )
        ) : (
          pendingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock size={48} className="text-white/10 mb-4" />
              <p className="text-white/40 text-sm">No pending orders</p>
            </div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-bold text-sm">{order.assetName}</div>
                    <div className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                      {order.type === 'PRICE' ? `Price: ${order.triggerValue}` : `Time: ${format(order.triggerValue, 'HH:mm:ss')}`}
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold",
                    order.direction === 'UP' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                  )}>
                    {order.direction}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-white/60">
                    {currencySymbol}{(order.amount * exchangeRate).toFixed(2)}
                  </div>
                  <button 
                    onClick={() => onCancelPendingOrder(order.id)}
                    className="text-[10px] text-red-500 font-bold hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </motion.div>
  );
}

// --- Main Component ---
function SettingsPage({ 
  onBack, 
  onLogout, 
  timezoneOffset, 
  setTimezoneOffset,
  currency,
  setCurrency,
  socket,
  user,
  chatBackground,
  setChatBackground
}: { 
  onBack: () => void, 
  onLogout: () => void, 
  timezoneOffset: number, 
  setTimezoneOffset: (v: number) => void,
  currency: typeof CURRENCIES[0],
  setCurrency: (c: typeof CURRENCIES[0]) => void,
  socket: any,
  user: FirebaseUser,
  chatBackground: string | null,
  setChatBackground: (b: string | null) => void
}) {
  const { t } = useTranslation();
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)]">
        <button onClick={onBack} className="text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] p-1 rounded-full transition">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold">{t('settings.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* PROFILE */}
        <section>
          <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">{t('settings.profile')}</h2>
          <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-color)]">
            <SettingsItem 
              icon={<User size={20} />} 
              label="Personal Information" 
              onClick={() => setActiveSubPage('PERSONAL')}
            />
            <SettingsItem 
              icon={<Mail size={20} />} 
              label="Contacts" 
              onClick={() => setActiveSubPage('CONTACTS')}
            />
            <SettingsItem 
              icon={<UserCheck size={20} />} 
              label="Verification" 
              isLast 
              onClick={() => setActiveSubPage('VERIFICATION')}
            />
          </div>
        </section>

        {/* SECURITY */}
        <section>
          <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">{t('settings.security')}</h2>
          <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-color)]">
            <SettingsItem 
              icon={<Key size={20} />} 
              label="Password" 
              onClick={() => setActiveSubPage('PASSWORD')}
            />
            <SettingsItem 
              icon={<Shield size={20} />} 
              label="Two-Factor Authentication" 
              onClick={() => setActiveSubPage('2FA')}
            />
            <SettingsItem 
              icon={<Grid size={20} />} 
              label="App PIN" 
              isLast 
              onClick={() => setActiveSubPage('PIN')}
            />
          </div>
        </section>

        {/* GENERAL */}
        <section>
          <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wider">General</h2>
          <div className="bg-[var(--bg-secondary)] rounded-xl overflow-hidden border border-[var(--border-color)]">
            <SettingsItem 
              icon={<Image size={20} />} 
              label={t('nav.terminal')} 
              onClick={() => setActiveSubPage('TRADING')}
            />
            <SettingsItem 
              icon={<Activity size={20} />} 
              label={t('settings.appearance')} 
              onClick={() => setActiveSubPage('APPEARANCE')}
            />
            <SettingsItem 
              icon={<Bell size={20} />} 
              label={t('settings.notifications')} 
              onClick={() => setActiveSubPage('NOTIFICATIONS')}
              isLast 
            />
          </div>
        </section>

        {/* Footer Actions */}
        <div className="space-y-3 pt-4 pb-8">
            <button 
              onClick={onLogout}
              className="w-full bg-[var(--bg-secondary)] text-[#ff4757] font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition active:scale-[0.98]"
            >
                <LogOut size={20} />
                <span>{t('settings.logout')}</span>
            </button>
        </div>
      </div>

      {/* Sub-Pages Overlay */}
      <AnimatePresence>
        {activeSubPage === 'TRADING' && (
          <TradingPlatformSettings onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === 'APPEARANCE' && (
          <AppearanceSettings 
            onBack={() => setActiveSubPage(null)} 
            timezoneOffset={timezoneOffset}
            setTimezoneOffset={setTimezoneOffset}
            currency={currency}
            setCurrency={setCurrency}
            chatBackground={chatBackground}
            setChatBackground={setChatBackground}
          />
        )}
        {activeSubPage === 'NOTIFICATIONS' && (
          <NotificationSettings onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === 'PERSONAL' && (
          <PersonalInformationSettings 
            onBack={() => setActiveSubPage(null)} 
            timezoneOffset={timezoneOffset}
            setTimezoneOffset={setTimezoneOffset}
            user={user}
            currency={currency}
            setCurrency={setCurrency}
          />
        )}
        {activeSubPage === 'CONTACTS' && (
          <ContactSettings onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === 'VERIFICATION' && (
          <VerificationSettings 
            onBack={() => setActiveSubPage(null)} 
            socket={socket}
            userEmail={user.email || ''}
          />
        )}
        {activeSubPage === 'PASSWORD' && (
          <PasswordSettings onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === '2FA' && (
          <TwoFactorSettings 
            onBack={() => setActiveSubPage(null)} 
            socket={socket}
            userEmail={user.email || ''}
          />
        )}
        {activeSubPage === 'PIN' && (
          <AppPinSettings onBack={() => setActiveSubPage(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsItem({ icon, label, isLast, onClick }: { icon: React.ReactNode, label: string, isLast?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--bg-tertiary)] transition active:bg-[var(--bg-tertiary)]/80",
        !isLast && "border-b border-[var(--border-color)]"
      )}
    >
      <div className="flex items-center gap-3 text-[var(--text-secondary)]">
        {icon}
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
      </div>
      <ChevronRight size={16} className="text-[var(--text-secondary)]" />
    </div>
  );
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳' },
];

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  BDT: 110,
  EUR: 0.92,
  INR: 83,
  PKR: 278,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 150,
  TRY: 31,
  BRL: 5,
  IDR: 15600,
  VND: 24600
};

export default function TradingPlatform() {
  const { t } = useTranslation();
  // --- Theme Initialization ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [preferences, setPreferences] = useState({
    language: 'en',
    currency: 'USD',
    timeframe: '1m',
    chartType: 'candles'
  });

  const savePreferences = useCallback(async (newPrefs: Partial<typeof preferences>) => {
    if (!user?.email) return;
    
    setPreferences(prev => ({ ...prev, ...newPrefs }));

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          ...newPrefs
        })
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  }, [user?.email]);
  const { language, setLanguage } = useTranslation();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (preferences.language && preferences.language !== language) {
      setLanguage(preferences.language as any);
    }
  }, [preferences.language, setLanguage, language]);
  const [view, setView] = useState<'HOME' | 'TRADING' | 'PROFILE' | 'MARKET' | 'REWARDS' | 'REFERRAL' | 'HELP' | 'TRADES' | 'SETTINGS' | 'ADMIN' | 'INFO_PAGE' | 'NEWS'>('HOME');
  const [infoPageTitle, setInfoPageTitle] = useState<string>('');
  const [data, setData] = useState<OHLCData[]>([]);
  const [tickHistory, setTickHistory] = useState<Record<string, TickData[]>>({});
  const [currentPrice, setCurrentPrice] = useState<number>(51.677);
  const [activeAccount, setActiveAccount] = useState<string>('DEMO');
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('app-currency');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return CURRENCIES[1];
      }
    }
    return CURRENCIES[1];
  });
  const [balance, setBalance] = useState<number>(0);
  const [demoBalance, setDemoBalance] = useState<number>(1000);
  const [turnoverRequired, setTurnoverRequired] = useState(0);
  const [turnoverAchieved, setTurnoverAchieved] = useState(0);
  const [userBonuses, setUserBonuses] = useState<any[]>([]);
  const [extraAccounts, setExtraAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('app-extra-accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('app-extra-accounts', JSON.stringify(extraAccounts));
    if (socket && user) {
      socket.emit('sync-extra-accounts', {
        email: user.email,
        extraAccounts
      });
    }
  }, [extraAccounts, socket, user]);

  const [kycStatus, setKycStatus] = useState<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'>('NOT_SUBMITTED');
  const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset>(() => {
    try {
      const saved = localStorage.getItem('selectedAsset');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure it's a valid asset from ASSETS list
        const found = ASSETS.find(a => a.id === parsed.id);
        return found || ASSETS[0];
      }
    } catch (e) {}
    return ASSETS[0];
  });

  useEffect(() => {
    localStorage.setItem('selectedAsset', JSON.stringify(selectedAsset));
  }, [selectedAsset]);
  const [marketAssets, setMarketAssets] = useState<Record<string, any>>({});
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supportSettings, setSupportSettings] = useState({ telegram: 'https://t.me/onyxtrade_support', whatsapp: 'https://wa.me/1234567890', email: 'support@onyxtrade.com' });
  const [referralSettings, setReferralSettings] = useState({ bonusAmount: 10, referralPercentage: 5, minDepositForBonus: 20 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [investment, setInvestment] = useState<number>(1);
  const [tradeMode, setTradeMode] = useState<'TIMER' | 'CLOCK'>('CLOCK');
  const [clockOffset, setClockOffset] = useState<number>(1);
  const [timerDuration, setTimerDuration] = useState<number>(60); // 1 min

  const [trades, setTrades] = useState<Trade[]>(() => {
    const saved = localStorage.getItem('onyx_trades');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only keep trades from the last 24 hours to keep storage clean
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return parsed.filter((t: Trade) => t.startTime > dayAgo);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [timezoneOffset, setTimezoneOffset] = useState<number>(() => {
    return Number(localStorage.getItem('app-timezone-offset')) || 0;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [tradeResults, setTradeResults] = useState<TradeResult[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSocialChatOpen, setIsSocialChatOpen] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('pin-enabled') === 'true');
  const [isIndicatorSheetOpen, setIsIndicatorSheetOpen] = useState(false);
  const [chatBackground, setChatBackground] = useState<string | null>(() => localStorage.getItem('chat-background'));
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (chatBackground) {
      localStorage.setItem('chat-background', chatBackground);
    } else {
      localStorage.removeItem('chat-background');
    }
  }, [chatBackground]);

// ... existing code ...

const [activeIndicators, setActiveIndicators] = useState<IndicatorConfig[]>(() => {
    try {
      const saved = localStorage.getItem('activeIndicators');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('activeIndicators', JSON.stringify(activeIndicators));
    } catch (e) {
      console.error('Failed to save indicators', e);
    }
  }, [activeIndicators]);
  const [rewards, setRewards] = useState<any[]>([]);
  const [selectedRewardCode, setSelectedRewardCode] = useState<string | null>(null);
  const [referralStats, setReferralStats] = useState({
    totalEarnings: 0,
    referralBalance: 0,
    referralCount: 0,
    activeTraders: 0,
    conversionRate: 0,
    recentReferrals: [] as any[],
    commissionHistory: [] as any[]
  });

  const exchangeRate = 120; // Should ideally come from server settings

  // Referral Tracking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      localStorage.setItem('onyx_referral_code', refCode);
      // Clean up URL
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const balanceRef = useRef(balance);
  const demoBalanceRef = useRef(demoBalance);
  const tradesRef = useRef(trades);
  const resolvedTradeIdsRef = useRef<Set<string>>(new Set());
  const dataRef = useRef(data);
  const userRef = useRef(user);
  const selectedAssetRef = useRef(selectedAsset);

  useEffect(() => {
    localStorage.setItem('onyx_trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('app-timezone-offset', timezoneOffset.toString());
  }, [timezoneOffset]);

  useEffect(() => {
    balanceRef.current = balance;
    demoBalanceRef.current = demoBalance;
    tradesRef.current = trades;
    dataRef.current = data;
    userRef.current = user;
    selectedAssetRef.current = selectedAsset;
  }, [balance, demoBalance, trades, data, user, selectedAsset]);

  // Auth Listener
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    };
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        try {
          const response = await fetch(`/api/user?email=${firebaseUser.email}`);
          if (response.ok) {
            const userData = await response.json();
            if (userData.language) setPreferences(prev => ({ ...prev, language: userData.language }));
            if (userData.currency) setPreferences(prev => ({ ...prev, currency: userData.currency }));
            if (userData.timeframe) setPreferences(prev => ({ ...prev, timeframe: userData.timeframe }));
            if (userData.chartType) setPreferences(prev => ({ ...prev, chartType: userData.chartType }));
          }
        } catch (error) {
          console.error('Error loading user preferences:', error);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);

  // Sync User Data from Firestore
  useEffect(() => {
    if (!user) {
      setIsUserDataLoaded(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        console.log("Firestore user data updated:", userData);
        
        if (userData.balance !== undefined) setBalance(prev => prev === userData.balance ? prev : userData.balance);
        if (userData.demoBalance !== undefined) setDemoBalance(prev => prev === userData.demoBalance ? prev : userData.demoBalance);
        if (userData.kycStatus !== undefined) setKycStatus(prev => prev === userData.kycStatus ? prev : userData.kycStatus);
        if (userData.turnover_required !== undefined) setTurnoverRequired(prev => prev === userData.turnover_required ? prev : userData.turnover_required);
        if (userData.turnover_achieved !== undefined) setTurnoverAchieved(prev => prev === userData.turnover_achieved ? prev : userData.turnover_achieved);
        if (userData.trades !== undefined) setTrades(prev => JSON.stringify(prev) === JSON.stringify(userData.trades) ? prev : userData.trades);
        if (userData.extraAccounts !== undefined) setExtraAccounts(prev => JSON.stringify(prev) === JSON.stringify(userData.extraAccounts) ? prev : userData.extraAccounts);
        
        if (userData.currency && userData.currencySymbol) {
          setCurrency(prev => {
            if (prev.code === userData.currency && prev.symbol === userData.currencySymbol && prev.name === (userData.currencyName || userData.currency) && prev.flag === (userData.currencyFlag || '')) return prev;
            return {
              code: userData.currency,
              symbol: userData.currencySymbol,
              name: userData.currencyName || userData.currency,
              flag: userData.currencyFlag || ''
            };
          });
        }
        
        // Sync Referral Stats
        if (userData.totalReferralEarnings !== undefined || userData.referralBalance !== undefined || userData.referralCount !== undefined || userData.recentReferrals !== undefined) {
          setReferralStats(prev => {
            const newStats = {
              ...prev,
              totalEarnings: userData.totalReferralEarnings ?? prev.totalEarnings,
              referralBalance: userData.referralBalance ?? prev.referralBalance,
              referralCount: userData.referralCount ?? prev.referralCount,
              recentReferrals: userData.recentReferrals ?? prev.recentReferrals
            };
            if (prev.totalEarnings === newStats.totalEarnings && 
                prev.referralBalance === newStats.referralBalance && 
                prev.referralCount === newStats.referralCount && 
                JSON.stringify(prev.recentReferrals) === JSON.stringify(newStats.recentReferrals)) return prev;
            return newStats;
          });
        }

        setIsUserDataLoaded(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user]);

  const refillDemoBalance = () => {
    if (socket && user) {
      socket.emit('refill-demo-balance', { email: user.email });
    }
  };

  useEffect(() => {
    if (socket && user) {
      const syncUser = () => {
        socket.emit('user-sync', {
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid
        });
        socket.emit('get-notifications', user.email);
      };

      if (socket.connected) {
        syncUser();
      }

      socket.on('connect', syncUser);

      return () => {
        socket.off('connect', syncUser);
      };
    }
  }, [socket, user]);

  useEffect(() => {
    if (socket && user && view === 'REWARDS') {
      socket.emit('get-user-bonuses', user.email);
    }
  }, [socket, user, view]);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);
  const [isAccountsSheetOpen, setIsAccountsSheetOpen] = useState(false);
  const [isTradeInputSheetOpen, setIsTradeInputSheetOpen] = useState(false);
  const [isPendingOrderSheetOpen, setIsPendingOrderSheetOpen] = useState(false);
  const [isRiskManagementOpen, setIsRiskManagementOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setIsOnboardingOpen(true);
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
  }, []);

  const displayBalance = useMemo(() => {
    const rate = EXCHANGE_RATES[currency.code] || 1;
    if (activeAccount === 'DEMO') {
      return demoBalance * rate;
    }
    if (activeAccount === 'REAL') {
      return balance * rate;
    }
    const extra = extraAccounts.find(a => a.id === activeAccount);
    if (extra) {
      return extra.balance;
    }
    return 0;
  }, [balance, demoBalance, activeAccount, currency, extraAccounts]);

  const displayCurrencySymbol = useMemo(() => {
    if (activeAccount === 'DEMO') return currency.symbol;
    if (activeAccount === 'REAL') return currency.symbol;
    const extra = extraAccounts.find(a => a.id === activeAccount);
    if (extra) {
      const curr = CURRENCIES.find(c => c.code === extra.currency);
      return curr ? curr.symbol : '$';
    }
    return '$';
  }, [activeAccount, currency, extraAccounts]);

  const currentExchangeRate = useMemo(() => {
    if (activeAccount === 'DEMO') return EXCHANGE_RATES[currency.code] || 1;
    if (activeAccount === 'REAL') return EXCHANGE_RATES[currency.code] || 1;
    const extra = extraAccounts.find(a => a.id === activeAccount);
    if (extra) return EXCHANGE_RATES[extra.currency] || 1;
    return 1;
  }, [activeAccount, currency.code, extraAccounts]);

  useEffect(() => {
    const rate = EXCHANGE_RATES[currency.code] || 1;
    setInvestment(prev => {
      const newVal = Math.round(1 * rate);
      if (prev === newVal) return prev;
      return newVal;
    });
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('app-currency', JSON.stringify(currency));
  }, [currency]);

  const [chartTimeFrame, setChartTimeFrame] = useState(() => {
    return localStorage.getItem('chartTimeFrame') || '1m';
  });
  const [chartType, setChartType] = useState(() => {
    return localStorage.getItem('chartType') || 'Candlestick';
  });

  useEffect(() => {
    localStorage.setItem('chartTimeFrame', chartTimeFrame);
  }, [chartTimeFrame]);

  useEffect(() => {
    localStorage.setItem('chartType', chartType);
  }, [chartType]);

  const [sentiment, setSentiment] = useState(57); // Percentage of green (up) sentiment

  // Refs for Data
  const lastCloseRef = useRef(selectedAsset.basePrice);
  const trendRef = useRef(0); // Track trend for smoother movement
  const volatilityRef = useRef(1.0); // Dynamic volatility multiplier

  // Initialize Socket.IO Connection
  useEffect(() => {
    // Connect to the same origin (works with reverse proxy)
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
    });

    newSocket.on('initial-prices', (prices: Record<string, number>) => {
      if (prices[selectedAsset.shortName]) {
        setCurrentPrice(prices[selectedAsset.shortName]);
        lastCloseRef.current = prices[selectedAsset.shortName];
      }
    });

    newSocket.on('support-settings', (settings) => {
      setSupportSettings(settings);
    });

    newSocket.on('tutorials', (data) => {
      setTutorials(data);
    });

    newSocket.on('referral-settings', (settings) => {
      setReferralSettings(settings);
    });

    newSocket.on('rewards', (data) => {
      setRewards(data);
    });

    newSocket.on('turnover-updated', (data) => {
      setTurnoverRequired(prev => Math.abs(prev - data.required) < 0.000001 ? prev : data.required);
      setTurnoverAchieved(prev => Math.abs(prev - data.achieved) < 0.000001 ? prev : data.achieved);
    });

    newSocket.on('user-bonuses', (bonuses) => {
      setUserBonuses(bonuses);
    });

    newSocket.on('request-status-updated', ({ requestId, status, message }) => {
      setNotifications(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        title: `Request ${status}`,
        message: message || `Your request has been ${status.toLowerCase()}.`,
        type: status === 'APPROVED' ? 'SUCCESS' : 'DANGER',
        timestamp: Date.now()
      }]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Initialize Data (Candlesticks)
  useEffect(() => {
    if (!socket || !selectedAsset) return;
    
    const assetShortName = selectedAsset.shortName;
    const basePrice = selectedAsset.basePrice;

    setIsLoading(true);
    setData(prev => prev.length === 0 ? prev : []); // Clear old data to prevent flickering
    
    // Reset price to asset base price when asset changes
    lastCloseRef.current = basePrice;
    setCurrentPrice(basePrice);
    trendRef.current = 0;
    volatilityRef.current = 1.0;

    const handleHistory = (response: { asset: string, data: any[] }) => {
      // Use a ref to check current asset to avoid stale closures if needed, 
      // but here selectedAsset is in dependencies so it should be fine.
      if (response.asset !== assetShortName) return;
      
      const ticks = response.data;
      const tfMs = getTimeFrameInMs(chartTimeFrame);
      
      if (!ticks || ticks.length === 0) {
        setIsLoading(false);
        return;
      }

      const candles: OHLCData[] = [];
      const historyTicks: TickData[] = [];
      let currentCandle: OHLCData | null = null;
      
      for (const tick of ticks) {
        historyTicks.push({ time: tick.time, price: tick.price });
        const candleTime = Math.floor(tick.time / tfMs) * tfMs;
        
        if (!currentCandle || currentCandle.time !== candleTime) {
          if (currentCandle) candles.push(currentCandle);
          currentCandle = {
            time: candleTime,
            open: tick.price,
            high: tick.price,
            low: tick.price,
            close: tick.price,
            volume: Math.floor(Math.random() * 100) + 10,
            formattedTime: format(candleTime, 'HH:mm:ss')
          };
        } else {
          currentCandle.high = Math.max(currentCandle.high, tick.price);
          currentCandle.low = Math.min(currentCandle.low, tick.price);
          currentCandle.close = tick.price;
          currentCandle.volume = (currentCandle.volume || 0) + Math.floor(Math.random() * 10) + 1;
        }
      }
      if (currentCandle) candles.push(currentCandle);
      
      setTickHistory(prev => ({ ...prev, [response.asset]: historyTicks }));
      setData(candles);
      if (candles.length > 0) {
        const last = candles[candles.length - 1];
        lastCloseRef.current = last.close;
        setCurrentPrice(last.close);
      }
      
      // Small delay before hiding loader for smoother transition
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
      
      clearTimeout(timeout);
    };

    socket.on('asset-history', handleHistory);
    
    // Add a small delay for the request to ensure the UI has cleared
    const requestTimeout = setTimeout(() => {
      if (socket.connected) {
        socket.emit('request-history', assetShortName);
      } else {
        socket.once('connect', () => {
          socket.emit('request-history', assetShortName);
        });
      }
    }, 100);

    // Fallback if history takes too long
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => {
      socket.off('asset-history', handleHistory);
      clearTimeout(timeout);
      clearTimeout(requestTimeout);
    };
  }, [socket, selectedAsset.shortName, chartTimeFrame]);

  // Handle Visibility Change (Reload chart when coming back to tab)
  // (Removed duplicate listener)

  // Handle Live Ticks from Server
  useEffect(() => {
    if (!socket) return;

    const handleTick = (ticks: Record<string, any>) => {
      setMarketAssets(prev => {
        // Only update if there's a change to avoid unnecessary re-renders
        const hasChange = Object.entries(ticks).some(([key, val]) => prev[key]?.price !== val.price || prev[key]?.isFrozen !== val.isFrozen);
        if (!hasChange) return prev;
        return { ...prev, ...ticks };
      });
      
      const currentAsset = selectedAssetRef.current;
      if (!currentAsset) return;

      const tick = ticks[currentAsset.shortName];
      if (!tick) return;

      const timestamp = tick.time;
      const newPrice = tick.price;
      const tfMs = getTimeFrameInMs(chartTimeFrame);

      setCurrentTime(timestamp);
      setCurrentPrice(newPrice);
      lastCloseRef.current = newPrice;

      // Update frozen status if it changed
      setSelectedAsset(prev => {
        if (prev.isFrozen !== tick.isFrozen) {
          return { ...prev, isFrozen: tick.isFrozen };
        }
        return prev;
      });

      // Update Sentiment based on price movement
      setSentiment(prev => {
        const currentData = dataRef.current;
        const priceDiff = newPrice - (currentData.length > 0 ? currentData[currentData.length - 1].close : newPrice);
        const impact = (priceDiff / currentAsset.volatility) * 3; 
        let next = prev + impact + (Math.random() - 0.5) * 2;
        next += (50 - next) * 0.05;
        return Math.max(10, Math.min(90, next));
      });

      setTickHistory(prev => {
        const assetHistory = prev[currentAsset.shortName] || [];
        const newHistory = [...assetHistory, { time: timestamp, price: newPrice }];
        const limitedHistory = newHistory.length > 10000 ? newHistory.slice(-10000) : newHistory;
        return { ...prev, [currentAsset.shortName]: limitedHistory };
      });

      setData(prev => {
        if (prev.length === 0) return prev;
        
        const lastCandle = prev[prev.length - 1];
        const currentTFStart = Math.floor(timestamp / tfMs) * tfMs;
        
        if (currentTFStart < lastCandle.time) {
            // Ignore older ticks to prevent chart errors (out of order data)
            return prev;
        }

        if (lastCandle.time === currentTFStart) {
            // Update existing candle
            const updatedCandle = {
                ...lastCandle,
                close: newPrice,
                high: Math.max(lastCandle.high, newPrice),
                low: Math.min(lastCandle.low, newPrice),
                volume: (lastCandle.volume || 0) + Math.floor(Math.random() * 10) + 1,
            };
            return [...prev.slice(0, -1), updatedCandle];
        } else {
            // New candle started
            const newCandle = {
                time: currentTFStart,
                open: lastCandle.close,
                high: Math.max(lastCandle.close, newPrice),
                low: Math.min(lastCandle.close, newPrice),
                close: newPrice,
                volume: Math.floor(Math.random() * 100) + 10,
                formattedTime: format(currentTFStart, 'HH:mm:ss'),
            };
            const newData = [...prev, newCandle];
            if (newData.length > 20000) newData.shift();
            return newData;
        }
      });
    };

    const handlePayoutUpdate = (data: { assetId: string, payout: number }) => {
      setMarketAssets(prev => ({
        ...prev,
        [data.assetId]: {
          ...(prev[data.assetId] || {}),
          payout: data.payout
        }
      }));
    };

    const handleGlobalPayoutUpdate = (payout: number) => {
      setMarketAssets(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          updated[key] = { ...updated[key], payout };
        });
        return updated;
      });
    };

    socket.on('market-tick', handleTick);
    socket.on('asset-payout-updated', handlePayoutUpdate);
    socket.on('global-payout-updated', handleGlobalPayoutUpdate);

    socket.on('user-data-updated', (userData) => {
      console.log("Server user data updated:", userData);
      if (userData.balance !== undefined) setBalance(prev => Math.abs(prev - userData.balance) < 0.000001 ? prev : userData.balance);
      if (userData.demoBalance !== undefined) setDemoBalance(prev => Math.abs(prev - userData.demoBalance) < 0.000001 ? prev : userData.demoBalance);
      if (userData.turnover_required !== undefined) setTurnoverRequired(prev => prev === userData.turnover_required ? prev : userData.turnover_required);
      if (userData.turnover_achieved !== undefined) setTurnoverAchieved(prev => prev === userData.turnover_achieved ? prev : userData.turnover_achieved);
      if (userData.trades !== undefined) setTrades(prev => JSON.stringify(prev) === JSON.stringify(userData.trades) ? prev : userData.trades);
      if (userData.extraAccounts !== undefined) setExtraAccounts(prev => JSON.stringify(prev) === JSON.stringify(userData.extraAccounts) ? prev : userData.extraAccounts);
    });

    socket.on('balance-updated', ({ balance: newBalance, type }) => {
      if (type === 'REAL') {
        setBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
      } else {
        setDemoBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
      }
    });

    socket.on('withdrawal-cancelled', ({ id, newBalance }) => {
      setBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
    });

    socket.on('kyc-status-updated', (data: { status: any, reason?: string }) => {
      setKycStatus(data.status);
      if (data.reason) setKycRejectionReason(data.reason);
    });

    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
    });

    socket.on('user-notifications', (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      socket.off('market-tick', handleTick);
      socket.off('asset-payout-updated', handlePayoutUpdate);
      socket.off('global-payout-updated', handleGlobalPayoutUpdate);
      socket.off('user-data-updated');
      socket.off('kyc-status-updated');
      socket.off('balance-updated');
      socket.off('withdrawal-cancelled');
      socket.off('new-notification');
      socket.off('user-notifications');
    };
  }, [socket, selectedAsset.shortName, chartTimeFrame]); // Use shortName instead of full object

  // Re-send active trades to server on connection
  const sentTradesRef = useRef<Set<string>>(new Set());
  const activeTradesCount = useMemo(() => trades.filter(t => t.status === 'ACTIVE').length, [trades]);
  
  useEffect(() => {
    if (!socket || !user || !trades) return;
    
    const activeTrades = trades.filter(t => t.status === 'ACTIVE');
    activeTrades.forEach(trade => {
      if (!sentTradesRef.current.has(trade.id)) {
        sentTradesRef.current.add(trade.id);
        socket.emit('place-trade', trade);
      }
    });
  }, [socket, user, activeTradesCount]);

  // Handle Trade Results from Server
  useEffect(() => {
    if (!socket) return;

    const handleTradeResult = (result: any) => {
      const currentTrades = tradesRef.current;
      const trade = currentTrades.find(t => t.id === result.id);
      
      // Prevent processing the same trade multiple times
      if (resolvedTradeIdsRef.current.has(result.id)) return;
      resolvedTradeIdsRef.current.add(result.id);

      const isWin = result.status === 'WIN';
      
      if (isWin) {
        playSound('win');
      } else {
        playSound('loss');
      }

      // If trade is already updated by user-data-updated, don't update state again
      if (!trade || trade.status !== 'ACTIVE') return;

      const updatedTrades = currentTrades.map(t => {
        if (t.id === result.id) {
          const isWin = result.status === 'WIN';
          const profit = result.profit !== undefined ? result.profit : (isWin ? t.amount * (t.payout / 100) : -t.amount);
          
          return { 
            ...t, 
            status: result.status, 
            profit: profit, 
            closePrice: result.closePrice 
          };
        }
        return t;
      });

      setTrades(updatedTrades);

      // Calculate new balance
      if (result.status === 'WIN') {
        const profit = result.profit;
        if (trade.accountType === 'DEMO') {
          const newDemoBalance = demoBalanceRef.current + trade.amount + profit;
          setDemoBalance(prev => Math.abs(prev - newDemoBalance) < 0.000001 ? prev : newDemoBalance);
        } else if (trade.accountType === 'REAL') {
          const newRealBalance = balanceRef.current + trade.amount + profit;
          setBalance(prev => Math.abs(prev - newRealBalance) < 0.000001 ? prev : newRealBalance);
        } else {
          setExtraAccounts(prev => prev.map(a => {
            if (a.id === trade.accountType) {
              const newBalance = a.balance + trade.amount + profit;
              return { ...a, balance: newBalance };
            }
            return a;
          }));
        }
      }

      // Add to results toast
      setTradeResults(r => [...r, { id: result.id, profit: result.profit, isWin: result.status === 'WIN' }]);
    };

    socket.on('trade-result', handleTradeResult);

    socket.on('user-pending-orders', (orders: any[]) => {
      setPendingOrders(orders);
    });

    socket.on('pending-order-created', (order: any) => {
      // Toast or notification
    });

    socket.on('pending-order-executed', (data: { orderId: number, tradeId: string }) => {
      // Toast or notification
    });

    return () => {
      socket.off('trade-result', handleTradeResult);
      socket.off('user-pending-orders');
      socket.off('pending-order-created');
      socket.off('pending-order-executed');
    };
  }, [socket]);

  // Clear Toasts
  useEffect(() => {
    if (tradeResults.length > 0) {
      const timer = setTimeout(() => setTradeResults(prev => prev.slice(1)), 3000);
      return () => clearTimeout(timer);
    }
  }, [tradeResults.length]);

  const getExpirationTime = () => {
    if (tradeMode === 'CLOCK') {
      const now = Date.now();
      const msToNextMinute = 60000 - (now % 60000);
      const nextClose = msToNextMinute < 30000 ? now + msToNextMinute + 60000 : now + msToNextMinute;
      return nextClose + (clockOffset - 1) * 60000;
    } else {
      return Date.now() + timerDuration * 1000;
    }
  };

  const handleTrade = (type: 'UP' | 'DOWN') => {
    if (selectedAsset.isFrozen) return alert("Trading is currently closed for this asset.");
    
    let currentBalance = 0;
    let rate = 1;
    let accountName = '';

    if (activeAccount === 'DEMO') {
      rate = EXCHANGE_RATES[currency.code] || 1;
      currentBalance = demoBalance;
      accountName = 'Demo';
    } else if (activeAccount === 'REAL') {
      rate = EXCHANGE_RATES[currency.code] || 1;
      currentBalance = balance;
      accountName = 'Real';
    } else {
      const extra = extraAccounts.find(a => a.id === activeAccount);
      if (extra) {
        rate = EXCHANGE_RATES[extra.currency] || 1;
        currentBalance = extra.balance;
        accountName = extra.name;
      }
    }

    const investmentInUSD = investment / rate;

    if (currentBalance < investmentInUSD) {
      alert(`Insufficient ${accountName} balance. You need ${displayCurrencySymbol}${(investmentInUSD * rate).toFixed(2)} but have ${displayCurrencySymbol}${(currentBalance * rate).toFixed(2)}.`);
      return;
    }

    // Risk Management Check
    const savedRM = localStorage.getItem('risk_management');
    if (savedRM) {
      const rm = JSON.parse(savedRM);
      const currentSymbol = displayCurrencySymbol;
      const investmentInDisplay = investment;
      
      // Max Trade Amount Check
      if (rm.maxTradeAmount > 0 && investmentInDisplay > rm.maxTradeAmount) {
        return alert(`Risk Management: Max trade amount is ${currentSymbol}${rm.maxTradeAmount}`);
      }

      // Calculate Daily PnL based on selected timezone
      const now = Date.now();
      const offsetMs = timezoneOffset * 3600000;
      const todayInTimezone = new Date(now + offsetMs);
      todayInTimezone.setUTCHours(0, 0, 0, 0);
      const todayStartUtc = todayInTimezone.getTime() - offsetMs;

      const todaysTrades = trades.filter(t => t.startTime >= todayStartUtc && t.status !== 'ACTIVE' && t.accountType === activeAccount);
      let dailyPnL = 0;
      const rate = EXCHANGE_RATES[currency.code] || 1;
      todaysTrades.forEach(t => {
        const tAmount = t.amount * rate;
        if (t.profit !== undefined) {
          dailyPnL += (t.profit * rate);
        } else if (t.status === 'WIN') {
          dailyPnL += (tAmount * (t.payout / 100));
        } else if (t.status === 'LOSS') {
          dailyPnL -= tAmount;
        }
      });

      // Daily Stop Loss Check
      if (rm.dailyStopLoss > 0 && dailyPnL <= -rm.dailyStopLoss) {
        return alert(`Risk Management: Daily Stop Loss of ${currentSymbol}${rm.dailyStopLoss} reached. Trading restricted.`);
      }

      // Daily Take Profit Check
      if (rm.dailyTakeProfit > 0 && dailyPnL >= rm.dailyTakeProfit) {
        return alert(`Risk Management: Daily Take Profit of ${currentSymbol}${rm.dailyTakeProfit} reached. Trading restricted.`);
      }
    }

    const entryPrice = lastCloseRef.current;
    const newBalance = currentBalance - investmentInUSD;
    
    if (activeAccount === 'DEMO') {
      setDemoBalance(newBalance);
    } else if (activeAccount === 'REAL') {
      setBalance(newBalance);
    } else {
      setExtraAccounts(prev => prev.map(a => a.id === activeAccount ? { ...a, balance: newBalance } : a));
    }
    
    const expirationTime = getExpirationTime();
    const tradeDurationSeconds = Math.floor((expirationTime - Date.now()) / 1000);

    const newTrade: Trade = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      entryPrice: entryPrice,
      amount: investmentInUSD, // Store in USD
      startTime: Date.now(),
      endTime: expirationTime,
      duration: tradeDurationSeconds,
      status: 'ACTIVE',
      accountType: activeAccount,
      payout: selectedAsset.payout,
      asset: selectedAsset.name,
      assetShortName: selectedAsset.shortName,
      assetFlag: selectedAsset.flag,
      assetCategory: selectedAsset.category,
      userEmail: user?.email || 'Anonymous'
    };

    const newTrades = [newTrade, ...trades];
    setTrades(newTrades);
    
    if (socket) {
      sentTradesRef.current.add(newTrade.id);
      socket.emit('place-trade', newTrade);
      playSound('trade');
    }
  };

  const handlePlacePendingOrder = (order: { type: 'PRICE' | 'TIME', value: string, minProfitability: number, direction: 'UP' | 'DOWN' }) => {
    if (socket && user) {
      const pendingOrder = {
        email: user.email,
        uid: user.uid,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        type: order.type,
        triggerValue: order.type === 'PRICE' ? parseFloat(order.value) : parseInt(order.value),
        profitability: order.minProfitability,
        amount: investment,
        duration: timerDuration,
        direction: order.direction,
        accountType: activeAccount
      };
      socket.emit('create-pending-order', pendingOrder);
    }
  };

  const handleCancelPendingOrder = (orderId: number) => {
    if (socket) {
      socket.emit('cancel-pending-order', orderId);
    }
  };

  const activeTrades = useMemo(() => {
    return trades.filter(t => t.status === 'ACTIVE' && t.assetShortName === selectedAsset.shortName && t.accountType === activeAccount);
  }, [trades, selectedAsset.shortName, activeAccount]);

  const currentPayout = marketAssets[selectedAsset.shortName]?.payout || selectedAsset.payout;
  const potentialProfit = (investment * currentPayout / 100).toFixed(2);

  // Handle Visibility Change for Chart Sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket?.connected) {
        setIsLoading(true);
        socket.emit('request-history', selectedAsset.shortName);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, selectedAsset.shortName]); // Use shortName instead of full object

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (view === 'INFO_PAGE') {
    return (
      <InfoPage 
        title={infoPageTitle} 
        onBack={() => setView('HOME')} 
      />
    );
  }

  if (view === 'HOME') {
    return (
      <HomePage 
        tutorials={tutorials}
        onStartTrading={() => {
          if (user) {
            setView('TRADING');
          } else {
            // If not logged in, Auth component will be shown by the next check
            setView('TRADING');
          }
        }} 
        onLogin={() => {
          setView('TRADING');
        }}
        onNavigate={(pageTitle: string) => {
          if (pageTitle === 'Trading Terminal') {
            setView('TRADING');
          } else if (pageTitle === 'Live Support') {
            setIsChatOpen(true);
          } else {
            setInfoPageTitle(pageTitle);
            setView('INFO_PAGE');
          }
        }}
      />
    );
  }

  if (!user) {
    return <Auth onSuccess={() => setView('TRADING')} />;
  }

  if (user?.email?.toLowerCase() === 'emon@gmail.com') {
    return <AdminPanel socket={socket} onBack={() => logout()} userEmail={user.email || ''} />;
  }

  if (view === 'PROFILE' && user) {
    return (
      <ProfilePage 
        onBack={() => setView('TRADING')} 
        onSettings={() => setView('SETTINGS')} 
        user={user} 
        onAdmin={() => setView('ADMIN')} 
        setView={setView}
        balance={balance}
        currency={currency}
        notifications={notifications}
        onNotificationsClick={() => setIsNotificationsOpen(true)}
      />
    );
  }

  if (view === 'SETTINGS' && user) {
    return <SettingsPage 
      onBack={() => setView('PROFILE')} 
      onLogout={() => {
        logout();
        setView('TRADING');
      }} 
      timezoneOffset={timezoneOffset}
      setTimezoneOffset={setTimezoneOffset}
      currency={currency}
      setCurrency={setCurrency}
      socket={socket}
      user={user}
      chatBackground={chatBackground}
      setChatBackground={setChatBackground}
    />;
  }

  if (view === 'ADMIN' && user) {
    return <AdminPanel socket={socket} onBack={() => {
      if (user.email?.toLowerCase() === 'emon@gmail.com') {
        logout();
      } else {
        setView('TRADING');
      }
    }} userEmail={user.email || ''} />;
  }


  return (
    <div className="flex flex-col h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden select-none">
      
      {/* --- Top Header (Only for Trading) --- */}
      {view === 'TRADING' && (
        <header className="flex items-center justify-between px-4 py-0.5 bg-[var(--bg-primary)] z-20 border-b border-[var(--border-color)]">
          {/* Left: Profile */}
          <div 
            onClick={() => setView('PROFILE')}
            className="w-9 h-9 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-secondary)] relative cursor-pointer active:scale-95 transition hover:bg-[var(--bg-tertiary)]"
          >
            <User size={18} />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-[var(--bg-primary)] rounded-full"></div>
          </div>

          {/* Center: Balance */}
          <div 
            onClick={() => setIsAccountsSheetOpen(true)}
            className="flex flex-col items-center cursor-pointer active:scale-95 transition group"
          >
            <div className="text-[var(--text-primary)] font-bold text-lg tracking-tight leading-tight">
              {displayCurrencySymbol}
              {displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-medium transition-colors",
              activeAccount === 'DEMO' ? "text-orange-400 group-hover:text-orange-300" : "text-green-500 group-hover:text-green-400"
            )}>
              {activeAccount === 'DEMO' ? 'Demo' : activeAccount === 'REAL' ? `${currency.code} Account` : extraAccounts.find(a => a.id === activeAccount)?.name || 'Account'} <ChevronDown size={12} strokeWidth={3} />
            </div>
          </div>

          {/* Right: Wallet & Admin */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="w-11 h-9 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition active:scale-95 relative"
              title="Notifications"
            >
              <Bell size={20} strokeWidth={2.5} />
              {notifications.filter(n => !n.isRead).length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center text-[8px] font-black text-white">
                  {notifications.filter(n => !n.isRead).length}
                </div>
              )}
            </button>
            {(user?.email?.toLowerCase() === 'hasan23@gmail.com') && (
              <button 
                onClick={() => setView('ADMIN')}
                className="w-11 h-9 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/30 transition active:scale-95"
                title="Admin Panel"
              >
                <Settings size={20} strokeWidth={2.5} />
              </button>
            )}
            <button 
              onClick={() => setIsPaymentsOpen(true)}
              className="w-11 h-9 bg-[#22c55e] rounded-xl flex items-center justify-center text-[#0a2e16] shadow-[0_4px_12px_rgba(34,197,94,0.2)] hover:bg-[#22c55e]/90 transition active:scale-95"
            >
              <Wallet size={20} strokeWidth={2.5} />
            </button>
          </div>
        </header>
      )}

      {/* --- Asset Bar (Only for Trading) --- */}
      {view === 'TRADING' && (
        <div className="flex items-center justify-between px-4 py-0.5 bg-[var(--bg-primary)] z-10 border-b border-[var(--border-color)]">
          <div 
            onClick={() => setIsAssetSelectorOpen(true)}
            className="flex items-center gap-3 cursor-pointer active:scale-95 transition -ml-1 rounded-lg hover:bg-white/5 py-0.5 px-1"
          >
            <div className="relative">
              <AssetIcon 
                shortName={selectedAsset.shortName} 
                category={selectedAsset.category} 
                flag={selectedAsset.flag} 
              />
              {selectedAsset.isFrozen && (
                <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-[#101114]">
                  <Lock size={8} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-[var(--text-primary)] font-bold text-sm tracking-wide">{selectedAsset.name.split('(')[0].trim()}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium">OTC</span>
                <ChevronDown size={12} className="text-[var(--text-secondary)]" />
              </div>
              <div className="flex items-center gap-1.5 leading-none">
                 <span className="text-green-500 text-[10px] font-bold">{selectedAsset.payout}%</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5 text-[var(--text-secondary)]">
            <Shield size={18} strokeWidth={1.5} className="hover:text-[var(--text-primary)] transition cursor-pointer" onClick={() => setIsRiskManagementOpen(true)} />
            <Compass size={18} strokeWidth={1.5} className="hover:text-[var(--text-primary)] transition cursor-pointer" onClick={() => setIsIndicatorSheetOpen(true)} />
            <div 
              onClick={() => setIsChartSettingsOpen(true)}
              className="flex items-center gap-1.5 text-[var(--text-primary)] cursor-pointer hover:text-[var(--text-secondary)] transition active:scale-95"
            >
              <div className="flex items-center justify-center w-5 h-5">
                 <BarChart2 size={18} strokeWidth={1.5} className="text-[var(--text-primary)]" />
              </div>
              <span className="text-xs font-bold">{chartTimeFrame}</span>
            </div>
          </div>
        </div>
      )}

      <IndicatorSheet 
        isOpen={isIndicatorSheetOpen}
        onClose={() => setIsIndicatorSheetOpen(false)}
        activeIndicators={activeIndicators}
        onSelectIndicator={(indicator) => {
          setActiveIndicators(prev => prev.some(i => i.id === indicator.id) ? prev.filter(i => i.id !== indicator.id) : [...prev, indicator]);
        }}
      />

      <OnboardingModal 
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
      <AnimatePresence>
        {isAssetSelectorOpen && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-50"
          >
             <AssetSelector 
                isOpen={isAssetSelectorOpen} 
                onClose={() => setIsAssetSelectorOpen(false)} 
                onSelect={setSelectedAsset}
                currentAssetId={selectedAsset.id}
                marketAssets={marketAssets}
             />
          </motion.div>
        )}
      </AnimatePresence>


      <AccountsSheet 
        isOpen={isAccountsSheetOpen}
        onClose={() => setIsAccountsSheetOpen(false)}
        activeAccount={activeAccount}
        onSelectAccount={(id) => {
          setIsSwitchingAccount(true);
          setTimeout(() => {
            setActiveAccount(id);
            setIsSwitchingAccount(false);
          }, 1500); // 1.5s professional transition
        }}
        onRefill={refillDemoBalance}
        accounts={[
          { id: 'DEMO', name: 'Demo', currency: currency.code, symbol: currency.symbol, balance: demoBalance * (EXCHANGE_RATES[currency.code] || 1), type: 'DEMO', flag: currency.flag },
          { id: 'REAL', name: `${currency.code} Account`, currency: currency.code, symbol: currency.symbol, balance: balance * (EXCHANGE_RATES[currency.code] || 1), type: 'REAL', flag: currency.flag },
          ...extraAccounts
        ]}
        onAddAccount={(account) => setExtraAccounts(prev => [...prev, account])}
        onDeleteAccount={(id) => {
          setExtraAccounts(prev => prev.filter(a => a.id !== id));
          if (activeAccount === id) {
            setActiveAccount('DEMO');
          }
        }}
      />

      <AnimatePresence>
        {isSwitchingAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] border-4 border-[var(--border-color)] flex items-center justify-center mb-6"
            >
              <RefreshCw size={40} className="text-[#22c55e] animate-spin" />
            </motion.div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Switching Account</h2>
            <p className="text-[var(--text-secondary)]">Preparing your {activeAccount === 'DEMO' ? 'Real' : 'Demo'} trading environment...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Main Content Area --- */}
      <div className="flex-1 relative bg-[var(--bg-primary)] overflow-hidden">
        {view === 'TRADING' && (
          <div className="w-full h-full relative">
            {/* Sentiment Bar (Left) */}
            <div className="absolute left-1 top-4 bottom-16 w-1 bg-[var(--bg-tertiary)]/30 mx-1 rounded-full overflow-hidden flex flex-col z-10 pointer-events-none">
              <div className="bg-red-500 w-full relative transition-all duration-200" style={{ height: `${100 - sentiment}%` }}>
                 <span className="absolute top-0 left-2 text-[10px] text-red-500 font-bold">{Math.round(100 - sentiment)}%</span>
              </div>
              <div className="flex-1 bg-green-500 w-full relative transition-all duration-200">
                 <span className="absolute bottom-0 left-2 text-[10px] text-green-500 font-bold">{Math.round(sentiment)}%</span>
              </div>
            </div>

            <TradingChart 
              key={`${selectedAsset.id}-${chartTimeFrame}`}
              data={data}
              trades={activeTrades}
              assetName={selectedAsset.name}
              currentTime={currentTime}
              chartType={chartType}
              chartTimeFrame={chartTimeFrame}
              isLoading={isLoading}
              timezoneOffset={timezoneOffset}
              activeIndicators={activeIndicators}
              currencySymbol={displayCurrencySymbol}
              exchangeRate={currentExchangeRate}
            />
          </div>
        )}

        {view === 'TRADES' && (
          <TradesPage 
            trades={trades.filter(t => t.accountType === activeAccount)} 
            pendingOrders={pendingOrders.filter(o => o.accountType === activeAccount)}
            tickHistory={tickHistory} 
            currentPrice={currentPrice} 
            currentTime={currentTime} 
            currentAssetShortName={selectedAsset.shortName}
            marketAssets={marketAssets}
            onViewAsset={() => { setView('TRADING'); setIsAssetSelectorOpen(true); }} 
            currencySymbol={displayCurrencySymbol}
            exchangeRate={currentExchangeRate}
            onCancelPendingOrder={handleCancelPendingOrder}
          />
        )}
        {view === 'MARKET' && <MarketPage />}
        {view === 'REWARDS' && (
          <RewardsPage 
            turnoverRequired={turnoverRequired}
            turnoverAchieved={turnoverAchieved}
            userBonuses={userBonuses}
            currencySymbol={displayCurrencySymbol} 
            rewards={rewards}
            onApplyReward={(code) => {
              setSelectedRewardCode(code);
              setIsPaymentsOpen(true);
            }}
          />
        )}
        {view === 'REFERRAL' && <ReferralPage user={user} referralSettings={referralSettings} currencySymbol={displayCurrencySymbol} onBack={() => setView('PROFILE')} referralStats={referralStats} />}
        {view === 'PROFILE' && (
          <ProfilePage 
            onBack={() => setView('TRADING')} 
            onSettings={() => setView('SETTINGS')}
            onAdmin={() => setView('ADMIN')}
            user={user!}
            setView={setView}
            balance={balance}
            currency={currency}
            notifications={notifications}
            onNotificationsClick={() => setIsNotificationsOpen(true)}
          />
        )}
        {view === 'HELP' && (
          <HelpPage 
            onSupportClick={() => setIsChatOpen(true)} 
            supportSettings={supportSettings}
            tutorials={tutorials}
            currencySymbol={activeAccount === 'DEMO' ? '$' : currency.symbol}
          />
        )}

      </div>

      {/* --- Support Chat Overlay --- */}
      <AnimatePresence>
        {isChatOpen && (
          <SupportChat 
            onClose={() => setIsChatOpen(false)} 
            supportSettings={supportSettings}
            socket={socket}
            userEmail={user?.email || 'Anonymous'}
            chatBackground={chatBackground}
          />
        )}
      </AnimatePresence>

      {/* --- Social Chat Overlay --- */}
      <AnimatePresence>
        {isSocialChatOpen && (
          <SocialChat 
            key={chatBackground}
            onClose={() => setIsSocialChatOpen(false)} 
            userEmail={user?.email || 'Anonymous'}
            chatBackground={chatBackground}
            socket={socket}
          />
        )}
      </AnimatePresence>

      {/* --- Bottom Controls (Only for Trading) --- */}
      {view === 'TRADING' && (
        <div className="bg-[var(--bg-primary)] px-2 py-1 z-20 border-t border-[var(--border-color)] flex flex-col gap-1">
          {/* Top Info Overlay (Moved from chart) */}
          <div className="flex justify-between text-[10px] text-gray-500 font-medium px-2">
            <span>Fixed Time mode</span>
            <div className="flex items-center gap-1">
              <span>Profit:</span>
              <span className="text-[#2ebd85] font-bold">+{displayCurrencySymbol}{potentialProfit}</span>
              <HelpCircle size={10} />
            </div>
          </div>

          {selectedAsset.isFrozen ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20 w-full justify-center">
                <Lock size={16} />
                <span className="font-bold text-sm">Trading is closed for this asset</span>
              </div>
              <button 
                onClick={() => setIsAssetSelectorOpen(true)}
                className="w-full bg-[var(--bg-secondary)] text-blue-500 py-2 rounded-xl font-bold text-xs border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition"
              >
                Explore other assets
              </button>
            </div>
          ) : (
            <>
              {/* Row 1: Inputs */}
              <div className="flex items-center gap-2 mb-1">
                {/* Time Input Group */}
                <div className="flex-1 flex items-center bg-[var(--bg-secondary)] rounded-lg h-8 p-0.5 border border-[var(--border-color)]">
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (tradeMode === 'CLOCK') {
                        setClockOffset(Math.max(1, clockOffset - 1));
                      } else {
                        setTimerDuration(Math.max(60, timerDuration - 60));
                      }
                    }}
                    className="w-8 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:bg-white/5 rounded transition"
                  >
                    <Minus size={12} />
                  </button>
                  <div 
                    onClick={() => setIsTradeInputSheetOpen(true)}
                    className="flex-1 text-center text-[var(--text-primary)] font-bold text-xs cursor-pointer hover:text-[var(--text-secondary)] transition flex flex-col items-center justify-center"
                  >
                    {tradeMode === 'CLOCK' ? (
                      <>
                        <div>{format(getExpirationTime(), 'HH:mm:ss')}</div>
                        <div className="text-[10px] opacity-70 font-normal mt-0.5">
                          {(() => {
                            const remaining = Math.max(0, getExpirationTime() - currentTime);
                            const m = Math.floor(remaining / 60000);
                            const s = Math.floor((remaining % 60000) / 1000);
                            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                          })()}
                        </div>
                      </>
                    ) : (
                      <div className="py-1">
                        {Math.floor(timerDuration / 60) > 0 ? `${Math.floor(timerDuration / 60)} min` : `${timerDuration} sec`}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (tradeMode === 'CLOCK') {
                        setClockOffset(clockOffset + 1);
                      } else {
                        setTimerDuration(timerDuration + 60);
                      }
                    }}
                    className="w-8 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:bg-white/5 rounded transition"
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Investment Input Group */}
                <div className="flex-1 flex items-center bg-[var(--bg-secondary)] rounded-lg h-8 p-0.5 border border-[var(--border-color)]">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setInvestment(Math.max(currency.code === 'BDT' ? 20 : Math.round(1 * (EXCHANGE_RATES[currency.code] || 1)), Math.floor(investment / 2))); }}
                    className="w-8 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:bg-white/5 rounded transition"
                  >
                    <Divide size={12} />
                  </button>
                  <div 
                    className="flex-1 h-full flex items-center justify-center min-w-0"
                  >
                    <input 
                      type="number" 
                      value={investment === 0 ? '' : investment} 
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        setInvestment(val);
                      }}
                      onBlur={e => {
                        const min = currency.code === 'BDT' ? 20 : Math.round(1 * (EXCHANGE_RATES[currency.code] || 1));
                        if (Number(e.target.value) < min) setInvestment(min);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent w-full text-center focus:outline-none cursor-text px-1 text-[var(--text-primary)] font-bold text-xs"
                      style={{ fontSize: investment > 99999 ? '10px' : '12px' }}
                      placeholder="0"
                    />
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setInvestment(investment * 2); }}
                    className="w-8 h-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:bg-white/5 rounded transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Row 2: Trade Buttons */}
              <div className="flex items-center gap-2 h-8 mb-1">
                <button 
                  onClick={() => handleTrade('UP')}
                  className="flex-1 h-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-[0.98] transition rounded-lg flex items-center justify-between px-3 shadow-md z-10"
                >
                  <span className="font-bold text-white text-[10px] uppercase tracking-wider">Up</span>
                  <ArrowUp size={16} strokeWidth={3} className="text-white" />
                </button>

                {/* Middle Clock/Pending Button */}
                <button 
                  onClick={() => setIsPendingOrderSheetOpen(true)}
                  className="w-8 h-full bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] active:scale-[0.95] transition rounded-lg flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)] z-10"
                >
                  <Clock size={16} />
                </button>

                <button 
                  onClick={() => handleTrade('DOWN')}
                  className="flex-1 h-full bg-[#ff4757] hover:bg-[#ff1f33] active:scale-[0.98] transition rounded-lg flex items-center justify-between px-3 shadow-md z-10"
                >
                  <span className="font-bold text-white text-[10px] uppercase tracking-wider">Down</span>
                  <ArrowDown size={16} strokeWidth={3} className="text-white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- Bottom Navigation --- */}
      <nav className="bg-[var(--bg-primary)] border-t border-[var(--border-color)] px-2 py-0.5 flex justify-between items-center text-[8px] font-medium text-[var(--text-secondary)]">
        <NavButton 
          icon={<BarChart2 size={18} />} 
          label={t('nav.terminal')} 
          active={view === 'TRADING'} 
          onClick={() => setView('TRADING')}
        />
        <NavButton 
          icon={<ArrowUpDown size={18} />} 
          label={t('nav.trades')} 
          count={activeTrades.length} 
          active={view === 'TRADES'}
          onClick={() => setView('TRADES')}
        />
        <NavButton 
          icon={<ShoppingBag size={18} />} 
          label={t('nav.market')} 
          active={view === 'MARKET'}
          onClick={() => setView('MARKET')}
        />
        <NavButton 
          icon={<Trophy size={18} />} 
          label={t('nav.rewards')} 
          active={view === 'REWARDS'}
          onClick={() => setView('REWARDS')}
        />

        <NavButton 
          icon={<HelpCircle size={18} />} 
          label={t('nav.help')} 
          active={view === 'HELP'}
          onClick={() => setView('HELP')}
        />
      </nav>

      {/* --- Sheets --- */}
      <PaymentsSheet 
        isOpen={isPaymentsOpen} 
        onClose={() => {
          setIsPaymentsOpen(false);
          setSelectedRewardCode(null);
        }} 
        balance={displayBalance}
        rawBalance={balance}
        userId={user?.uid}
        activeAccount={activeAccount}
        currencySymbol={displayCurrencySymbol}
        currencyCode={activeAccount === 'DEMO' ? currency.code : activeAccount === 'REAL' ? currency.code : extraAccounts.find(a => a.id === activeAccount)?.currency || 'USD'}
        initialPromoCode={selectedRewardCode}
        socket={socket}
        userEmail={user?.email || ''}
        turnoverRequired={turnoverRequired}
        turnoverAchieved={turnoverAchieved}
      />
      
      <ChartSettingsSheet 
        isOpen={isChartSettingsOpen} 
        onClose={() => setIsChartSettingsOpen(false)}
        currentTimeFrame={chartTimeFrame}
        onTimeFrameChange={(tf) => {
          setIsLoading(true);
          setChartTimeFrame(tf);
          setTimeout(() => setIsLoading(false), 800);
          setIsChartSettingsOpen(false);
        }}
        currentChartType={chartType}
        onChartTypeChange={(type) => {
          setIsLoading(true);
          setChartType(type);
          setTimeout(() => setIsLoading(false), 800);
          setIsChartSettingsOpen(false);
        }}
      />

      <TradeInputSheet 
        isOpen={isTradeInputSheetOpen}
        onClose={() => setIsTradeInputSheetOpen(false)}
        tradeMode={tradeMode}
        setTradeMode={setTradeMode}
        clockOffset={clockOffset}
        setClockOffset={setClockOffset}
        timerDuration={timerDuration}
        setTimerDuration={setTimerDuration}
        expirationTime={getExpirationTime()}
        investment={investment}
        onInvestmentChange={setInvestment}
        currentPrice={currentPrice}
        currencySymbol={displayCurrencySymbol}
      />

      <PendingOrderSheet
        isOpen={isPendingOrderSheetOpen}
        onClose={() => setIsPendingOrderSheetOpen(false)}
        assetName={selectedAsset.name}
        currentPrice={currentPrice}
        onPlaceOrder={handlePlacePendingOrder}
      />

      <RiskManagementSheet
        isOpen={isRiskManagementOpen}
        onClose={() => setIsRiskManagementOpen(false)}
        balance={displayBalance}
        currencySymbol={displayCurrencySymbol}
      />

      <NotificationsSheet 
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        socket={socket}
      />
    </div>
  );
}

const NotificationsSheet = ({ isOpen, onClose, notifications, socket }: { isOpen: boolean, onClose: () => void, notifications: any[], socket: any }) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = (id: string) => {
    socket.emit('mark-notification-read', id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)] rounded-t-[32px] z-[70] flex flex-col max-h-[85vh] border-t border-[var(--border-color)]"
          >
            <div className="w-12 h-1.5 bg-[var(--bg-tertiary)] rounded-full mx-auto mt-3 mb-4" />
            
            <div className="px-6 flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-[var(--text-primary)]">Notifications</h2>
                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">
                  {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id}
                      onClick={() => handleMarkRead(notif.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition relative overflow-hidden",
                        notif.isRead 
                          ? "bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-60" 
                          : "bg-[var(--bg-secondary)] border-blue-500/30 shadow-lg"
                      )}
                    >
                      {!notif.isRead && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={cn("font-bold text-sm", !notif.isRead ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]")}>
                          {notif.title}
                        </h3>
                        <span className="text-[10px] text-[var(--text-secondary)] font-bold">
                          {format(notif.timestamp, 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                          notif.type === 'ALERT' ? "bg-red-500/10 text-red-500" :
                          notif.type === 'PROMO' ? "bg-purple-500/10 text-purple-500" :
                          "bg-blue-500/10 text-blue-500"
                        )}>
                          {notif.type || 'SYSTEM'}
                        </span>
                        <span className="text-[9px] text-[var(--text-secondary)] font-bold">
                          {format(notif.timestamp, 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mb-4 border border-dashed border-[var(--border-color)]">
                    <Bell size={32} className="text-[var(--text-secondary)] opacity-20" />
                  </div>
                  <h3 className="font-bold text-[var(--text-primary)] mb-1">No notifications yet</h3>
                  <p className="text-xs text-[var(--text-secondary)] max-w-[200px]">
                    When we have updates or alerts for you, they'll appear here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NavButton({ icon, label, active, count, onClick }: { icon: React.ReactNode, label: string, active?: boolean, count?: number, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
      "flex flex-col items-center gap-0 p-1 rounded-lg transition min-w-[55px] relative",
      active ? "text-[var(--text-primary)]" : "hover:text-[var(--text-secondary)]"
    )}>
      <div className={cn("p-0.5 rounded-md", active && "bg-[var(--text-primary)]/10")}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
      </div>
      <span className="scale-90 origin-top">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border border-[var(--bg-primary)]">
          {count}
        </span>
      )}
    </button>
  );
}



function TradeDetailsSheet({ trade, onClose, tickHistory, currencySymbol, exchangeRate }: { trade: Trade, onClose: () => void, tickHistory: TickData[], currencySymbol: string, exchangeRate: number }) {
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const profit = (trade.profit !== undefined ? trade.profit : (isWin ? trade.amount * (trade.payout / 100) : -trade.amount)) * exchangeRate;
  
  // Format profit string
  let profitString = `${currencySymbol}${Math.round(Math.abs(profit))}`;
  let profitColor = 'text-gray-400';
  
  if (isWin) {
    profitString = `+${currencySymbol}${Math.round(profit)}`;
    profitColor = 'text-[#22c55e]';
  } else if (isLoss) {
    profitString = `-${currencySymbol}${Math.round(Math.abs(profit))}`;
    profitColor = 'text-[#ff4757]';
  } else {
    profitString = `${currencySymbol}0`;
  }

  // Generate chart data from history or fallback to simulation
  const chartData = useMemo(() => {
    const endTime = trade.status === 'ACTIVE' ? Date.now() : trade.endTime;
    const relevantTicks = tickHistory.filter(t => t.time >= trade.startTime - 5000 && t.time <= endTime + 2000);
    
    // If we have enough real data (at least 2 points), use it
    if (relevantTicks.length > 1) {
        return relevantTicks.map((t, i) => ({
            i,
            price: t.price,
            time: t.time
        }));
    }

    // Fallback: Generate fake chart data for the trade duration
    const data = [];
    const points = 30;
    const startPrice = trade.entryPrice;
    const endPrice = trade.closePrice || trade.entryPrice;
    const duration = endTime - trade.startTime;
    
    for (let i = 0; i <= points; i++) {
      const progress = i / points;
      const trend = startPrice + (endPrice - startPrice) * progress;
      const noise = (Math.random() - 0.5) * (Math.abs(endPrice - startPrice) * 0.3);
      
      let price = trend + noise;
      if (i === 0) price = startPrice;
      if (i === points) price = endPrice;
      
      data.push({ 
          i, 
          price,
          time: trade.startTime + (progress * duration)
      });
    }
    return data;
  }, [trade, tickHistory]);

  const minPrice = Math.min(...chartData.map(d => d.price), trade.entryPrice, trade.closePrice || trade.entryPrice);
  const maxPrice = Math.max(...chartData.map(d => d.price), trade.entryPrice, trade.closePrice || trade.entryPrice);
  const range = maxPrice - minPrice || 0.001;
  const padding = range * 0.2 || 0.001;

  const minTime = Math.min(...chartData.map(d => d.time));
  const maxTime = Math.max(...chartData.map(d => d.time));
  const timeRange = maxTime - minTime || 1;

  const getCoordY = (price: number) => {
    return 100 - ((price - (minPrice - padding)) / (range + 2 * padding) * 100);
  };

  const getCoordX = (time: number) => {
    return ((time - minTime) / timeRange) * 100;
  };

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]"
    >
      {/* Header with Title and Tabs */}
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">Trades</h1>
          <button onClick={onClose} className="p-2 text-white/60 hover:text-white transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex gap-6 border-b border-white/10 pb-2 mb-4">
          <span className="text-white font-bold border-b-2 border-white pb-2 px-1">Fixed Time</span>
          <span className="text-white/40 font-bold px-1">Forex</span>
          <span className="text-white/40 font-bold px-1">Stocks</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide">
        {/* Asset Header Card */}
        <div className="bg-[#1a1b1e] rounded-3xl p-5 mb-6 border border-white/5 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <AssetIcon 
                shortName={trade.assetShortName} 
                category={trade.assetCategory} 
                flag={trade.assetFlag} 
                size="md"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-bold text-sm tracking-tight">{trade.assetShortName} · {trade.payout}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xl font-black text-white">
                  <span>{currencySymbol}{Math.round(trade.amount * exchangeRate)}</span>
                  {trade.type === 'UP' ? <ArrowUp size={18} className="text-[#22c55e]" strokeWidth={3} /> : <ArrowDown size={18} className="text-[#ff4757]" strokeWidth={3} />}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">1 min</span>
              <span className={cn("text-xl font-black", profitColor)}>{profitString}</span>
            </div>
          </div>

          {/* Professional Trade Path View */}
          <div className="h-48 bg-[#121212] rounded-2xl relative overflow-hidden border border-white/5 p-0 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 30, bottom: 10, left: 30 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ffd0" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#00ffd0" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide domain={['auto', 'auto']} />
                <YAxis domain={[minPrice - padding, maxPrice + padding]} hide />
                
                <ReferenceLine x={chartData[0]?.time} stroke="#333" strokeDasharray="3 3" />
                <ReferenceLine x={chartData[chartData.length - 1]?.time} stroke="#333" strokeDasharray="3 3" />
                <ReferenceLine y={trade.entryPrice} stroke={trade.type === 'UP' ? '#22c55e' : '#ff4757'} strokeWidth={1} strokeOpacity={0.6} />

                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#00ffd0" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorPrice)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            
            {/* Custom Markers Overlay */}
            <div className="absolute inset-0 pointer-events-none">
               <div 
                 className={cn(
                   "absolute w-6 h-6 rounded-full border border-white/20 z-20 shadow-lg flex items-center justify-center",
                   trade.type === 'UP' ? "bg-[#22c55e]" : "bg-[#ff4757]"
                 )}
                 style={{ left: '20px', top: `${getCoordY(trade.entryPrice)}%`, transform: 'translateY(-50%)' }}
               >
                 {trade.type === 'UP' ? <ArrowUp size={12} className="text-white" strokeWidth={4} /> : <ArrowDown size={12} className="text-white" strokeWidth={4} />}
               </div>
               <div className="absolute w-1 h-1 bg-white rounded-full z-30" style={{ left: '30px', top: `${getCoordY(trade.entryPrice)}%`, transform: 'translate(-50%, -50%)' }} />
               <div className="absolute w-1 h-1 bg-white rounded-full z-30" style={{ right: '30px', top: `${getCoordY(trade.entryPrice)}%`, transform: 'translate(50%, -50%)' }} />
            </div>
          </div>
          
          <button className="w-full mt-4 py-3 bg-[#25262b] hover:bg-[#2c2d33] text-white font-bold rounded-xl border border-white/5 transition active:scale-[0.98] shadow-lg text-sm">
            Show on Chart
          </button>
        </div>

        {/* Details List */}
        <div className="space-y-4 mb-8">
          <DetailRow label="Amount" value={`${currencySymbol}${Math.round(trade.amount * exchangeRate)}`} />
          <DetailRow label="PnL" value={profitString} valueClassName={profitColor} />
          <DetailRow 
            label="Trade ID" 
            value={trade.id.slice(0, 11).toUpperCase()} 
            showCopy 
            onCopy={() => navigator.clipboard.writeText(trade.id)}
          />
          <DetailRow label="Closed" value={isWin ? "with a profit" : "with a loss"} />
          <DetailRow label="Duration" value="1 min" />
          <DetailRow label="Trade opened" value={format(trade.startTime, 'MMM dd HH:mm:ss.SSS')} />
          <DetailRow label="Trade closed" value={format(trade.endTime, 'MMM dd HH:mm:ss.SSS')} />
          <DetailRow label="Opening quote" value={trade.entryPrice.toFixed(5)} />
          <DetailRow label="Closing quote" value={trade.closePrice?.toFixed(5) || '---'} />
        </div>

        <div className="px-2 mb-8">
          <p className="text-white/40 text-[11px] leading-relaxed">
            You can see the tick-by-tick quotes for this trade in the <span className="text-[#22c55e] font-bold">Quotes History</span>
          </p>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full bg-[#25262b] text-white font-bold py-4 rounded-2xl hover:bg-[#2c2d33] transition active:scale-[0.98] shadow-xl text-sm border border-white/5"
        >
          Close
        </button>
      </div>
    </motion.div>
  );
}

const DetailRow = ({ label, value, valueClassName, showCopy, onCopy }: { label: string, value: string, valueClassName?: string, showCopy?: boolean, onCopy?: () => void }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-white/40 text-sm font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className={cn("font-medium text-sm text-white", valueClassName)}>{value}</span>
      {showCopy && (
        <button onClick={onCopy} className="text-white/40 hover:text-white transition">
          <Copy size={14} />
        </button>
      )}
    </div>
  </div>
);

function TradesPage({ 
  trades, 
  pendingOrders,
  onViewAsset, 
  tickHistory, 
  currentPrice, 
  currentTime, 
  currentAssetShortName, 
  marketAssets, 
  currencySymbol, 
  exchangeRate,
  onCancelPendingOrder
}: { 
  trades: Trade[], 
  pendingOrders: any[],
  onViewAsset: () => void, 
  tickHistory: Record<string, TickData[]>, 
  currentPrice: number, 
  currentTime: number, 
  currentAssetShortName: string, 
  marketAssets: Record<string, any>, 
  currencySymbol: string, 
  exchangeRate: number,
  onCancelPendingOrder: (id: number) => void
}) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const activeTrades = trades.filter(t => t.status === 'ACTIVE');
  const closedTrades = trades.filter(t => t.status !== 'ACTIVE').sort((a, b) => b.endTime - a.endTime);

  return (
    <div className="h-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col relative">
      <div className="p-4 pb-2">
        <h1 className="text-2xl font-bold">Trades</h1>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] px-4 mb-4">
        <button className="px-4 py-2 border-b-2 border-[var(--text-primary)] font-bold text-sm text-[var(--text-primary)]">Fixed Time</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Open Trades Section */}
        {activeTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-[200px]">You have no open Fixed Time trades on this account</p>
            <button 
              onClick={onViewAsset}
              className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold py-3 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition"
            >
              Explore Assets
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-8">
             <h2 className="text-lg font-bold mb-2">Open Trades</h2>
             {activeTrades.map(trade => (
               <TradeItem 
                  key={trade.id} 
                  trade={trade} 
                  currentPrice={marketAssets[trade.assetShortName]?.price || currentPrice}
                  currentTime={currentTime}
                  onClick={() => setSelectedTrade(trade)} 
                  currencySymbol={currencySymbol}
                  exchangeRate={exchangeRate}
                />
             ))}
          </div>
        )}

        {/* Closed Trades Section */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Closed Trades</h2>
          <button 
            onClick={() => setShowHistory(true)}
            className="text-xs text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] transition"
          >
            Show All <ChevronLeft className="rotate-180" size={12}/>
          </button>
        </div>

        <div className="space-y-2">
          {closedTrades.length === 0 ? (
            <p className="text-[var(--text-secondary)] text-xs text-center py-4">No trade history yet</p>
          ) : (
            closedTrades.slice(0, 5).map(trade => (
              <TradeItem key={trade.id} trade={trade} onClick={() => setSelectedTrade(trade)} currencySymbol={currencySymbol} exchangeRate={exchangeRate} />
            ))
          )}
        </div>
      </div>

      {/* Trade Details Sheet Overlay */}
      <AnimatePresence>
        {selectedTrade && (
          <TradeDetailsSheet 
            trade={selectedTrade} 
            tickHistory={tickHistory[selectedTrade.assetShortName] || []} 
            onClose={() => setSelectedTrade(null)} 
            currencySymbol={currencySymbol}
            exchangeRate={exchangeRate}
          />
        )}
        {showHistory && (
          <TradeHistoryLog 
            trades={closedTrades} 
            pendingOrders={pendingOrders}
            onClose={() => setShowHistory(false)} 
            currencySymbol={currencySymbol}
            exchangeRate={exchangeRate}
            onSelectTrade={(t) => {
              setSelectedTrade(t);
              setShowHistory(false);
            }}
            onCancelPendingOrder={onCancelPendingOrder}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

const TradeItem: React.FC<{ trade: Trade, onClick?: () => void, currentPrice?: number, currentTime?: number, currencySymbol: string, exchangeRate: number }> = ({ trade, onClick, currentPrice, currentTime, currencySymbol, exchangeRate }) => {
  const isActive = trade.status === 'ACTIVE';
  
  let profitString = '';
  let profitColor = 'text-[var(--text-secondary)]';
  let timeString = '';

  if (isActive && currentPrice !== undefined && currentTime !== undefined) {
    // Active Trade Logic
    const timeLeft = Math.max(0, Math.ceil((trade.endTime - currentTime) / 1000));
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const isWinning = trade.type === 'UP' 
      ? currentPrice > trade.entryPrice 
      : currentPrice < trade.entryPrice;
    
    const potentialProfit = trade.amount * (trade.payout / 100) * exchangeRate;
    
    if (isWinning) {
        profitString = `+${currencySymbol}${potentialProfit.toFixed(2)}`;
        profitColor = 'text-[#22c55e]';
    } else {
        profitString = `-${currencySymbol}${(trade.amount * exchangeRate).toFixed(2)}`;
        profitColor = 'text-[#ff4757]';
    }

  } else {
    // Closed Trade Logic
    const isWin = trade.status === 'WIN';
    const isLoss = trade.status === 'LOSS';
    const profit = (trade.profit !== undefined ? trade.profit : (isWin ? trade.amount * (trade.payout / 100) : -trade.amount)) * exchangeRate;

    timeString = Math.floor(trade.duration / 60) > 0 ? `${Math.floor(trade.duration / 60)} min` : `${trade.duration} sec`;

    if (isWin) {
      profitString = `+${currencySymbol}${Math.round(profit)}`;
      profitColor = 'text-[#22c55e]';
    } else if (isLoss) {
      profitString = `-${currencySymbol}${Math.round(Math.abs(profit))}`;
      profitColor = 'text-[#ff4757]';
    } else {
      profitString = `${currencySymbol}0`;
      profitColor = 'text-[var(--text-secondary)]';
    }
  }

  return (
    <div 
      onClick={onClick}
      className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] flex items-center justify-between cursor-pointer active:scale-[0.98] transition hover:bg-[var(--bg-tertiary)]"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <AssetIcon 
            shortName={trade.assetShortName} 
            category={trade.assetCategory} 
            flag={trade.assetFlag} 
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--bg-secondary)] z-30">
             {trade.type === 'UP' 
               ? <ArrowUp size={10} className="text-[#22c55e]" strokeWidth={3} /> 
               : <ArrowDown size={10} className="text-[#ff4757]" strokeWidth={3} />
             }
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-primary)] font-bold text-sm">{trade.assetShortName}</span>
            <span className="text-xs text-[var(--text-secondary)]">· {isActive ? `${trade.payout}%` : 'Fixed Time'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--text-primary)] font-medium">
            <span>{currencySymbol}{Math.round(trade.amount * exchangeRate)}</span>
            {trade.type === 'UP' ? <span className="text-[#22c55e]">↑</span> : <span className="text-[#ff4757]">↓</span>}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end">
        <span className={cn("text-[10px] mb-0.5 font-medium", isActive ? "text-[#3b82f6]" : "text-[var(--text-secondary)]")}>
            {isActive ? `Ends in ${timeString}` : timeString}
        </span>
        <span className={cn("font-bold text-sm", profitColor)}>
          {profitString}
        </span>
      </div>
    </div>
  );
}

function ProfilePage({ onBack, onSettings, user, onAdmin, setView, balance, currency, notifications, onNotificationsClick }: { 
  onBack: () => void, 
  onSettings: () => void, 
  user: FirebaseUser, 
  onAdmin: () => void, 
  setView: (v: any) => void,
  balance: number,
  currency: any,
  notifications: any[],
  onNotificationsClick: () => void
}) {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  // Professional Level System
  const exp = Math.floor(balance * 10); // 10 EXP per 1 USD/unit of balance
  
  const LEVELS = [
    { name: 'Starter', minExp: 0, color: 'text-blue-500', bg: 'bg-blue-500/20', icon: <ShieldCheck size={20} /> },
    { name: 'Bronze', minExp: 1000, color: 'text-orange-500', bg: 'bg-orange-500/20', icon: <Trophy size={20} /> },
    { name: 'Silver', minExp: 5000, color: 'text-gray-400', bg: 'bg-gray-400/20', icon: <Trophy size={20} /> },
    { name: 'Gold', minExp: 20000, color: 'text-yellow-500', bg: 'bg-yellow-500/20', icon: <Zap size={20} /> },
    { name: 'Platinum', minExp: 100000, color: 'text-cyan-400', bg: 'bg-cyan-400/20', icon: <Zap size={20} /> },
    { name: 'Diamond', minExp: 500000, color: 'text-purple-500', bg: 'bg-purple-500/20', icon: <Trophy size={20} /> },
    { name: 'Legendary', minExp: 1000000, color: 'text-red-500', bg: 'bg-red-500/20', icon: <Trophy size={20} /> },
  ];

  const currentLevelIndex = [...LEVELS].reverse().findIndex(l => exp >= l.minExp);
  const currentLevel = LEVELS[LEVELS.length - 1 - (currentLevelIndex === -1 ? LEVELS.length - 1 : currentLevelIndex)];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1] || null;
  
  const expInLevel = exp - currentLevel.minExp;
  const expToNextLevel = nextLevel ? nextLevel.minExp - currentLevel.minExp : 0;
  const progress = nextLevel ? (expInLevel / expToNextLevel) * 100 : 100;
  const remainingExp = nextLevel ? nextLevel.minExp - exp : 0;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-[var(--text-primary)]">
          <ChevronLeft size={28} />
        </button>
        <button onClick={onNotificationsClick} className="p-2 -mr-2 text-[var(--text-primary)] relative">
          <Bell size={24} />
          {unreadCount > 0 && (
            <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--bg-primary)] flex items-center justify-center text-[8px] font-black text-white">
              {unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Profile Info */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4 border-2 border-[var(--border-color)] overflow-hidden shadow-2xl">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={48} className="text-[var(--text-primary)]" />
            )}
          </div>
        </div>
        <h1 className="text-2xl font-black mb-1">{user.displayName || user.email?.split('@')[0]}</h1>
        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
          <span>{user.email}</span>
          <Copy size={14} className="cursor-pointer hover:text-[var(--text-primary)] transition" />
        </div>
        
        {(user.email?.toLowerCase() === 'hasan23@gmail.com') && (
          <button 
            onClick={onAdmin}
            className="mt-4 bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-full font-black text-xs flex items-center gap-2 hover:bg-red-500/20 transition uppercase tracking-widest"
          >
            <Settings size={14} /> Admin Panel
          </button>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 mb-4 border border-[var(--border-color)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentLevel.bg} ${currentLevel.color}`}>
              {currentLevel.icon}
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-widest">{currentLevel.name} Account</span>
              <div className="text-[10px] text-[var(--text-secondary)] font-bold">Verified Member</div>
            </div>
          </div>
          <span className={`text-[10px] font-black px-2 py-1 rounded ${currentLevel.bg} ${currentLevel.color}`}>
            {currentLevel.name.toUpperCase()}
          </span>
        </div>
        <div className="h-2 bg-[var(--bg-primary)] rounded-full mb-3 overflow-hidden">
          <div className={`h-full rounded-full shadow-lg transition-all duration-1000`} 
               style={{ width: `${progress}%`, backgroundColor: currentLevel.color.includes('text-') ? `var(--${currentLevel.color.replace('text-', '')})` : '#3b82f6' }}></div>
        </div>
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
          <span className={currentLevel.color}>{exp.toLocaleString()} XP</span>
          {nextLevel ? (
            <span className="text-[var(--text-secondary)]">{remainingExp.toLocaleString()} XP to {nextLevel.name}</span>
          ) : (
            <span className="text-yellow-500">MAX LEVEL REACHED</span>
          )}
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button 
          onClick={() => setView('REWARDS')}
          className="bg-[var(--bg-secondary)] rounded-3xl p-5 h-32 flex flex-col justify-between border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition group"
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center transition group-hover:scale-110 bg-blue-500/20 text-blue-500">
            <Gift size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">My Bonuses</span>
        </button>
        <button 
          onClick={() => setView('REFERRAL')}
          className="bg-[var(--bg-secondary)] rounded-3xl p-5 h-32 flex flex-col justify-between border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition group"
        >
          <div className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-xl flex items-center justify-center text-[var(--text-primary)] transition group-hover:scale-110">
            <Gift size={20} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">Referrals</span>
        </button>
      </div>

      {/* Settings Button */}
      <button onClick={onSettings} className="w-full bg-[var(--bg-secondary)] rounded-xl p-4 flex items-center justify-center gap-2 font-bold mt-4 border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition">
        <Settings size={20} />
        <span>Settings</span>
      </button>
    </div>
  );
}

function MarketPage() {
  return (
    <div className="h-full overflow-y-auto p-4 pb-20 bg-[var(--bg-primary)]">
      <h1 className="text-lg font-bold mb-4 text-[var(--text-primary)] text-center">Market</h1>
      
      {/* My Purchases & Rewards */}
      <button className="w-full bg-[var(--bg-secondary)] rounded-xl p-4 flex items-center justify-between mb-6 active:scale-[0.98] transition border border-[var(--border-color)]">
        <span className="font-bold text-[var(--text-primary)] text-sm">My Purchases & Rewards</span>
        <ChevronRight size={20} className="text-[var(--text-secondary)]" />
      </button>

      {/* Banners Carousel */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-2 scrollbar-hide snap-x">
        {/* Crypto Banner */}
        <div className="min-w-[100%] bg-blue-600 rounded-2xl p-5 relative overflow-hidden h-32 flex flex-col justify-center snap-center">
          <h3 className="font-bold text-xl text-white z-10 mb-1">Crypto</h3>
          <p className="text-xs text-blue-100 z-10 max-w-[65%] leading-relaxed">Strategies, signals, and themes designed for trading on crypto assets</p>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/50 rounded-full blur-xl"></div>
          {/* 3D Icon Placeholder */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-20 h-20 opacity-80">
             <div className="w-full h-full rounded-full border-[6px] border-blue-400/30 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full border-[6px] border-blue-300/50"></div>
             </div>
          </div>
        </div>

        {/* Forex Banner */}
        <div className="min-w-[100%] bg-[var(--bg-secondary)] rounded-2xl p-5 relative overflow-hidden h-32 flex flex-col justify-center border border-[var(--border-color)] snap-center">
          <h3 className="font-bold text-xl text-[var(--text-primary)] z-10 mb-1">Forex</h3>
          <p className="text-xs text-[var(--text-secondary)] z-10 max-w-[65%] leading-relaxed">Professional tools to help you predict market trends</p>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-20 h-20 opacity-80">
             <div className="w-full h-full rounded-full border-[6px] border-orange-500/20 flex items-center justify-center">
                <span className="text-orange-500 font-bold text-xl">FX</span>
             </div>
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--bg-tertiary)]"></div>
      </div>

      {/* Large Cards List */}
      <div className="space-y-4">
        <MarketCard 
          icon={<Shuffle size={40} className="text-[#22c55e]" />}
          title="Strategies"
          description="Ready-to-use sets of tools that make it easier to spot entry and exit points"
        />
        <MarketCard 
          icon={<Compass size={40} className="text-[#22c55e]" />}
          title="Indicators"
          description="Tools that help analyze price movements and identify entry points"
        />
        <MarketCard 
          icon={<Target size={40} className="text-[#22c55e]" />}
          title="Signals"
          description="Algorithm-based recommendations on when to open trades"
        />
        <MarketCard 
          icon={<ChevronsUp size={40} className="text-[#22c55e]" />}
          title="Trading Conditions"
          description="Features that provide more beneficial trading conditions"
        />
      </div>
    </div>
  );
}

function MarketCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 flex flex-col border border-[var(--border-color)] active:scale-[0.98] transition cursor-pointer min-h-[200px] relative overflow-hidden">
      <div className="absolute top-6 right-6">
         <div className="w-24 h-24 rounded-[2rem] bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-color)] shadow-inner">
            {icon}
         </div>
      </div>
      <div className="mt-auto max-w-[70%]">
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}



function RewardsPage({ 
  turnoverRequired,
  turnoverAchieved,
  userBonuses,
  currencySymbol, 
  rewards, 
  onApplyReward 
}: { 
  turnoverRequired: number,
  turnoverAchieved: number,
  userBonuses: any[],
  currencySymbol: string, 
  rewards: any[],
  onApplyReward: (code: string) => void
}) {
  const bonusProgress = turnoverRequired > 0 ? Math.min(100, (turnoverAchieved / turnoverRequired) * 100) : 0;
  const remainingTurnover = Math.max(0, turnoverRequired - turnoverAchieved);

  return (
    <div className="h-full overflow-y-auto p-4 pb-24 bg-[var(--bg-primary)]">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-[var(--text-primary)]">Bonuses</h1>
      </div>

      {/* Bonus Progress Section */}
      {turnoverRequired > 0 && (
        <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 mb-8 border border-[var(--border-color)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-black text-[var(--text-primary)] mb-1 uppercase tracking-tight">Active Bonus</h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Complete turnover to unlock withdrawals</p>
            </div>
            <div className="bg-blue-500/10 text-blue-500 p-3 rounded-2xl">
              <TrendingUp size={24} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Progress</span>
                <div className="text-2xl font-black text-[var(--text-primary)]">{bonusProgress.toFixed(1)}%</div>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">Remaining</span>
                <div className="text-sm font-black text-blue-500">{currencySymbol}{remainingTurnover.toLocaleString()}</div>
              </div>
            </div>

            <div className="h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border-color)]">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${bonusProgress}%` }}
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[var(--bg-primary)]/50 rounded-2xl p-3 border border-[var(--border-color)]">
                <div className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-widest mb-1">Required</div>
                <div className="text-sm font-black text-[var(--text-primary)]">{currencySymbol}{turnoverRequired.toLocaleString()}</div>
              </div>
              <div className="bg-[var(--bg-primary)]/50 rounded-2xl p-3 border border-[var(--border-color)]">
                <div className="text-[9px] text-[var(--text-secondary)] font-black uppercase tracking-widest mb-1">Achieved</div>
                <div className="text-sm font-black text-green-500">{currencySymbol}{turnoverAchieved.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg text-[var(--text-primary)]">Bonus History</h2>
      </div>

      <div className="space-y-3 mb-8">
        {userBonuses.length === 0 ? (
          <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)]">No bonus history found.</p>
          </div>
        ) : (
          userBonuses.map((bonus, idx) => (
            <div key={idx} className="bg-[var(--bg-secondary)] rounded-2xl p-4 border border-[var(--border-color)] flex justify-between items-center">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] mb-0.5">
                  {bonus.promoCode ? `Promo: ${bonus.promoCode}` : 'Deposit Bonus'}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)]">
                  {new Date(bonus.submittedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-green-500">+{currencySymbol}{bonus.bonusAmount.toLocaleString()}</div>
                <div className="text-[9px] text-[var(--text-secondary)] font-bold uppercase">Turnover: {currencySymbol}{bonus.turnoverRequired?.toLocaleString() || '0'}</div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg text-[var(--text-primary)]">Tasks & Rewards</h2>
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <span>{rewards.length} available</span>
          <ChevronLeft className="rotate-180" size={14} />
        </div>
      </div>

      {/* Horizontal Scroll */}
      <div className="flex gap-3 overflow-x-auto pb-4 mb-6 -mx-4 px-4 scrollbar-hide">
        {rewards.length === 0 ? (
          <div className="w-full bg-[var(--bg-secondary)] rounded-2xl p-8 border border-[var(--border-color)] text-center">
            <Gift className="mx-auto mb-3 text-[var(--text-secondary)] opacity-20" size={40} />
            <p className="text-sm text-[var(--text-secondary)] font-medium">No active rewards at the moment.</p>
          </div>
        ) : (
          rewards.map(reward => (
            <div key={reward.id} className="min-w-[280px] bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)] relative group overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-blue-500 text-white">
                      {reward.category}
                    </span>
                    {reward.badge && (
                      <div className="bg-[#22c55e] text-black text-[10px] font-black px-2 py-1 rounded rotate-12 absolute right-4 top-4 shadow-[0_4px_12px_rgba(34,197,94,0.3)]">
                        {reward.badge}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold pr-8 text-[var(--text-primary)]">{reward.title}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-6 line-clamp-2">{reward.description}</p>
              <button 
                onClick={() => onApplyReward(reward.value)}
                className="w-full bg-[var(--bg-tertiary)] py-3 rounded-xl text-xs font-black text-[var(--text-primary)] hover:bg-[#343a46] transition border border-[var(--border-color)] active:scale-95"
              >
                {reward.category === 'Promo Code' ? 'Apply Promo Code' : 'Claim Reward'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg text-[var(--text-primary)]">Leaderboards</h2>
        <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <span>Your rankings</span>
          <ChevronLeft className="rotate-180" size={14} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] h-28 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Best trade</span>
          <span className="text-xl font-black text-[var(--text-secondary)]">—</span>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] h-28 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Profit</span>
          <span className="text-xl font-black text-[var(--text-secondary)]">—</span>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] h-28 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Total trades</span>
          <span className="text-xl font-black text-[var(--text-secondary)]">—</span>
        </div>
      </div>
    </div>
  );
}


function HelpPage({ 
  onSupportClick, 
  supportSettings, 
  tutorials,
  currencySymbol
}: { 
  onSupportClick: () => void;
  supportSettings: { telegram: string; whatsapp: string; email: string };
  tutorials: any[];
  currencySymbol: string;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'faq' | 'tutorials' | 'glossary'>('faq');
  
  const faqs = [
    {
      category: 'Account',
      questions: [
        { q: 'How do I verify my account?', a: 'Go to Profile > Verification and upload your ID documents. Verification usually takes 24-48 hours.' },
        { q: 'Can I have multiple accounts?', a: 'No, each user is allowed only one account to ensure platform security and fair trading.' },
        { q: 'How to reset my password?', a: 'Click on "Forgot Password" on the login screen and follow the instructions sent to your email.' }
      ]
    },
    {
      category: 'Trading',
      questions: [
        { q: 'What is the minimum trade amount?', a: `The minimum trade amount is ${currencySymbol}${currencySymbol === '৳' ? '20' : '1.00'} for most assets.` },
        { q: 'How are payouts calculated?', a: 'Payouts are based on the asset volatility and market conditions at the time of trade opening.' },
        { q: 'What happens if a trade ends at the same price?', a: 'If the closing price is exactly equal to the entry price, the trade is a "Draw" and your investment is returned.' }
      ]
    },
    {
      category: 'Payments',
      questions: [
        { q: 'What is the minimum deposit?', a: `The minimum deposit is ${currencySymbol}${currencySymbol === '৳' ? '500' : '10.00'} or equivalent in your local currency.` },
        { q: 'How long do withdrawals take?', a: 'Withdrawals are processed within 1-3 business days, depending on your payment method.' },
        { q: 'Are there any deposit fees?', a: 'OnyxTrade does not charge any deposit fees, but your payment provider might.' }
      ]
    }
  ];

  const glossary = [
    { term: 'Asset', definition: 'A financial instrument that can be traded, such as a currency pair, commodity, or stock.' },
    { term: 'Payout', definition: 'The percentage of profit you receive if your trade prediction is correct.' },
    { term: 'Volatility', definition: 'The degree of variation of a trading price series over time.' },
    { term: 'Strike Price', definition: 'The price at which a trade is opened.' },
    { term: 'Expiration Time', definition: 'The time at which a trade is automatically closed and the result is determined.' },
  ];

  const filteredFaqs = faqs.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-primary)]">
      {/* Hero Section */}
      <div className="bg-[var(--bg-secondary)] p-8 text-center border-b border-[var(--border-color)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-500 rounded-full blur-3xl"></div>
        </div>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-green-500/20">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          All Systems Operational
        </div>
        
        <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2">Help Center</h1>
        <p className="text-[var(--text-secondary)] mb-6">Search for answers or contact our 24/7 support team.</p>
        
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={20} />
          <input 
            type="text" 
            placeholder="Search for help..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl py-4 pl-12 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-blue-500 transition shadow-xl"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 pb-24">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-10 -mt-8">
          <button 
            onClick={onSupportClick}
            className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex flex-col items-center gap-3 hover:bg-[var(--bg-tertiary)] transition shadow-lg group"
          >
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition">
              <MessageCircle size={24} />
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)]">Live Chat</span>
          </button>
          <a 
            href={`mailto:${supportSettings.email}`}
            className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex flex-col items-center gap-3 hover:bg-[var(--bg-tertiary)] transition shadow-lg group"
          >
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-500 group-hover:scale-110 transition">
              <Mail size={24} />
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)]">Email Us</span>
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-[var(--bg-secondary)] p-1.5 rounded-2xl border border-[var(--border-color)]">
          <button 
            onClick={() => setActiveTab('faq')}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition",
              activeTab === 'faq' ? "bg-blue-600 text-white shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            FAQs
          </button>
          <button 
            onClick={() => setActiveTab('tutorials')}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition",
              activeTab === 'tutorials' ? "bg-blue-600 text-white shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Tutorials
          </button>
          <button 
            onClick={() => setActiveTab('glossary')}
            className={cn(
              "flex-1 py-3 rounded-xl text-sm font-bold transition",
              activeTab === 'glossary' ? "bg-blue-600 text-white shadow-lg" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            Glossary
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'faq' && (
            <>
              <h2 className="text-xl font-bold text-[var(--text-primary)] px-2">Frequently Asked Questions</h2>
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((category, idx) => (
                  <div key={idx} className="space-y-3">
                    <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-widest px-2">{category.category}</h3>
                    <div className="space-y-2">
                      {category.questions.map((faq, fIdx) => (
                        <div 
                          key={fIdx}
                          className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 hover:border-[var(--border-color)] transition"
                        >
                          <h4 className="font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                            {faq.q}
                          </h4>
                          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{faq.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-[var(--bg-secondary)] rounded-3xl border border-dashed border-[var(--border-color)]">
                  <Search size={48} className="mx-auto text-[var(--text-secondary)] mb-4 opacity-20" />
                  <p className="text-[var(--text-secondary)]">No results found for "{searchQuery}"</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'tutorials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tutorials.map((video, idx) => (
                <a 
                  key={video.id || idx} 
                  href={video.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[var(--bg-secondary)] rounded-2xl overflow-hidden border border-[var(--border-color)] group cursor-pointer"
                >
                  <div className="relative aspect-video">
                    <img 
                      src={`https://picsum.photos/seed/${video.id || idx}/600/400`} 
                      alt={video.title} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:scale-110 transition">
                        <Youtube size={24} />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded text-[10px] font-bold text-white">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-[var(--text-primary)] mb-1">{video.title}</h4>
                    <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{video.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)]">
                      <span className="flex items-center gap-1"><Activity size={12} /> {video.category}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {video.duration}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {activeTab === 'glossary' && (
            <div className="space-y-3">
              {glossary.map((item, idx) => (
                <div key={idx} className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
                  <h4 className="font-bold text-blue-400 mb-1">{item.term}</h4>
                  <p className="text-sm text-[var(--text-secondary)]">{item.definition}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Community Section */}
        <div className="mt-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-center shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>
          <h2 className="text-2xl font-black text-white mb-2 relative z-10">Join our Community</h2>
          <p className="text-blue-100 mb-6 relative z-10">Connect with thousands of traders worldwide and share strategies.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
            <a 
              href={supportSettings.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-white text-blue-600 font-bold px-8 py-3 rounded-2xl hover:bg-blue-50 transition active:scale-95 shadow-lg flex items-center justify-center gap-2"
            >
              <Send size={18} /> Join Telegram
            </a>
            <button className="w-full sm:w-auto bg-blue-500/20 backdrop-blur-md text-white border border-white/20 font-bold px-8 py-3 rounded-2xl hover:bg-white/10 transition active:scale-95 flex items-center justify-center gap-2">
              <Globe size={18} /> Visit Website
            </button>
          </div>
        </div>

        {/* Footer Contact */}
        <div className="mt-12 pt-8 border-t border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between gap-6 text-[var(--text-secondary)] text-xs">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Phone size={14} /> +1 (800) ONYX-HELP</span>
            <span className="flex items-center gap-2"><Mail size={14} /> {supportSettings.email}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-[var(--text-primary)] transition">Terms of Service</a>
            <a href="#" className="hover:text-[var(--text-primary)] transition">Privacy Policy</a>
            <a href="#" className="hover:text-[var(--text-primary)] transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </div>
  );
}

