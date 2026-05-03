import { IndicatorConfig } from './types';
import { DRAWING_TOOLS, TIME_FRAMES, CHART_TYPES, INDICATORS_LIST, DESKTOP_TOOLS_LIST } from './constants';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, AreaChart, Area, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { AdminPanel } from './AdminPanel';
import { 
  ArrowUp, ArrowDown, Wallet, History, Settings, Bell, Menu, X, 
  User, ChevronDown, ChevronUp, Signal, BarChart2, HelpCircle, 
  Briefcase, Gift, LayoutGrid, Plus, Minus, Divide, Clock, Percent,
  ChevronLeft, Copy, Box, Link as LinkIcon, CalendarDays, ChevronRight,
  Shuffle, Target, ChevronsUp, GraduationCap, MessageCircle, BookOpen,
  Trophy, ShoppingBag, ArrowUpDown, Mail, UserCheck, Key, Shield, ShieldCheck, Zap, Check, Grid, Image, Activity, LogOut,
  Search, Info, AlignLeft, Star, MoreVertical, Lock, Video, FileText, Phone, Youtube, Globe, Send, Bitcoin, Gem, TrendingUp, RefreshCw, Users, Newspaper,
  Coins, Droplets, Flame, Pencil, PencilLine, CandlestickChart, Radio, Compass, Headphones,
} from 'lucide-react';
import { playSound } from './sounds';
import { cn, deepEqual, safeStringify } from './utils';
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
  PersonalInformationSettings, ContactSettings,
  PasswordSettings, TwoFactorSettings, AppPinSettings
} from './SettingsSubPages';

import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, arrayUnion, setDoc, getDoc, collection, query, orderBy, limit, getDocs, getDocFromServer } from 'firebase/firestore';
import InfoPage from './InfoPage';
import HomePage from './HomePage';

import { ReferralPage } from './ReferralPage';
import { LeaderboardPage } from './LeaderboardPage';
import WhatsNewSheet from './WhatsNewSheet';
import IndicatorSheet from './IndicatorSheet';
import ServiceAgreementSheet from './ServiceAgreementSheet';
import ActivitiesSheet from './ActivitiesSheet';
import { EconomicCalendar } from './EconomicCalendar';
import TournamentsPage from './TournamentsPage';
import OnboardingModal from './OnboardingModal';
import PendingOrderSheet from './PendingOrderSheet';

import { io, Socket } from 'socket.io-client';
import { ToastProvider } from './Toast';
import { useToast } from './Toast';
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
  userId?: string;
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
  basePrice: number;
  volatility: number;
  isFrozen?: boolean;
  isOTC?: boolean;
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
  // Forex
  { id: 'eur_usd_otc', name: 'EUR/USD OTC', shortName: 'EUR/USD OTC', payout: 92, category: 'Forex', flag: '🇪🇺🇺🇸', basePrice: 1.0850, volatility: 0.00008, isOTC: true },
  { id: 'gbp_usd_otc', name: 'GBP/USD OTC', shortName: 'GBP/USD OTC', payout: 92, category: 'Forex', flag: '🇬🇧🇺🇸', basePrice: 1.2550, volatility: 0.00008, isOTC: true },
  { id: 'aud_usd_otc', name: 'AUD/USD OTC', shortName: 'AUD/USD OTC', payout: 92, category: 'Forex', flag: '🇦🇺🇺🇸', basePrice: 0.6650, volatility: 0.00008, isOTC: true },
  { id: 'nzd_usd_otc', name: 'NZD/USD OTC', shortName: 'NZD/USD OTC', payout: 92, category: 'Forex', flag: '🇳🇿🇺🇸', basePrice: 0.6050, volatility: 0.00008, isOTC: true },
  { id: 'usd_chf_otc', name: 'USD/CHF OTC', shortName: 'USD/CHF OTC', payout: 92, category: 'Forex', flag: '🇺🇸🇨🇭', basePrice: 0.9050, volatility: 0.00008, isOTC: true },
  { id: 'usd_jpy_otc', name: 'USD/JPY OTC', shortName: 'USD/JPY OTC', payout: 92, category: 'Forex', flag: '🇺🇸🇯🇵', basePrice: 155.50, volatility: 0.015, isOTC: true },
  { id: 'usd_cad_otc', name: 'USD/CAD OTC', shortName: 'USD/CAD OTC', payout: 92, category: 'Forex', flag: '🇺🇸🇨🇦', basePrice: 1.3550, volatility: 0.00008, isOTC: true },
  { id: 'eur_gbp_otc', name: 'EUR/GBP OTC', shortName: 'EUR/GBP OTC', payout: 90, category: 'Forex', flag: '🇪🇺🇬🇧', basePrice: 0.8650, volatility: 0.00008, isOTC: true },
  { id: 'eur_jpy_otc', name: 'EUR/JPY OTC', shortName: 'EUR/JPY OTC', payout: 90, category: 'Forex', flag: '🇪🇺🇯🇵', basePrice: 168.50, volatility: 0.015, isOTC: true },
  { id: 'gbp_jpy_otc', name: 'GBP/JPY OTC', shortName: 'GBP/JPY OTC', payout: 92, category: 'Forex', flag: '🇬🇧🇯🇵', basePrice: 196.50, volatility: 0.018, isOTC: true },
  { id: 'aud_jpy_otc', name: 'AUD/JPY OTC', shortName: 'AUD/JPY OTC', payout: 90, category: 'Forex', flag: '🇦🇺🇯🇵', basePrice: 102.50, volatility: 0.012, isOTC: true },
  { id: 'nzd_jpy_otc', name: 'NZD/JPY OTC', shortName: 'NZD/JPY OTC', payout: 90, category: 'Forex', flag: '🇳🇿🇯🇵', basePrice: 93.50, volatility: 0.012, isOTC: true },
  { id: 'eur_aud_otc', name: 'EUR/AUD OTC', shortName: 'EUR/AUD OTC', payout: 90, category: 'Forex', flag: '🇪🇺🇦🇺', basePrice: 1.6350, volatility: 0.00012, isOTC: true },
  { id: 'eur_cad_otc', name: 'EUR/CAD OTC', shortName: 'EUR/CAD OTC', payout: 90, category: 'Forex', flag: '🇪🇺🇨🇦', basePrice: 1.4750, volatility: 0.00012, isOTC: true },
  { id: 'gbp_cad_otc', name: 'GBP/CAD OTC', shortName: 'GBP/CAD OTC', payout: 90, category: 'Forex', flag: '🇬🇧🇨🇦', basePrice: 1.7150, volatility: 0.00012, isOTC: true },
  { id: 'aud_cad_otc', name: 'AUD/CAD OTC', shortName: 'AUD/CAD OTC', payout: 88, category: 'Forex', flag: '🇦🇺🇨🇦', basePrice: 0.9050, volatility: 0.0001, isOTC: true },
  { id: 'usd_nok_otc', name: 'USD/NOK OTC', shortName: 'USD/NOK OTC', payout: 88, category: 'Forex', flag: '🇺🇸🇳🇴', basePrice: 10.8500, volatility: 0.0008, isOTC: true },
  { id: 'usd_sek_otc', name: 'USD/SEK OTC', shortName: 'USD/SEK OTC', payout: 88, category: 'Forex', flag: '🇺🇸🇸🇪', basePrice: 10.7500, volatility: 0.0008, isOTC: true },
  { id: 'usd_sgd_otc', name: 'USD/SGD OTC', shortName: 'USD/SGD OTC', payout: 88, category: 'Forex', flag: '🇺🇸🇸🇬', basePrice: 1.3550, volatility: 0.00008, isOTC: true },
  { id: 'eur_chf_otc', name: 'EUR/CHF OTC', shortName: 'EUR/CHF OTC', payout: 90, category: 'Forex', flag: '🇪🇺🇨🇭', basePrice: 0.9750, volatility: 0.00008, isOTC: true },
  { id: 'gbp_chf_otc', name: 'GBP/CHF OTC', shortName: 'GBP/CHF OTC', payout: 90, category: 'Forex', flag: '🇬🇧🇨🇭', basePrice: 1.1350, volatility: 0.00008, isOTC: true },
  { id: 'aud_chf_otc', name: 'AUD/CHF OTC', shortName: 'AUD/CHF OTC', payout: 88, category: 'Forex', flag: '🇦🇺🇨🇭', basePrice: 0.5950, volatility: 0.00008, isOTC: true },
  { id: 'cad_chf_otc', name: 'CAD/CHF OTC', shortName: 'CAD/CHF OTC', payout: 88, category: 'Forex', flag: '🇨🇦🇨🇭', basePrice: 0.6650, volatility: 0.00008, isOTC: true },
  
  // Crypto
  { id: 'btc_usd', name: 'Bitcoin', shortName: 'BTC/USD', payout: 90, category: 'Crypto', flag: '₿', basePrice: 65000, volatility: 25.0, isOTC: false },
  { id: 'eth_usd', name: 'Ethereum', shortName: 'ETH/USD', payout: 90, category: 'Crypto', flag: 'Ξ', basePrice: 3500, volatility: 1.5, isOTC: false },
  { id: 'crypto_index', name: 'CRYPTO INDEX', shortName: 'CRYPTO INDEX', payout: 90, category: 'Crypto', flag: '🧬', basePrice: 2500, volatility: 1.2, isOTC: true },
  { id: 'altcoin_index', name: 'ALTCOIN INDEX', shortName: 'ALTCOIN INDEX', payout: 92, category: 'Crypto', flag: '🚀', basePrice: 1200, volatility: 1.8, isOTC: true },
  { id: 'defi_index', name: 'DEFI INDEX', shortName: 'DEFI INDEX', payout: 92, category: 'Crypto', flag: '🔗', basePrice: 850, volatility: 2.5, isOTC: true },
  
  // Commodities
  { id: 'gold_otc', name: 'Gold OTC', shortName: 'GOLD OTC', payout: 90, category: 'Commodities', flag: '✨', basePrice: 2310.00, volatility: 0.18, isOTC: true },
  { id: 'oil_otc', name: 'WTI Crude Oil OTC', shortName: 'OIL OTC', payout: 90, category: 'Commodities', flag: '🛢️', basePrice: 81.00, volatility: 0.025, isOTC: true },
  { id: 'silver_otc', name: 'Silver OTC', shortName: 'SILVER OTC', payout: 88, category: 'Commodities', flag: '💍', basePrice: 28.50, volatility: 0.005, isOTC: true },
  { id: 'copper_otc', name: 'Copper OTC', shortName: 'COPPER OTC', payout: 85, category: 'Commodities', flag: '🧱', basePrice: 4.50, volatility: 0.002, isOTC: true },
  
  // Stocks
  { id: 'aapl_stock', name: 'Apple', shortName: 'AAPL', payout: 90, category: 'Stocks', flag: '🍎', basePrice: 175.00, volatility: 1.5, isOTC: false },
  { id: 'nvda_stock', name: 'Nvidia', shortName: 'NVDA', payout: 90, category: 'Stocks', flag: '🔋', basePrice: 900.00, volatility: 5.0, isOTC: false },
  { id: 'tsla_stock', name: 'Tesla', shortName: 'TSLA', payout: 90, category: 'Stocks', flag: '⚡', basePrice: 180.00, volatility: 3.0, isOTC: false },
  { id: 'amzn_stock', name: 'Amazon', shortName: 'AMZN', payout: 90, category: 'Stocks', flag: '📦', basePrice: 185.00, volatility: 1.5, isOTC: false },
  { id: 'googl_stock', name: 'Google', shortName: 'GOOGL', payout: 90, category: 'Stocks', flag: '🔍', basePrice: 170.00, volatility: 1.0, isOTC: false },
  { id: 'meta_stock', name: 'Meta', shortName: 'META', payout: 90, category: 'Stocks', flag: '♾️', basePrice: 480.00, volatility: 3.0, isOTC: false },
  { id: 'msft_stock', name: 'Microsoft', shortName: 'MSFT', payout: 90, category: 'Stocks', flag: '🪟', basePrice: 410.00, volatility: 2.5, isOTC: false },
  { id: 'nflx_stock', name: 'Netflix', shortName: 'NFLX', payout: 90, category: 'Stocks', flag: '📽️', basePrice: 620.00, volatility: 4.0, isOTC: false },
  { id: 'amd_stock', name: 'AMD', shortName: 'AMD', payout: 88, category: 'Stocks', flag: '💻', basePrice: 160.00, volatility: 1.5, isOTC: false },
  { id: 'intc_stock', name: 'Intel', shortName: 'INTC', payout: 85, category: 'Stocks', flag: '🔩', basePrice: 35.00, volatility: 0.5, isOTC: false },
  { id: 'baba_stock', name: 'Alibaba', shortName: 'BABA', payout: 85, category: 'Stocks', flag: '🥡', basePrice: 75.00, volatility: 1.0, isOTC: false },
  { id: 'pypl_stock', name: 'PayPal', shortName: 'PYPL', payout: 85, category: 'Stocks', flag: '💳', basePrice: 65.00, volatility: 1.2, isOTC: false },
  
  // Real Markets (Non-OTC replacements or additional)
  { id: 'eur_usd', name: 'EUR/USD', shortName: 'EUR/USD', payout: 85, category: 'Forex', flag: '🇪🇺🇺🇸', basePrice: 1.08, volatility: 0.0006, isOTC: false },
  { id: 'gbp_usd', name: 'GBP/USD', shortName: 'GBP/USD', payout: 85, category: 'Forex', flag: '🇬🇧🇺🇸', basePrice: 1.25, volatility: 0.0006, isOTC: false },
  { id: 'usd_jpy', name: 'USD/JPY', shortName: 'USD/JPY', payout: 85, category: 'Forex', flag: '🇺🇸🇯🇵', basePrice: 155, volatility: 0.1, isOTC: false },
  { id: 'usd_cad', name: 'USD/CAD', shortName: 'USD/CAD', payout: 85, category: 'Forex', flag: '🇺🇸🇨🇦', basePrice: 1.35, volatility: 0.0005, isOTC: false },
  { id: 'gbp_jpy', name: 'GBP/JPY', shortName: 'GBP/JPY', payout: 85, category: 'Forex', flag: '🇬🇧🇯🇵', basePrice: 195.5, volatility: 0.12, isOTC: false },
  { id: 'eur_jpy', name: 'EUR/JPY', shortName: 'EUR/JPY', payout: 85, category: 'Forex', flag: '🇪🇺🇯🇵', basePrice: 168.0, volatility: 0.1, isOTC: false },
  { id: 'aud_jpy', name: 'AUD/JPY', shortName: 'AUD/JPY', payout: 82, category: 'Forex', flag: '🇦🇺🇯🇵', basePrice: 101.5, volatility: 0.1, isOTC: false },
  { id: 'gold', name: 'Gold', shortName: 'GOLD', payout: 85, category: 'Commodities', flag: '🟡', basePrice: 2300, volatility: 2.0, isOTC: false },
  { id: 'oil', name: 'WTI Crude Oil', shortName: 'OIL', payout: 80, category: 'Commodities', flag: '🛢️', basePrice: 80, volatility: 0.5, isOTC: false },
];

const INITIAL_BALANCE = 12273.67;

// --- Helper Functions ---
const getTimeFrameInMs = (tf: string): number => {
  const numMatches = tf.match(/\d+/);
  const letterMatches = tf.match(/[a-zA-Z]+/);
  if (!numMatches || !letterMatches) return 60000;
  const value = parseInt(numMatches[0]);
  const unit = letterMatches[0].toUpperCase();
  
  switch (unit) {
    case 'S': return value * 1000;
    case 'M': return value * 60 * 1000;
    case 'H': return value * 60 * 60 * 1000;
    case 'D': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
};

const formatWithOffset = (timestamp: number, pattern: string, offsetHours: number) => {
  const date = new Date(timestamp + (offsetHours * 3600000));
  const pads = (n: number, z = 2) => String(n).padStart(z, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  if (pattern === 'HH:mm:ss') {
    return `${pads(date.getUTCHours())}:${pads(date.getUTCMinutes())}:${pads(date.getUTCSeconds())}`;
  }
  if (pattern === 'HH:mm') {
    return `${pads(date.getUTCHours())}:${pads(date.getUTCMinutes())}`;
  }
  if (pattern === 'HH:mm:ss.SSS') {
    return `${pads(date.getUTCHours())}:${pads(date.getUTCMinutes())}:${pads(date.getUTCSeconds())}.${pads(date.getUTCMilliseconds(), 3)}`;
  }
  if (pattern === 'MMM dd HH:mm:ss.SSS') {
    return `${months[date.getUTCMonth()]} ${pads(date.getUTCDate())} ${pads(date.getUTCHours())}:${pads(date.getUTCMinutes())}:${pads(date.getUTCSeconds())}.${pads(date.getUTCMilliseconds(), 3)}`;
  }
  if (pattern === 'MMM dd, yyyy') {
    return `${months[date.getUTCMonth()]} ${pads(date.getUTCDate())}, ${date.getUTCFullYear()}`;
  }
  if (pattern === 'MMM dd') {
    return `${months[date.getUTCMonth()]} ${pads(date.getUTCDate())}`;
  }
  
  try {
     return format(date, pattern); 
  } catch(e) {
     return format(new Date(timestamp), pattern);
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

  // Specific logos for well-known assets
  const logoMap: Record<string, string> = {
    'AAPL': 'https://www.google.com/s2/favicons?domain=apple.com&sz=128',
    'GOOGL': 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
    'TSLA': 'https://www.google.com/s2/favicons?domain=tesla.com&sz=128',
    'AMZN': 'https://www.google.com/s2/favicons?domain=amazon.com&sz=128',
    'MSFT': 'https://www.google.com/s2/favicons?domain=microsoft.com&sz=128',
    'META': 'https://www.google.com/s2/favicons?domain=meta.com&sz=128',
    'NFLX': 'https://www.google.com/s2/favicons?domain=netflix.com&sz=128',
    'NVDA': 'https://www.google.com/s2/favicons?domain=nvidia.com&sz=128',
    'BABA': 'https://www.google.com/s2/favicons?domain=alibaba.com&sz=128',
    'DIS': 'https://www.google.com/s2/favicons?domain=disney.com&sz=128',
    'PYPL': 'https://www.google.com/s2/favicons?domain=paypal.com&sz=128',
    'NKE': 'https://www.google.com/s2/favicons?domain=nike.com&sz=128',
    'BTC/USD': 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    'ETH/USD': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    'SOL/USD': 'https://cryptologos.cc/logos/solana-sol-logo.png',
    'XRP/USD': 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
    'DOGE/USD': 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
    'ADA/USD': 'https://cryptologos.cc/logos/cardano-ada-logo.png',
    'DOT/USD': 'https://cryptologos.cc/logos/polkadot-new-dot-logo.png',
    'LINK/USD': 'https://cryptologos.cc/logos/chainlink-link-logo.png',
    'MATIC/USD': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
    'UNI/USD': 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
  };

  const [imgError, setImgError] = useState(false);
  const logoUrl = logoMap[shortName];

  if (logoUrl && !imgError) {
    return (
      <div className={cn("rounded-full bg-white flex items-center justify-center border border-[var(--border-color)] shadow-sm overflow-hidden", containerSize)}>
        <img 
          src={logoUrl} 
          alt={shortName} 
          className="w-[70%] h-[70%] object-contain" 
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (category === 'Crypto') {
    return (
      <div className={cn("rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-sm", containerSize)}>
        <Bitcoin className={cn("text-orange-500", size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-5 h-5")} />
      </div>
    );
  }

  if (category === 'Stocks') {
    return (
      <div className={cn("rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm", containerSize, fontSize)}>
        {flag}
      </div>
    );
  }

  if (category === 'Commodities') {
    // Specific icons for commodities
    if (shortName === 'GOLD') return (
      <div className={cn("rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-sm", containerSize)}>
        <Coins className={cn("text-yellow-500", size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-5 h-5")} />
      </div>
    );
    if (shortName === 'SILVER') return (
      <div className={cn("rounded-full bg-gray-400/10 flex items-center justify-center border border-gray-400/20 shadow-sm", containerSize)}>
        <Coins className={cn("text-gray-400", size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-5 h-5")} />
      </div>
    );
    if (shortName === 'OIL') return (
      <div className={cn("rounded-full bg-gray-800/10 flex items-center justify-center border border-gray-800/20 shadow-sm", containerSize)}>
        <Droplets className={cn("text-gray-800", size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-5 h-5")} />
      </div>
    );
    if (shortName === 'NATGAS') return (
      <div className={cn("rounded-full bg-blue-400/10 flex items-center justify-center border border-blue-400/20 shadow-sm", containerSize)}>
        <Flame className={cn("text-blue-400", size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-5 h-5")} />
      </div>
    );

    return (
      <div className={cn("rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-sm", containerSize, fontSize)}>
        {flag}
      </div>
    );
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
  setIsLoading,
  currentAssetId,
  marketAssets
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (asset: Asset) => void;
  setIsLoading: (v: boolean) => void;
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
         <h2 className="text-xl font-bold text-[var(--text-primary)]">Assets</h2>
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
       <div className="flex items-center px-4 gap-2 mb-2 overflow-x-auto scrollbar-hide py-2">
           {['Fixed Time', 'Forex', 'Stocks', 'Crypto'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={cn(
                     "px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition",
                     activeTab === tab 
                         ? "bg-[var(--bg-tertiary)] text-[var(--text-primary)]" 
                         : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
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
                      className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] transition border-b border-[var(--border-color)]"
                  >
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] flex items-center justify-center border border-[var(--border-color)]">
                            {categoryIcons[category]}
                          </div>
                          <span className="font-semibold text-sm text-[var(--text-primary)]">{category}</span>
                          <span className="text-[10px] bg-[var(--bg-primary)] px-2 py-0.5 rounded-full text-[var(--text-secondary)] border border-[var(--border-color)]">{assets.length}</span>
                      </div>
                      {openSections[category] ? <ChevronUp size={16} className="text-[var(--text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--text-secondary)]" />}
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
                                          setIsLoading(true);
                                          onSelect(asset);
                                          onClose();
                                      }}
                                      className={cn(
                                          "flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer transition",
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
                                                {asset.isOTC && (
                                                  <span className="text-[10px] text-[var(--text-secondary)] font-medium">OTC</span>
                                                )}
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
  onCancelPendingOrder,
  timezoneOffset = 0,
  inSidebar = false
}: { 
  trades: Trade[], 
  pendingOrders: any[],
  onClose: () => void, 
  currencySymbol: string, 
  exchangeRate: number, 
  onSelectTrade: (t: Trade) => void,
  onCancelPendingOrder: (id: number) => void,
  timezoneOffset?: number,
  inSidebar?: boolean
}) {
  const [activeTab, setActiveTab] = useState<'CLOSED' | 'PENDING'>('CLOSED');

  // Calculate today's stats for current timezone
  const now = Date.now();
  const offsetMs = (timezoneOffset || 0) * 3600000;
  const todayInTimezone = new Date(now + offsetMs);
  todayInTimezone.setUTCHours(0, 0, 0, 0);
  const todayStartUtc = todayInTimezone.getTime() - offsetMs;

  const closedTrades = trades.filter(t => t.status !== 'ACTIVE');
  const todayClosedTrades = closedTrades.filter(t => t.endTime >= todayStartUtc);
  const totalToday = todayClosedTrades.length;
  const winsToday = todayClosedTrades.filter(t => t.status === 'WIN').length;
  const winRate = totalToday > 0 ? Math.round((winsToday / totalToday) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: inSidebar ? "0" : "100%" }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: inSidebar ? "0" : "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className={cn(
        inSidebar ? "h-full flex flex-col w-full bg-[var(--bg-primary)]" : "fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col"
      )}
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
          <>
            {totalToday > 0 && (
              <div className="bg-[#1a1b1e] p-4 rounded-2xl border border-white/5 flex items-center gap-4 mb-4 shadow-xl">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0"
                  style={{ 
                    background: `conic-gradient(#22c55e ${winRate * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                  }}
                >
                  <div className="absolute inset-[3px] bg-[#1a1b1e] rounded-full flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-[#22c55e]">{winRate}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-1">Today's Success</div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-[#22c55e]">{winsToday} Wins</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="text-white/60">{totalToday} Total Trades</span>
                  </div>
                </div>
              </div>
            )}
            
            {trades.length === 0 ? (
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
          )}
          </>
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
                      {order.type === 'PRICE' ? `Price: ${order.triggerValue}` : `Time: ${formatWithOffset(Number(order.triggerValue), 'HH:mm:ss', timezoneOffset)}`}
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
  setChatBackground,
  savePreferences
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
  setChatBackground: (b: string | null) => void,
  savePreferences: (prefs: any) => void
}) {
  const { t } = useTranslation();
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col relative overflow-hidden">
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
              isLast
              onClick={() => setActiveSubPage('CONTACTS')}
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
            savePreferences={savePreferences}
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
  const { showToast } = useToast();
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
        body: safeStringify({
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
  const [view, setView] = useState<'HOME' | 'TRADING' | 'PROFILE' | 'MARKET' | 'REWARDS' | 'REFERRAL' | 'HELP' | 'TRADES' | 'SETTINGS' | 'ADMIN' | 'INFO_PAGE' | 'NEWS' | 'LEADERBOARD' | 'CALENDAR'>('HOME');
  const [infoPageTitle, setInfoPageTitle] = useState<string>('');
  const [data, setData] = useState<OHLCData[]>([]);
  const [tickHistory, setTickHistory] = useState<Record<string, TickData[]>>({});
  const [currentPrice, setCurrentPrice] = useState<number>(51.677);
  const [activeAccount, setActiveAccount] = useState<string>('DEMO');
  const [chartTimeFrame, setChartTimeFrame] = useState(() => {
    return localStorage.getItem('chartTimeFrame') || '1m';
  });
  const [chartType, setChartType] = useState(() => {
    return localStorage.getItem('chartType') || 'Candlestick';
  });

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

  // Sync currency to localStorage
  useEffect(() => {
    localStorage.setItem('app-currency', safeStringify(currency));
  }, [currency]);

  const [demoBalance, setDemoBalance] = useState<number>(1000);
  const [turnoverRequired, setTurnoverRequired] = useState(0);
  const [turnoverAchieved, setTurnoverAchieved] = useState(0);
  const [userBonuses, setUserBonuses] = useState<any[]>([]);
  const [clientAds, setClientAds] = useState<any[]>([]);
  const [activeAdIndex, setActiveAdIndex] = useState(0);
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

  const [balance, setBalance] = useState<number>(0);
  const [bonusBalance, setBonusBalance] = useState<number>(0);

  // Socket Initialization
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('app-extra-accounts', safeStringify(extraAccounts));
    if (socket && user) {
      socket.emit('sync-extra-accounts', {
        email: user.email,
        extraAccounts
      });
    }
  }, [extraAccounts, socket, user]);

  useEffect(() => {
    if (clientAds.length === 0) return;
    const timer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % clientAds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [clientAds]);

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
    localStorage.setItem('selectedAsset', safeStringify(selectedAsset));
  }, [selectedAsset]);
  const [marketAssets, setMarketAssets] = useState<Record<string, any>>({});
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [isLoading, setIsLoadingState] = useState(false);
  const isLoadingRef = useRef(false);
  const loadingStartTimeRef = useRef(Date.now());
  const lastTradingViewTimeRef = useRef<number>(Date.now());
  const prevViewRef = useRef(view);
  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingRef.current = loading;
    setIsLoadingState(loading);
  }, []);
  const [platformSettings, setPlatformSettings] = useState<any>({});
  const [supportSettings, setSupportSettings] = useState({ 
    telegram: 'https://t.me/onyxtrade_support', 
    whatsapp: 'https://wa.me/1234567890', 
    email: 'support@onyxtrade.com',
    supportStatus: 'online' as 'online' | 'offline'
  });
  const [referralSettings, setReferralSettings] = useState({ bonusAmount: 10, referralPercentage: 5, minDepositForBonus: 20 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [investment, setInvestment] = useState<number>(1);
  
  useEffect(() => {
    const min = currency.code === 'BDT' ? 20 : 1;
    if (investment < min) {
      setInvestment(min);
    }
  }, [currency.id, currency.code]);

  const [tradeMode, setTradeMode] = useState<'TIMER' | 'CLOCK'>('CLOCK');
  const [clockOffset, setClockOffset] = useState<number>(1);
  const [timerDuration, setTimerDuration] = useState<number>(60); // 1 min

  const [trades, setTrades] = useState<Trade[]>([]);
  const [timezoneOffset, setTimezoneOffset] = useState<number>(() => {
    const saved = localStorage.getItem('app-timezone-offset');
    if (saved !== null) return Number(saved);
    // Auto-detect browser timezone offset in hours
    return -new Date().getTimezoneOffset() / 60;
  });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  const leaderboardCurrentUser = useMemo(() => {
    if (!user || !user.email) return undefined;
    
    // Calculate today's profit (start of current day in local time)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTs = todayStart.getTime();

    const todayProfit = trades.reduce((acc, t) => {
      // Only include trades ended today
      if (t.endTime >= todayStartTs && (t.status === 'WIN' || t.status === 'LOSS')) {
        const p = t.profit !== undefined ? t.profit : (t.status === 'WIN' ? t.amount * ((t.payout || 82) / 100) : -t.amount);
        return acc + p;
      }
      return acc;
    }, 0);

    return { 
      name: user.displayName || user.email.split('@')[0], 
      profit: todayProfit > 0 ? todayProfit : 0 
    };
  }, [user, trades]);

  // Smooth local clock that syncs with server
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now() + serverTimeOffset);
    }, 1000); // Update every 1000ms to prevent UI freezing
    return () => clearInterval(timer);
  }, [serverTimeOffset]);

  const [tradeResults, setTradeResults] = useState<TradeResult[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSocialChatOpen, setIsSocialChatOpen] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('pin-enabled') === 'true');
  const [isConnected, setIsConnected] = useState(false);
  const [isIndicatorSheetOpen, setIsIndicatorSheetOpen] = useState(false);
  const [isServiceAgreementOpen, setIsServiceAgreementOpen] = useState(false);
  const [indicatorInitialTab, setIndicatorInitialTab] = useState('Indicators');
  const [activeDesktopChartMenu, setActiveDesktopChartMenu] = useState<'time' | 'type' | 'indicators' | 'tools' | null>(null);

  // Close desktop menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeDesktopChartMenu) {
        const toolbar = document.getElementById('desktop-chart-toolbar');
        if (toolbar && !toolbar.contains(event.target as Node)) {
          setActiveDesktopChartMenu(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDesktopChartMenu]);
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
      localStorage.setItem('activeIndicators', safeStringify(activeIndicators));
    } catch (e) {
      console.error('Failed to save indicators', e);
    }
  }, [activeIndicators]);
  const handleSelectIndicator = useCallback((indicator: IndicatorConfig, forceRemove = false) => {
    setActiveIndicators(prev => {
      const exists = prev.find(i => i.instanceId === indicator.instanceId);
      if (exists) {
        if (forceRemove) {
           return prev.filter(i => i.instanceId !== indicator.instanceId);
        }
        // If settings match exactly, toggle off. Otherwise update settings.
        if (deepEqual(exists.params, indicator.params) && exists.color === indicator.color) {
          return prev.filter(i => i.instanceId !== indicator.instanceId);
        }
        return prev.map(i => i.instanceId === indicator.instanceId ? indicator : i);
      }
      return [...prev, indicator];
    });
  }, []);

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
  const lastChartUpdateRef = useRef(0);
  const userRef = useRef(user);
  const selectedAssetRef = useRef(selectedAsset);

  // Removed redundant localStorage sync as we use Firestore now

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
          setView('TRADING');
      } else {
          setView('HOME');
      }

      if (firebaseUser?.email) {
        try {
          const response = await fetch(`${window.location.origin}/api/user?email=${encodeURIComponent(firebaseUser.email)}`);
          if (response.status === 404) {
             // User not yet synced to backend, normal for first-time login
             setAuthLoading(false);
             return;
          }
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
          }
          const userData = await response.json();
          if (userData.language || userData.currency || userData.timeframe || userData.chartType) {
            setPreferences(prev => {
              const updates: any = {};
              if (userData.language && userData.language !== prev.language) updates.language = userData.language;
              if (userData.currency && userData.currency !== prev.currency) updates.currency = userData.currency;
              if (userData.timeframe && userData.timeframe !== prev.timeframe) updates.timeframe = userData.timeframe;
              if (userData.chartType && userData.chartType !== prev.chartType) updates.chartType = userData.chartType;
              
              if (Object.keys(updates).length === 0) return prev;
              return { ...prev, ...updates };
            });
          }
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
        } catch (error) {
          console.error('Error loading user preferences:', error);
          // Optional: set a state to show an error message in the UI
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
      setView('HOME');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);

  // Sync User Data and Trades from Firestore
  useEffect(() => {
    if (!user) {
      setIsUserDataLoaded(false);
      setTrades([]);
      return;
    }

    // Main user doc listener
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        
        let balanceToSet = userData.balance;
        if (balanceToSet === undefined && userData.extraAccounts) {
          const realAccount = userData.extraAccounts.find((a: any) => a.type === 'REAL');
          if (realAccount) balanceToSet = realAccount.balance;
        }
        if (balanceToSet !== undefined) setBalance(prev => Math.abs(prev - balanceToSet) < 0.000001 ? prev : balanceToSet);
        if (userData.bonusBalance !== undefined) setBonusBalance(prev => Math.abs(prev - userData.bonusBalance) < 0.000001 ? prev : userData.bonusBalance);
        if (userData.demoBalance !== undefined) setDemoBalance(prev => Math.abs(prev - userData.demoBalance) < 0.000001 ? prev : userData.demoBalance);
        if (userData.kycStatus !== undefined) setKycStatus(prev => prev === userData.kycStatus ? prev : userData.kycStatus);
        if (userData.turnover_required !== undefined) setTurnoverRequired(prev => prev === userData.turnover_required ? prev : userData.turnover_required);
        if (userData.turnover_achieved !== undefined) setTurnoverAchieved(prev => prev === userData.turnover_achieved ? prev : userData.turnover_achieved);
        
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
        
        setIsUserDataLoaded(true);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Trades subcollection listener
    const tradesQuery = query(collection(db, 'users', user.uid, 'trades'), orderBy('startTime', 'desc'), limit(100));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setTrades(prev => deepEqual(prev, tradesData) ? prev : tradesData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trades`);
    });

    return () => {
      unsubscribeUser();
      unsubscribeTrades();
    };
  }, [user]);

  // Force candle update on interval
  useEffect(() => {
    const timer = setInterval(() => {
      const tfMs = getTimeFrameInMs(chartTimeFrame);
      const currentTimeAligned = Math.floor(currentTime / tfMs) * tfMs;
      
      setData(prev => {
        if (prev.length === 0) return prev;
        
        const lastCandle = prev[prev.length - 1];
        if (lastCandle.time < currentTimeAligned) {
           const newCandle = {
             time: currentTimeAligned,
             open: lastCandle.close,
             high: lastCandle.close,
             low: lastCandle.close,
             close: lastCandle.close,
             volume: 0,
             formattedTime: formatWithOffset(currentTimeAligned, 'HH:mm:ss', timezoneOffset),
           };
           return [...prev, newCandle];
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentTime, chartTimeFrame, timezoneOffset]);

  const refillDemoBalance = () => {
    if (socket && user) {
      socket.emit('refill-demo-balance', { email: user.email });
    }
  };

  const handleSetCustomDemoBalance = async (amount: number) => {
    setDemoBalance(amount);
    demoBalanceRef.current = amount;
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { demoBalance: amount }, { merge: true });
        // Emit user-sync socket event if available
        if (socket) {
          socket.emit('user-sync', {
            email: user.email,
            uid: user.uid,
            name: user.displayName || 'Anonymous',
            demoBalance: amount
          });
        }
      } catch (err) {
        console.error("Failed to update custom demo balance", err);
      }
    }
  };

  useEffect(() => {
    if (socket && user) {
      const syncUser = () => {
        socket.emit('user-sync', {
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL,
          uid: user.uid,
          referredBy: localStorage.getItem('onyx_referral_code')
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
  const [paymentsInitialView, setPaymentsInitialView] = useState<'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'HISTORY' | null>(null);

  const handleOpenPayments = useCallback((view: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'HISTORY' | null = null) => {
    setPaymentsInitialView(view);
    setIsPaymentsOpen(true);
  }, []);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [isRewardsOpen, setIsRewardsOpen] = useState(false);
  const [isTournamentsOpen, setIsTournamentsOpen] = useState(false);
  const [isActivitiesOpen, setIsActivitiesOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isChartSettingsOpen, setIsChartSettingsOpen] = useState(false);
  const [isAccountsSheetOpen, setIsAccountsSheetOpen] = useState(false);
  const [isTradeInputSheetOpen, setIsTradeInputSheetOpen] = useState(false);
  const [isPendingOrderSheetOpen, setIsPendingOrderSheetOpen] = useState(false);
  const [isRiskManagementOpen, setIsRiskManagementOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<any | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const readAnnouncements = useMemo(() => {
    try {
      const stored = localStorage.getItem('read-announcements');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, [announcements]); // Re-evaluate when announcements load

  const unreadAnnouncementsCount = useMemo(() => {
    if (!announcements) return 0;
    return announcements.filter(a => !readAnnouncements.includes(a.id)).length;
  }, [announcements, readAnnouncements]);

  const closeAllPanels = useCallback(() => {
    setIsHistoryOpen(false);
    setIsMarketOpen(false);
    setIsRewardsOpen(false);
    setIsActivitiesOpen(false);
    setIsLeaderboardOpen(false);
    setIsWhatsNewOpen(false);
    setIsHelpOpen(false);
    setIsAssetSelectorOpen(false);
    setIsProfileOpen(false);
    setIsPaymentsOpen(false);
    setIsAccountsSheetOpen(false);
  }, []);

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
      return (balance + bonusBalance) * rate;
    }
    const extra = extraAccounts.find(a => a.id === activeAccount);
    if (extra) {
      return extra.balance;
    }
    return 0;
  }, [balance, bonusBalance, demoBalance, activeAccount, currency, extraAccounts]);

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
    localStorage.setItem('app-currency', safeStringify(currency));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('chartTimeFrame', chartTimeFrame);
  }, [chartTimeFrame]);

  useEffect(() => {
    localStorage.setItem('chartType', chartType);
  }, [chartType]);

  const handleCurrencyChange = async (newCurrency: typeof CURRENCIES[0]) => {
    setCurrency(newCurrency);
    setPreferences(prev => ({ ...prev, currency: newCurrency.code }));
    
    if (user?.email) {
      try {
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeStringify({
            email: user.email,
            currency: newCurrency.code,
            currencySymbol: newCurrency.symbol,
            currencyName: newCurrency.name,
            currencyFlag: newCurrency.flag
          })
        });
      } catch (error) {
        console.error('Error updating currency:', error);
      }
    }
  };

  const [sentiment, setSentiment] = useState(57); // Percentage of green (up) sentiment

  // Refs for Data
  const lastCloseRef = useRef(selectedAsset.basePrice);
  // Force reset timeframe if invalid for non-OTC
  useEffect(() => {
    if (!selectedAsset.isOTC && ['5s', '10s', '15s', '20s', '30s'].includes(chartTimeFrame)) {
      if (chartTimeFrame !== '1m') {
        setChartTimeFrame('1m');
      }
    }
  }, [selectedAsset.isOTC, chartTimeFrame]);
  const trendRef = useRef(0); // Track trend for smoother movement
  const volatilityRef = useRef(1.0); // Dynamic volatility multiplier
  const chartTimeFrameRef = useRef(chartTimeFrame);

  useEffect(() => {
    chartTimeFrameRef.current = chartTimeFrame;
  }, [chartTimeFrame]);

  // Initialize Data (Candlesticks)
  useEffect(() => {
    if (!socket || !selectedAsset) return;
    
    const assetShortName = selectedAsset.shortName;
    const basePrice = selectedAsset.basePrice;

    setIsLoading(true);
    setData([]); // Clear old data to avoid flicker
    
    // Reset price to asset base price when asset changes
    lastCloseRef.current = basePrice;
    setCurrentPrice(basePrice);
    trendRef.current = 0;
    volatilityRef.current = 1.0;

    const handleHistory = (response: { asset: string, timeframe: string, data: any[], candles?: any[], isOlder?: boolean }) => {
      console.log('Received history:', response);
      if (response.asset !== assetShortName || response.timeframe !== chartTimeFrame) return;
      
      console.log(`Processing ${response.candles ? response.candles.length : (response.data ? response.data.length : 0)} items, isOlder: ${response.isOlder}`);
      
      const tfMs = getTimeFrameInMs(chartTimeFrame);
      
      let candles: OHLCData[] = [];
      let historyTicks: TickData[] = [];

      if (response.candles && response.candles.length > 0) {
        candles = response.candles.map(c => ({
          ...c,
          volume: Math.floor(Math.random() * 100) + 10,
          formattedTime: formatWithOffset(c.time, 'HH:mm:ss', timezoneOffset)
        }));
        historyTicks = (response.data || []).map(t => ({ time: t.time, price: t.close || t.price }));
      } else {
        const ticks = response.data || [];
        
        let currentCandle: OHLCData | null = null;
        for (const tick of ticks) {
          historyTicks.push({ time: tick.time, price: tick.price });
          const candleTime = Math.floor(tick.time / tfMs) * tfMs;
          
          if (!currentCandle || currentCandle.time !== candleTime) {
            if (currentCandle) candles.push(currentCandle);
            currentCandle = {
              time: candleTime,
              open: tick.open !== undefined ? tick.open : tick.price,
              high: tick.high !== undefined ? tick.high : tick.price,
              low: tick.low !== undefined ? tick.low : tick.price,
              close: tick.close !== undefined ? tick.close : tick.price,
              volume: Math.floor(Math.random() * 100) + 10,
              formattedTime: formatWithOffset(candleTime, 'HH:mm:ss', timezoneOffset)
            };
          } else {
            currentCandle.high = Math.max(currentCandle.high, tick.high !== undefined ? tick.high : tick.price);
            currentCandle.low = Math.min(currentCandle.low, tick.low !== undefined ? tick.low : tick.price);
            currentCandle.close = tick.close !== undefined ? tick.close : tick.price;
            currentCandle.volume = (currentCandle.volume || 0) + Math.floor(Math.random() * 10) + 1;
          }
        }
        if (currentCandle) candles.push(currentCandle);
      }

      if (candles.length < 500 && !response.isOlder) {
        // synthesize base candles only if this is the initial load and no data found
        const basePrice = selectedAssetRef.current?.basePrice || 100;
        const volatility = selectedAssetRef.current?.volatility || 1;
        const startCandle = candles[0];
        let lastPrice = startCandle ? startCandle.open : basePrice;
        const now = startCandle ? startCandle.time : Date.now();
      const needed = 500 - candles.length;
      
      const synthetic: OHLCData[] = [];
      let trend = 0;
      const tfScale = Math.max(1, Math.sqrt(tfMs / 60000));
      
      // Deterministic Random helper
      const seededRandom = (seed: number) => {
          const x = Math.sin(seed) * 10000;
          return x - Math.floor(x);
      };

      const assetSeed = assetShortName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

      for (let i = needed; i >= 1; i--) {
          const time = Math.floor((now - i * tfMs) / tfMs) * tfMs;
          
          // Use time and asset as seed for constant "synthetic" history
          const seed = time + assetSeed;
          const rnd1 = seededRandom(seed);
          const rnd2 = seededRandom(seed + 1);
          const rnd3 = seededRandom(seed + 2);
          const rnd4 = seededRandom(seed + 3);

          trend += (rnd1 - 0.5) * volatility * 0.5;
          trend *= 0.95;
          
          const isPowerCandle = rnd2 < 0.1;
          const multiplier = isPowerCandle ? (2 + rnd3 * 2) : 1;
          
          const open = lastPrice;
          const move = (trend + (rnd4 - 0.5) * volatility * 12 * tfScale) * multiplier;
          const close = open + move;
          
          const wickScale = volatility * 5 * tfScale;
          const high = Math.max(open, close) + seededRandom(seed + 4) * wickScale;
          const low = Math.min(open, close) - seededRandom(seed + 5) * wickScale;
          
          synthetic.push({
              time, open, high, low, close,
              volume: Math.floor(seededRandom(seed + 6) * 100) + 10,
              formattedTime: formatWithOffset(time, 'HH:mm:ss', timezoneOffset)
          });
          lastPrice = close;
      }
      candles = [...synthetic, ...candles];
      }

      if (response.isOlder) {
        setTickHistory(prev => {
          const existing = prev[response.asset] || [];
          if (historyTicks.length === 0) return prev;
          
          const firstExistingTime = existing.length > 0 ? existing[0].time : Infinity;
          const filteredNew = historyTicks.filter(t => t.time < firstExistingTime);
          
          return { ...prev, [response.asset]: [...filteredNew, ...existing] };
        });
        
        setData(prev => {
          if (candles.length === 0) return prev;
          
          // When loading older history, candles should be BEFORE prev[0]
          const firstExistingTime = prev.length > 0 ? Number(prev[0].time) : Infinity;
          const filteredNew = candles.filter(c => Number(c.time) < firstExistingTime);
          
          if (filteredNew.length === 0) return prev;
          
          const newData = [...filteredNew, ...prev];
          dataRef.current = newData;
          return newData;
        });
      } else {
        setTickHistory(prev => ({ ...prev, [response.asset]: historyTicks }));
        setData(candles);
        dataRef.current = candles;
        if (candles.length > 0) {
          const last = candles[candles.length - 1];
          lastCloseRef.current = last.close;
          setCurrentPrice(last.close);
        }
      }
      
      // Professional loading: Only stop loading on the initial history response
      if (!response.isOlder) {
        setIsLoading(false);
      }
      
      clearTimeout(timeout);
    };

    socket.on('asset-history', handleHistory);
    
    // Reset loading timer for professional delay
    loadingStartTimeRef.current = Date.now();
    setIsLoading(true);
    // REMOVED: setData([]); // Don't clear data immediately to avoid flash
    // dataRef.current = [];

    // Add a small delay for the request to ensure the UI has cleared
    const requestTimeout = setTimeout(() => {
      if (socket.connected) {
        socket.emit('request-history', { asset: assetShortName, timeframe: chartTimeFrame, limit: 500 });
      } else {
        socket.once('connect', () => {
          socket.emit('request-history', { asset: assetShortName, timeframe: chartTimeFrame, limit: 500 });
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
  }, [socket, selectedAsset.id, chartTimeFrame]);

  const handleLoadMoreHistory = useCallback(() => {
    if (!socket || !selectedAsset || dataRef.current.length === 0) return;
    const oldestTime = dataRef.current[0].time;
    // Request older history
    socket.emit('request-history', {
      asset: selectedAsset.shortName,
      beforeTime: oldestTime,
      limit: 500, // Fetch 500 more candles
      timeframe: chartTimeFrame
    });
  }, [socket, selectedAsset.id, chartTimeFrame]); // Removed data from deps, using dataRef instead

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
      if (!currentAsset || isLoadingRef.current) return; // Ignore ticks while history is loading

      const tick = ticks[currentAsset.shortName];
      if (!tick) return;
      
      const timestamp = tick.time;
      
      // Update server time offset (only if drift is significant to avoid jitter)
      setServerTimeOffset(prev => {
        const newOffset = timestamp - Date.now();
        if (prev === 0 || Math.abs(prev - newOffset) > 100) return newOffset;
        return prev;
      });
      
      const newPrice = tick.price;
      const tfMs = getTimeFrameInMs(chartTimeFrameRef.current);

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
        const lastEntry = assetHistory[assetHistory.length - 1];
        if (lastEntry && lastEntry.time === timestamp && lastEntry.price === newPrice) return prev;
        
        const newHistory = [...assetHistory, { time: timestamp, price: newPrice }];
        const limitedHistory = newHistory.length > 500 ? newHistory.slice(-500) : newHistory;
        return { ...prev, [currentAsset.shortName]: limitedHistory };
      });

      setData(prev => {
        const currentTFStart = Math.floor(timestamp / tfMs) * tfMs;
        
        if (prev.length === 0) {
            // ONLY create first candle if we are NOT loading history
            // If isLoadingRef.current is true, it means we are waiting for historical candles
            // Creating a 1-length array here causes the "single candle glitch"
            if (isLoadingRef.current) return prev;

            const newCandle = {
                time: currentTFStart,
                open: newPrice,
                high: Math.max(newPrice, tick.high || newPrice),
                low: Math.min(newPrice, tick.low || newPrice),
                close: newPrice,
                volume: Math.floor(Math.random() * 100) + 10,
                formattedTime: formatWithOffset(currentTFStart, 'HH:mm:ss', timezoneOffset),
            };
            dataRef.current = [newCandle];
            return [newCandle];
        }
        
        const lastCandle = prev[prev.length - 1];
        
        // Ensure time is a number to prevent [object Object] comparisons
        const lastCandleTime = Number(lastCandle.time);
        const newCandleTime = Number(currentTFStart);

        if (newCandleTime < lastCandleTime) {
            // Ignore older ticks to prevent chart errors (out of order data)
            return prev;
        }

        let updatedData: OHLCData[];
        if (lastCandle.time === currentTFStart) {
            // Update existing candle
            const updatedCandle = {
                ...lastCandle,
                close: newPrice,
                high: Math.max(lastCandle.high, tick.high || newPrice),
                low: Math.min(lastCandle.low, tick.low || newPrice),
                volume: (lastCandle.volume || 0) + 1,
            };
            
            // Critical guard: Only update if anything changed
            if (lastCandle.close === updatedCandle.close && 
                lastCandle.high === updatedCandle.high && 
                lastCandle.low === updatedCandle.low) return prev;
            
            updatedData = [...prev.slice(0, -1), updatedCandle];
        } else {
            // New candle started
            const newCandle = {
                time: currentTFStart,
                open: lastCandle.close,
                high: Math.max(lastCandle.close, tick.high || newPrice),
                low: Math.min(lastCandle.close, tick.low || newPrice),
                close: newPrice,
                volume: Math.floor(Math.random() * 10) + 1,
                formattedTime: formatWithOffset(currentTFStart, 'HH:mm:ss', timezoneOffset),
            };
            updatedData = [...prev, newCandle];
            console.log('New candle:', newCandle, 'Last candle:', lastCandle);
            if (updatedData.length > 5000) updatedData.shift();
        }
        
        dataRef.current = updatedData;
        return updatedData;
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

    socket.on('connect', () => {
      setIsConnected(true)
      socket.emit('get-client-ads');
      socket.emit('get-client-announcements');
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('trade-accepted', ({ id, startTime, endTime }) => {
      setTrades(prev => prev.map(t => t.id === id ? { ...t, startTime, endTime } : t));
    });

    socket.on('market-tick', (ticks) => {
      handleTick(ticks);
    });
    socket.on('asset-payout-updated', handlePayoutUpdate);
    socket.on('global-payout-updated', handleGlobalPayoutUpdate);

    socket.on('user-data-updated', (userData) => {
      if (userData.balance !== undefined) setBalance(prev => Math.abs(prev - userData.balance) < 0.000001 ? prev : userData.balance);
      if (userData.bonus_balance !== undefined) setBonusBalance(prev => Math.abs(prev - userData.bonus_balance) < 0.000001 ? prev : userData.bonus_balance);
      if (userData.demoBalance !== undefined) setDemoBalance(prev => Math.abs(prev - userData.demoBalance) < 0.000001 ? prev : userData.demoBalance);
      if (userData.turnover_required !== undefined) setTurnoverRequired(prev => prev === userData.turnover_required ? prev : userData.turnover_required);
      if (userData.turnover_achieved !== undefined) setTurnoverAchieved(prev => prev === userData.turnover_achieved ? prev : userData.turnover_achieved);
      if (userData.trades !== undefined) setTrades(prev => deepEqual(prev, userData.trades) ? prev : userData.trades);
      if (userData.extraAccounts !== undefined) setExtraAccounts(prev => deepEqual(prev, userData.extraAccounts) ? prev : userData.extraAccounts);
      
      // Update Referral Stats via Socket directly
      if (userData.totalReferralEarnings !== undefined || userData.referralBalance !== undefined || userData.referralCount !== undefined || userData.recentReferrals !== undefined || userData.commissionHistory !== undefined) {
        setReferralStats(prev => {
          const newStats = {
            ...prev,
            totalEarnings: userData.totalReferralEarnings ?? prev.totalEarnings,
            referralBalance: userData.referralBalance ?? prev.referralBalance,
            referralCount: userData.referralCount ?? prev.referralCount,
            recentReferrals: userData.recentReferrals ?? prev.recentReferrals,
            commissionHistory: userData.commissionHistory ?? prev.commissionHistory
          };
          if (prev.totalEarnings === newStats.totalEarnings && 
              prev.referralBalance === newStats.referralBalance && 
              prev.referralCount === newStats.referralCount && 
              deepEqual(prev.recentReferrals, newStats.recentReferrals) &&
              deepEqual(prev.commissionHistory, newStats.commissionHistory)) return prev;
          return newStats;
        });
      }
    });

    socket.on('balance-updated', ({ balance: newBalance, type }) => {
      if (type === 'REAL') {
        setBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
      } else if (type === 'BONUS') {
        setBonusBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
      } else {
        setDemoBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
      }
    });

    socket.on('withdrawal-cancelled', ({ id, newBalance, currency, bonusBalance: newBonusBalance }) => {
      if (currency === 'BDT') {
        setExtraAccounts(prev => prev.map(a => a.currency === 'BDT' ? { ...a, balance: a.balance + newBalance } : a));
      } else {
        if (newBalance !== undefined) setBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
        if (newBonusBalance !== undefined) setBonusBalance(prev => Math.abs(prev - newBonusBalance) < 0.000001 ? prev : newBonusBalance);
      }
    });

    socket.on('kyc-status-updated', (data: { status: any, reason?: string }) => {
      setKycStatus(data.status);
      if (data.reason) setKycRejectionReason(data.reason);
    });

    socket.on('new-notification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show professional real-time toast
      showToast(notification.message, notification.type || 'info');
      
      // Play a notification sound
      playSound('SUCCESS'); // Or a dedicated notification sound if available
    });

    socket.on('user-notifications', (notifs) => {
      setNotifications(notifs);
    });

    socket.on('client-ads', (ads) => {
      setClientAds(ads);
    });

    socket.on('client-announcements', (data) => {
      setAnnouncements(data);
    });

    socket.on('platform-settings', (settings) => {
      setPlatformSettings(settings);
    });

    socket.on('user-bonuses', (bonuses) => {
      setUserBonuses(bonuses);
    });

    socket.on('rewards', (data) => {
      setRewards(data);
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
      socket.off('user-bonuses');
      socket.off('user-notifications');
      socket.off('rewards');
      socket.off('platform-settings');
    };
  }, [socket]);

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

      // Professional Firestore Update for Trade Result and Balance
      if (user) {
        try {
          // Update the specific trade document
          const tradeDocRef = doc(db, 'users', user.uid, 'trades', result.id);
          const isWin = result.status === 'WIN';
          const profit = result.profit !== undefined ? result.profit : (isWin ? trade.amount * (trade.payout / 100) : -trade.amount);
          
          setDoc(tradeDocRef, {
            status: result.status,
            profit: profit,
            closePrice: result.closePrice,
            endTime: Date.now()
          }, { merge: true });

          // Update balance in user doc if it was a win (investment was already deducted)
          if (isWin) {
             const userDocRef = doc(db, 'users', user.uid);
             if (trade.accountType === 'DEMO') {
               setDoc(userDocRef, { demoBalance: demoBalanceRef.current + trade.amount + profit }, { merge: true });
             } else if (trade.accountType === 'REAL') {
               setDoc(userDocRef, { balance: balanceRef.current + trade.amount + profit }, { merge: true });
             } else {
               // Handle extra accounts if necessary
               const updatedExtraAccounts = extraAccounts.map(a => {
                 if (a.id === trade.accountType) {
                   return { ...a, balance: a.balance + trade.amount + profit };
                 }
                 return a;
               });
               setDoc(userDocRef, { extraAccounts: updatedExtraAccounts }, { merge: true });
             }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/trades/${result.id}`);
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
    const now = Date.now() + serverTimeOffset;
    if (tradeMode === 'CLOCK') {
      const msToNextMinute = 60000 - (now % 60000);
      const nextClose = msToNextMinute < 30000 ? now + msToNextMinute + 60000 : now + msToNextMinute;
      return nextClose + (clockOffset - 1) * 60000;
    } else {
      return now + timerDuration * 1000;
    }
  };

  const handleTrade = (type: 'UP' | 'DOWN') => {
    if (selectedAsset.isFrozen) return showToast("Trading is currently closed for this asset.", "error");
    
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

    let totalAvailable = currentBalance;
    if (activeAccount === 'REAL') {
      totalAvailable = balance + bonusBalance;
    }

    if (totalAvailable < investmentInUSD) {
      showToast(`Insufficient Balance. You need ${displayCurrencySymbol}${(investmentInUSD * rate).toFixed(2)} but have ${displayCurrencySymbol}${(totalAvailable * rate).toFixed(2)}.`, "error");
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
        return showToast(`Risk Management: Max trade amount is ${currentSymbol}${rm.maxTradeAmount}`, "error");
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
        return showToast(`Risk Management: Daily Stop Loss of ${currentSymbol}${rm.dailyStopLoss} reached.`, "error");
      }

      // Daily Take Profit Check
      if (rm.dailyTakeProfit > 0 && dailyPnL >= rm.dailyTakeProfit) {
        return showToast(`Risk Management: Daily Take Profit of ${currentSymbol}${rm.dailyTakeProfit} reached.`, "error");
      }
    }

    const entryPrice = lastCloseRef.current;
    
    if (activeAccount === 'DEMO') {
      setDemoBalance(prev => prev - investmentInUSD);
    } else if (activeAccount === 'REAL') {
      let remaining = investmentInUSD;
      let newRealBalance = balance;
      let newBonusBalance = bonusBalance;
      
      if (newRealBalance >= remaining) {
        newRealBalance -= remaining;
        remaining = 0;
      } else {
        remaining -= newRealBalance;
        newRealBalance = 0;
        newBonusBalance = Math.max(0, newBonusBalance - remaining);
      }
      setBalance(newRealBalance);
      setBonusBalance(newBonusBalance);
      
      // Update turnover achieved locally for immediate feedback
      setTurnoverAchieved(prev => prev + investmentInUSD);
    } else {
      setExtraAccounts(prev => prev.map(a => a.id === activeAccount ? { ...a, balance: a.balance - investmentInUSD } : a));
    }
    
    const now = Date.now() + serverTimeOffset;
    const expirationTime = getExpirationTime();
    const tradeDurationSeconds = Math.floor((expirationTime - now) / 1000);

    const tradeId = Math.random().toString(36).substr(2, 9);
    const newTrade: Trade = {
      id: tradeId,
      type,
      entryPrice: entryPrice,
      amount: investmentInUSD, // Store in USD
      startTime: now,
      endTime: expirationTime,
      duration: tradeDurationSeconds,
      status: 'ACTIVE',
      accountType: activeAccount,
      payout: selectedAsset.payout,
      asset: selectedAsset.name,
      assetShortName: selectedAsset.shortName,
      assetFlag: selectedAsset.flag,
      assetCategory: selectedAsset.category,
      userEmail: user?.email || 'Anonymous',
      userId: user?.uid
    };

    // Professional Firestore Update
    if (user) {
      try {
        // We use local state updates for immediate feedback, but the source of truth is Firestore
        if (activeAccount === 'DEMO') {
          setDoc(doc(db, 'users', user.uid), { demoBalance: demoBalance - investmentInUSD }, { merge: true });
        } else if (activeAccount === 'REAL') {
          let remaining = investmentInUSD;
          let newRealBalance = balance;
          let newBonusBalance = bonusBalance;
          
          if (newRealBalance >= remaining) {
            newRealBalance -= remaining;
            remaining = 0;
          } else {
            remaining -= newRealBalance;
            newRealBalance = 0;
            newBonusBalance = Math.max(0, newBonusBalance - remaining);
          }
          setDoc(doc(db, 'users', user.uid), { 
            balance: newRealBalance, 
            bonusBalance: newBonusBalance,
            turnover_achieved: (turnoverAchieved || 0) + investmentInUSD 
          }, { merge: true });
        }

        // Add trade to subcollection
        setDoc(doc(db, 'users', user.uid, 'trades', tradeId), newTrade);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/trades/${tradeId}`);
      }
    }
    
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

  // Client-side Trade Resolution Fallback (Fixes 00:00 stuck trades)
  useEffect(() => {
    if (!user || trades.length === 0) return;

    const interval = setInterval(async () => {
      const now = Date.now() + serverTimeOffset;
      const activeTrades = trades.filter(t => t.status === 'ACTIVE');

      for (const trade of activeTrades) {
        // If trade expired more than 7 seconds ago and still active, Resolve it locally
        if (now > (trade.endTime + 7000)) {
          console.warn(`[Self-Resolution] Resolving stuck trade: ${trade.id}`);
          
          if (resolvedTradeIdsRef.current.has(trade.id)) continue;
          resolvedTradeIdsRef.current.add(trade.id);

          const currentPrice = lastCloseRef.current;
          let isWin = false;
          if (trade.type === 'UP') {
            isWin = currentPrice > trade.entryPrice;
          } else {
            isWin = currentPrice < trade.entryPrice;
          }

          const status = isWin ? 'WIN' : 'LOSS';
          const profit = isWin ? trade.amount * (trade.payout / 100) : -trade.amount;

          try {
            const tradeDocRef = doc(db, 'users', user.uid, 'trades', trade.id);
            await setDoc(tradeDocRef, {
              status: status,
              profit: profit,
              closePrice: currentPrice,
              endTime: trade.endTime // Use original endTime
            }, { merge: true });

            if (isWin) {
              const userDocRef = doc(db, 'users', user.uid);
              if (trade.accountType === 'DEMO') {
                await setDoc(userDocRef, { demoBalance: demoBalance + trade.amount + profit }, { merge: true });
              } else if (trade.accountType === 'REAL') {
                await setDoc(userDocRef, { 
                    balance: balance + trade.amount + profit,
                    // If win, we don't add to turnover (investment was already added when placed)
                }, { merge: true });
              }
            }
            
            // Re-sync trades state locally if needed (Firestore listener will pick it up usually)
            setTradeResults(r => [...r, { id: trade.id, profit: profit, isWin: isWin }]);
            playSound(isWin ? 'win' : 'loss');
            
          } catch (error) {
            console.error('Self-resolution failed:', error);
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, trades, balance, demoBalance, serverTimeOffset]);

  const appClosedTrades = useMemo(() => {
    return trades.filter(t => t.status !== 'ACTIVE' && t.accountType === activeAccount).sort((a, b) => b.endTime - a.endTime);
  }, [trades, activeAccount]);

  const currentPayout = marketAssets[selectedAsset.shortName]?.payout || selectedAsset.payout;
  const potentialProfit = (investment * currentPayout / 100).toFixed(2);

  // Handle Visibility Change for Chart Sync
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && socket?.connected) {
        setIsLoading(true);
        socket.emit('request-history', { asset: selectedAsset.shortName, timeframe: chartTimeFrame, limit: 500 });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [socket, selectedAsset.shortName, chartTimeFrame]); // Use shortName instead of full object

  useEffect(() => {
    if (view !== 'TRADING') {
      lastTradingViewTimeRef.current = Date.now();
    }
  }, [view]);

  // Handle returning to TRADING view from another page
  useEffect(() => {
    if (view === 'TRADING' && prevViewRef.current !== 'TRADING' && socket?.connected) {
      const timeAway = Date.now() - lastTradingViewTimeRef.current;
      const isQuickReturn = timeAway < 15000;

      if (!isQuickReturn) {
        setIsLoading(true);
        loadingStartTimeRef.current = Date.now();
        // REMOVED: setData([]); // Clear data for full reload - causing flash
      }
      
      // Always request history to sync up, but if quick return, we don't clear the screen
      socket.emit('request-history', { asset: selectedAsset.shortName, timeframe: chartTimeFrame, limit: 500 });
    }
    prevViewRef.current = view;
  }, [view, socket, selectedAsset.shortName, chartTimeFrame]);

  if (authLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center">
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
        onBack={() => setView('HELP')} 
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

  if (user?.email?.toLowerCase() === 'emon@gmail.com' || user?.email?.toLowerCase() === 'hasan23@gmail.com') {
    return <AdminPanel socket={socket} onBack={() => logout()} userEmail={user.email || ''} isRestricted={false} />;
  }
  
  if (user?.email?.toLowerCase() === 'mdrajon56@gmail.com') {
    return <AdminPanel socket={socket} onBack={() => logout()} userEmail={user.email || ''} isRestricted={true} />;
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
        bonusBalance={bonusBalance}
        turnoverRequired={turnoverRequired}
        turnoverAchieved={turnoverAchieved}
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
      }} 
      timezoneOffset={timezoneOffset}
      setTimezoneOffset={setTimezoneOffset}
      currency={currency}
      setCurrency={handleCurrencyChange}
      socket={socket}
      user={user}
      chatBackground={chatBackground}
      setChatBackground={setChatBackground}
      savePreferences={savePreferences}
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
    <div className="flex h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans overflow-hidden select-none">
      {view === 'TRADING' && (
        <DesktopSidebar 
          currentView={view} 
          setView={setView} 
          activeTradesCount={activeTrades.length}
          isHistoryOpen={isHistoryOpen}
          setIsHistoryOpen={setIsHistoryOpen}
          isMarketOpen={isMarketOpen}
          setIsMarketOpen={setIsMarketOpen}
          isRewardsOpen={isRewardsOpen}
          setIsRewardsOpen={setIsRewardsOpen}
          isActivitiesOpen={isActivitiesOpen}
          setIsActivitiesOpen={setIsActivitiesOpen}
          isLeaderboardOpen={isLeaderboardOpen}
          setIsLeaderboardOpen={setIsLeaderboardOpen}
          isHelpOpen={isHelpOpen}
          setIsHelpOpen={setIsHelpOpen}
          isAssetSelectorOpen={isAssetSelectorOpen}
          setIsAssetSelectorOpen={setIsAssetSelectorOpen}
          setIsProfileOpen={setIsProfileOpen}
          setIsPaymentsOpen={setIsPaymentsOpen}
          setIsAccountsSheetOpen={setIsAccountsSheetOpen}
        />
      )}
      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        {/* --- Top Navbar --- */}
        {view === 'TRADING' && !isActivitiesOpen && (
          <>
            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-4 bg-[#121212] z-20 h-16 shrink-0 relative">
              {/* Left: Asset Selection Tabs */}
              <div className="flex items-center gap-2">
                 <button className="w-10 h-10 bg-[#1b1c21] hover:bg-[#25262c] rounded-lg flex items-center justify-center text-white/50 hover:text-white transition">
                    <Plus size={18} />
                 </button>
                 <button 
                   onClick={() => setIsAssetSelectorOpen(true)}
                   className="flex items-center gap-3 px-3 h-10 bg-[#1b1c21] hover:bg-[#25262c] rounded-lg active:scale-95 transition shrink-0 cursor-pointer text-left"
                 >
                   <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
                      <AssetIcon shortName={selectedAsset.shortName} category={selectedAsset.category} flag={selectedAsset.flag} size="sm" />
                   </div>
                   <div className="flex flex-col">
                      <div className="text-white font-bold text-[12px] leading-none mb-0.5">{selectedAsset.name.split('(')[0].trim()}</div>
                      <div className="text-[10px] text-gray-500 font-medium leading-none">FT • <span className="text-white/80">{selectedAsset.payout}%</span></div>
                   </div>
                 </button>
              </div>
              
              {/* Right: Account & Payments */}
              <div className="flex items-center gap-4">
                 {/* Connection Status Indicator */}
                 <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#1b1c21] border border-white/5">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                      isConnected ? "bg-green-500 shadow-green-500/50 animate-pulse" : "bg-red-500 shadow-red-500/50"
                    )} />
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest leading-none">
                      {isConnected ? "Server Live" : "Offline"}
                    </span>
                 </div>

                 <div 
                    onClick={() => {
                      setView('TRADING');
                      setIsAccountsSheetOpen(true);
                    }}
                    className="flex flex-col items-end cursor-pointer active:scale-95 transition group"
                  >
                    <div className="flex items-center gap-2">
                       <span className="text-white font-bold text-[14px]">
                         {displayCurrencySymbol}{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </span>
                    </div>
                    <div className={cn("flex items-center gap-1 text-[11px] font-medium transition-colors", activeAccount === 'DEMO' ? 'text-[#f59e0b]' : 'text-gray-400')}>
                       {activeAccount === 'DEMO' ? 'Demo account' : `${currency.code} account`} <ChevronDown size={12} />
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => setIsPaymentsOpen(true)}
                   className="h-10 px-5 bg-[#2ebd85] hover:bg-[#2ebd85]/90 rounded-lg flex items-center justify-center text-[#121212] font-bold text-[13px] transition active:scale-95 shadow-[0_0_15px_rgba(46,189,133,0.15)]"
                 >
                   Payments
                 </button>
                 
                 <button 
                   onClick={() => {
                     if (isProfileOpen) {
                       setIsProfileOpen(false);
                     } else {
                       closeAllPanels();
                       setIsProfileOpen(true);
                     }
                   }}
                   className="w-10 h-10 rounded-full border border-white/5 bg-[#1b1c21] flex items-center justify-center text-white/40 cursor-pointer active:scale-95 transition hover:bg-[#25262c] hover:text-white"
                 >
                   <User size={18} />
                 </button>
              </div>
            </header>

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-3 bg-[#0a0b0d] z-20 border-b border-white/5 h-14">
              {/* Left: Logo & Profile */}
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => setView('PROFILE')}
                  className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition hover:bg-white/10 overflow-hidden shadow-lg shadow-black/40 ring-1 ring-white/5"
                >
                  <img 
                    src="https://i.imghippo.com/files/Gtw3911Dmk.jpg" 
                    alt="Logo" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Center: Balance Dropdown */}
              <div 
                onClick={() => {
                  setView('TRADING');
                  setIsAccountsSheetOpen(true);
                }}
                className="flex flex-col items-center cursor-pointer active:scale-95 transition group"
              >
                <div className="text-white font-bold text-[15px] tracking-tight leading-tight flex items-center gap-1">
                  {displayCurrencySymbol}{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                  activeAccount === 'DEMO' ? "text-orange-400" : "text-gray-500"
                )}>
                  {activeAccount === 'DEMO' ? 'Demo Account' : `${currency.code} Account`} <ChevronDown size={10} className="opacity-50" />
                </div>
              </div>

              {/* Right: Wallet/Deposit */}
              <button 
                onClick={() => setIsPaymentsOpen(true)}
                className="w-9 h-9 bg-[#22c55e] rounded-lg flex items-center justify-center text-[#0a2e16] shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:bg-[#1eb054] transition active:scale-95"
              >
                <Wallet size={18} strokeWidth={2.5} />
              </button>
            </header>
          </>
        )}

        {/* Client Ads Banner Segment */}
        {clientAds.length > 0 && view === 'TRADING' && !isActivitiesOpen && (
          <div className="w-full bg-[#111116] border-b border-white/5 relative z-10 flex h-[48px] overflow-hidden items-center justify-center shrink-0">
            <AnimatePresence mode="wait">
              {clientAds[activeAdIndex] && (
                <motion.div
                  key={clientAds[activeAdIndex].id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {clientAds[activeAdIndex].linkUrl ? (
                    <a href={clientAds[activeAdIndex].linkUrl} target="_blank" rel="noreferrer" className="block w-full h-full relative cursor-pointer group">
                      {clientAds[activeAdIndex].imageUrl && (
                         <img src={clientAds[activeAdIndex].imageUrl} alt="Ad" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition duration-500" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                         <span className="text-white text-xs font-black tracking-widest uppercase drop-shadow-md">{clientAds[activeAdIndex].title}</span>
                      </div>
                    </a>
                  ) : (
                    <div className="w-full h-full relative">
                      {clientAds[activeAdIndex].imageUrl && (
                         <img src={clientAds[activeAdIndex].imageUrl} alt="Ad" className="w-full h-full object-cover opacity-60" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                         <span className="text-white text-xs font-black tracking-widest uppercase drop-shadow-md">{clientAds[activeAdIndex].title}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* --- Multi-Asset Selection Bar (Mobile) --- */}
        {view === 'TRADING' && (
          <div className="md:hidden flex items-center px-2 bg-[#0a0b0d] gap-1 overflow-x-auto scrollbar-hide border-b border-white/5 h-11">
             <div 
               onClick={() => setIsAssetSelectorOpen(true)}
               className="flex items-center gap-2 px-2.5 h-8 bg-white/[0.03] rounded-lg border border-white/5 active:scale-95 transition shrink-0 cursor-pointer"
             >
                <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
                  <AssetIcon shortName={selectedAsset.shortName} category={selectedAsset.category} flag={selectedAsset.flag} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-white font-bold text-[12px] truncate max-w-[80px]">{selectedAsset.name.split('(')[0].trim()}</span>
                   <span className="text-green-500 text-[11px] font-black">{selectedAsset.payout}%</span>
                   <ChevronDown size={10} className="text-gray-500" />
                </div>
             </div>
             
             <div className="flex items-center h-full gap-1 ml-auto">
                <button 
                  onClick={() => setIsIndicatorSheetOpen(true)}
                  className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-white transition group relative ml-1 rounded-sm border-r border-[#3a3b40] bg-transparent"
                >
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="scale-x-[-1]">
                     <path d="m14.5 21-5-14" />
                     <path d="M9.5 21 14 9" />
                     <path d="M10.5 15h3.5" />
                     <circle cx="12" cy="5" r="2" />
                     <path d="M21 4 v4 M19 6 h4" strokeWidth="1.5" />
                   </svg>
                </button>
                <button 
                  onClick={() => setIsChartSettingsOpen(true)}
                  className="px-2 h-8 flex items-center justify-center gap-1 transition bg-white/5 rounded-md border border-white/5"
                >
                   <span className="text-[11px] font-black text-white/90">{chartTimeFrame}</span>
                   <ChevronDown size={10} className="text-white/20" />
                </button>
                <button 
                  onClick={() => setIsServiceAgreementOpen(true)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white transition group"
                >
                   <Radio size={18} strokeWidth={1.5} />
                </button>
             </div>
          </div>
        )}


      <OnboardingModal 
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
      <div className="md:hidden">
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
          onSetDemoBalance={handleSetCustomDemoBalance}
          accounts={[
            { id: 'DEMO', name: 'Demo account', currency: currency.code, symbol: currency.symbol, balance: demoBalance * (EXCHANGE_RATES[currency.code] || 1), type: 'DEMO', flag: currency.flag },
            { id: 'REAL', name: `${currency.code} Account`, currency: currency.code, symbol: currency.symbol, balance: (balance + bonusBalance) * (EXCHANGE_RATES[currency.code] || 1), type: 'REAL', flag: currency.flag },
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
      </div>

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
      <div className="flex-1 flex relative bg-[var(--bg-primary)] overflow-hidden">
        {view === 'TRADING' && (
          <>
            {/* Left Panels (Desktop) */}
            <div className="hidden md:flex">
              {isAssetSelectorOpen && (
                <AssetSidePanel 
                  onClose={() => setIsAssetSelectorOpen(false)} 
                  onSelect={setSelectedAsset}
                  setIsLoading={setIsLoading}
                  currentAssetId={selectedAsset.id}
                  marketAssets={marketAssets}
                />
              )}
              {isProfileOpen && (
                <ProfileSidePanel 
                  user={user} 
                  balance={balance} 
                  bonusBalance={bonusBalance}
                  currency={currency}
                  setView={setView}
                  onSettings={() => {
                    setView('SETTINGS');
                    setIsProfileOpen(false);
                  }}
                  onAdmin={() => {
                    setView('ADMIN');
                    setIsProfileOpen(false);
                  }}
                  notifications={notifications}
                  onNotificationsClick={() => setIsNotificationsOpen(true)}
                  turnoverRequired={turnoverRequired}
                  turnoverAchieved={turnoverAchieved}
                  onClose={() => setIsProfileOpen(false)}
                />
              )}
              {isPaymentsOpen && (
                <PaymentsSidePanel 
                  isOpen={true}
                  onClose={() => setIsPaymentsOpen(false)}
                  balance={balance}
                  rawBalance={balance}
                  userId={user?.uid}
                  activeAccount={activeAccount}
                  currencySymbol={displayCurrencySymbol}
                  currencyCode={activeAccount === 'DEMO' ? currency.code : activeAccount === 'REAL' ? currency.code : extraAccounts.find(a => a.id === activeAccount)?.currency || 'USD'}
                  initialPromoCode={selectedRewardCode}
                  socket={socket}
                  userEmail={user?.email}
                  turnoverRequired={turnoverRequired}
                  turnoverAchieved={turnoverAchieved}
                  initialView={paymentsInitialView}
                  platformSettings={platformSettings}
                />
              )}
              {isHistoryOpen && (
                <HistorySidePanel 
                  trades={trades.filter(t => t.accountType === activeAccount)} 
                  pendingOrders={pendingOrders.filter(o => o.accountType === activeAccount)}
                  onClose={() => setIsHistoryOpen(false)} 
                  currencySymbol={displayCurrencySymbol}
                  exchangeRate={currentExchangeRate} 
                  onCancelPendingOrder={handleCancelPendingOrder}
                  timezoneOffset={timezoneOffset}
                  tickHistory={tickHistory}
                  currentPrice={currentPrice}
                  currentTime={currentTime}
                  currentAssetShortName={selectedAsset.shortName}
                  marketAssets={marketAssets}
                />
              )}
              {isMarketOpen && (
                <MarketSidePanel onClose={() => setIsMarketOpen(false)} />
              )}
              {isAccountsSheetOpen && (
                <AccountsSidePanel 
                   activeAccount={activeAccount}
                   onSelectAccount={(id: string) => {
                     setIsSwitchingAccount(true);
                     setTimeout(() => {
                       setActiveAccount(id);
                       setIsSwitchingAccount(false);
                     }, 1500);
                   }}
                   onClose={() => setIsAccountsSheetOpen(false)}
                   onAddAccount={() => { setIsAccountsSheetOpen(false); }}
                   onDeposit={() => handleOpenPayments('DEPOSIT')}
                   onWithdraw={() => handleOpenPayments('WITHDRAW')}
                   onRefill={refillDemoBalance}
                   onSetDemoBalance={handleSetCustomDemoBalance}
                   accounts={[
                     { id: 'DEMO', name: 'Demo account', currency: currency.code, symbol: currency.symbol, balance: demoBalance * (EXCHANGE_RATES[currency.code] || 1), type: 'DEMO', flag: currency.flag },
                     { id: 'REAL', name: `${currency.code} Account`, currency: currency.code, symbol: currency.symbol, balance: (balance + bonusBalance) * (EXCHANGE_RATES[currency.code] || 1), type: 'REAL', flag: currency.flag },
                     ...extraAccounts
                   ]}
                />
              )}
              {isRewardsOpen && (
                <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] p-4 overflow-y-auto scrollbar-hide z-20">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Rewards</h2>
                    <button onClick={() => setIsRewardsOpen(false)} className="text-[var(--text-secondary)] hover:text-white">
                      <X size={20} />
                    </button>
                  </div>
                  <RewardsPage 
                    turnoverRequired={turnoverRequired}
                    turnoverAchieved={turnoverAchieved}
                    userBonuses={userBonuses}
                    currencySymbol={displayCurrencySymbol} 
                    rewards={rewards}
                    balance={balance}
                    trades={trades}
                    onApplyReward={(code) => {
                      setSelectedRewardCode(code);
                      handleOpenPayments('DEPOSIT');
                      setIsRewardsOpen(false);
                    }}
                  />
                </aside>
              )}
              {/* Activities aside desktop */}
              {isActivitiesOpen && (
                <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden z-20">
                   <ActivitiesSheet 
                      isOpen={isActivitiesOpen}
                      onClose={() => setIsActivitiesOpen(false)}
                      unreadAnnouncementsCount={unreadAnnouncementsCount}
                      clientAds={clientAds}
                      onOpenLeaderboard={() => {
                        setIsActivitiesOpen(false);
                        setIsLeaderboardOpen(true);
                      }}
                      onOpenRewards={() => {
                        setIsActivitiesOpen(false);
                        setIsRewardsOpen(true);
                      }}
                      onOpenTournaments={() => {
                        setIsActivitiesOpen(false);
                        setIsTournamentsOpen(true);
                      }}
                      onOpenWhatsNew={() => {
                        setIsActivitiesOpen(false);
                        setIsWhatsNewOpen(true);
                      }}
                      onOpenReferral={() => {
                        setIsActivitiesOpen(false);
                        setView('REFERRAL');
                      }}
                      onOpenCalendar={() => {
                        setIsActivitiesOpen(false);
                        setIsCalendarOpen(true);
                      }}
                      inSidebar={true}
                   />
                </aside>
              )}
              {isHelpOpen && (
                <aside className="hidden md:flex flex-col w-80 border-r border-[#1c1c1e] bg-[#1c1c1e] overflow-y-auto scrollbar-hide z-20">
                  <HelpPage 
                    onSupportClick={() => setIsChatOpen(true)} 
                    onHelpCenterClick={() => { setInfoPageTitle('Help Center'); setView('INFO_PAGE'); setIsHelpOpen(false); }}
                    onEducationClick={() => { setInfoPageTitle('Education Hub'); setView('INFO_PAGE'); setIsHelpOpen(false); }}
                    onTradingTutorialsClick={() => { setInfoPageTitle('Trading Tutorials'); setView('INFO_PAGE'); setIsHelpOpen(false); }}
                    supportSettings={supportSettings}
                    tutorials={tutorials}
                    currencySymbol={activeAccount === 'DEMO' ? '$' : currency.symbol}
                    onClose={() => setIsHelpOpen(false)}
                  />
                </aside>
              )}
            </div>

            <IndicatorSheet 
               isOpen={isIndicatorSheetOpen}
               onClose={() => setIsIndicatorSheetOpen(false)}
               activeIndicators={activeIndicators}
               initialTab={indicatorInitialTab}
               onSelectIndicator={(indicator) => {
                 const isDrawingTool = DRAWING_TOOLS.includes(indicator.id);
                 handleSelectIndicator(indicator);
                 if (isDrawingTool) {
                   setIsIndicatorSheetOpen(false);
                 }
               }}
             />

             <ServiceAgreementSheet
               isOpen={isServiceAgreementOpen}
               onClose={() => setIsServiceAgreementOpen(false)}
               onAccept={() => setIsServiceAgreementOpen(false)}
             />

             <ActivitiesSheet
                isOpen={isActivitiesOpen}
                onClose={() => setIsActivitiesOpen(false)}
                unreadAnnouncementsCount={unreadAnnouncementsCount}
                clientAds={clientAds}
                onOpenLeaderboard={() => {
                  setIsActivitiesOpen(false);
                  setIsLeaderboardOpen(true);
                }}
                onOpenRewards={() => {
                  setIsActivitiesOpen(false);
                  setIsRewardsOpen(true);
                }}
                onOpenTournaments={() => {
                  setIsActivitiesOpen(false);
                  setIsTournamentsOpen(true);
                }}
                onOpenWhatsNew={() => {
                  setIsActivitiesOpen(false);
                  setIsWhatsNewOpen(true);
                }}
                onOpenReferral={() => {
                  setIsActivitiesOpen(false);
                  setView('REFERRAL');
                }}
                onOpenCalendar={() => {
                  setIsActivitiesOpen(false);
                  setIsCalendarOpen(true);
                }}
              />

              <TournamentsPage 
                isOpen={isTournamentsOpen}
                onClose={() => setIsTournamentsOpen(false)}
                socket={socket}
                currencySymbol={displayCurrencySymbol}
              />

            <div className="flex-1 h-full relative">
              <TradingChart 
                key={`${selectedAsset.id}-${chartTimeFrame}`}
                data={data}
                trades={activeTrades}
                assetName={selectedAsset.name}
                currentTime={currentTime}
                chartType={chartType}
                chartTimeFrame={chartTimeFrame}
                isLoading={isLoading}
                isConnected={isConnected}
                timezoneOffset={timezoneOffset}
                serverTimeOffset={serverTimeOffset}
                activeIndicators={activeIndicators}
                currencySymbol={displayCurrencySymbol}
                exchangeRate={currentExchangeRate}
                onLoadMoreHistory={handleLoadMoreHistory}
                isTradingEnabled={platformSettings.isTradingEnabled !== false}
              />
              
              {/* Desktop Chart Overlays (Timeframe selector, indicators) */}
              <div className="hidden md:flex absolute bottom-8 left-8 z-20">
                <div id="desktop-chart-toolbar" className="flex flex-col bg-[#1b1c21] border border-white/5 rounded-[12px] shadow-2xl w-[44px] relative pointer-events-auto">
                  <button 
                    onClick={() => {
                      setActiveDesktopChartMenu(activeDesktopChartMenu === 'time' ? null : 'time');
                    }}
                    className={cn(
                      "h-11 flex flex-col items-center justify-center border-b border-white/5 transition rounded-t-[12px]",
                      activeDesktopChartMenu === 'time' ? "bg-[#25262c]" : "hover:bg-[#25262c]"
                    )}
                  >
                    <span className={cn(
                      "text-[12px] font-bold tracking-tight transition-colors",
                      activeDesktopChartMenu === 'time' ? "text-white" : "text-white/80"
                    )}>{chartTimeFrame}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setActiveDesktopChartMenu(activeDesktopChartMenu === 'type' ? null : 'type');
                    }}
                    className={cn(
                      "h-11 flex items-center justify-center border-b border-white/5 transition",
                      activeDesktopChartMenu === 'type' ? "bg-[#25262c] text-white" : "hover:bg-[#25262c] text-white/70"
                    )}
                  >
                    <CandlestickChart size={18} strokeWidth={2} />
                  </button>

                  <button 
                    onClick={() => {
                      setIsIndicatorSheetOpen(!isIndicatorSheetOpen);
                      setActiveDesktopChartMenu(null);
                    }}
                    className={cn(
                      "h-11 flex items-center justify-center border-b border-white/5 transition",
                      isIndicatorSheetOpen ? "bg-[#25262c] text-white" : "hover:bg-[#25262c] text-white/70"
                    )}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="scale-x-[-1]">
                      <path d="m14.5 21-5-14" />
                      <path d="M9.5 21 14 9" />
                      <path d="M10.5 15h3.5" />
                      <circle cx="12" cy="5" r="2" />
                      <path d="M21 4 v4 M19 6 h4" strokeWidth="2" />
                    </svg>
                  </button>

                  <button 
                    onClick={() => {
                      setIsServiceAgreementOpen(!isServiceAgreementOpen);
                      setActiveDesktopChartMenu(null);
                    }}
                    className={cn(
                      "h-11 flex items-center justify-center border-b border-white/5 transition",
                      isServiceAgreementOpen ? "bg-[#25262c] text-white" : "hover:bg-[#25262c] text-white/70"
                    )}
                  >
                    <Radio size={18} strokeWidth={2} />
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsIndicatorSheetOpen(true);
                      setIndicatorInitialTab('Drawing');
                    }}
                    className={cn(
                      "h-11 flex items-center justify-center transition rounded-b-[12px]",
                      activeDesktopChartMenu === 'tools' ? "bg-[#25262c] text-white" : "hover:bg-[#25262c] text-white/70"
                    )}
                  >
                    <PencilLine size={18} strokeWidth={2} />
                  </button>

                  {/* Desktop Time Menu Popover */}
                  <AnimatePresence>
                    {activeDesktopChartMenu === 'time' && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-[58px] bottom-0 w-[260px] bg-[#222327] border border-white/5 rounded-2xl shadow-2xl p-6 z-30"
                      >
                        <div className="flex items-center gap-2 mb-6">
                          <span className="text-[15px] font-bold text-white tracking-tight">Candle Time Frame</span>
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-500 flex items-center justify-center text-[9px] text-gray-500 font-bold">?</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {TIME_FRAMES.filter(tf => {
                              if (selectedAsset.isOTC) return true;
                              return !['5s', '10s', '15s', '20s', '30s'].includes(tf);
                          }).map((tf) => (
                            <button
                              key={tf}
                              onClick={() => {
                                setChartTimeFrame(tf);
                                setActiveDesktopChartMenu(null);
                              }}
                              className={cn(
                                "flex items-center justify-center h-11 rounded-lg text-[13px] font-bold transition-all",
                                chartTimeFrame === tf 
                                  ? "bg-[#3d3f44] text-white shadow-sm" 
                                  : "text-[#969696] hover:text-white hover:bg-white/5"
                              )}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Desktop Chart Type Menu Popover */}
                  <AnimatePresence>
                    {activeDesktopChartMenu === 'type' && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-[58px] bottom-12 w-[280px] bg-[#222327] border border-white/5 rounded-2xl shadow-2xl py-2 z-30"
                      >
                        <div className="px-5 py-4 border-b border-white/5 mb-1">
                           <span className="text-[15px] font-bold text-white tracking-wide">Chart Type</span>
                        </div>
                        <div className="flex flex-col px-0">
                          {CHART_TYPES.map((type, idx) => (
                            <button
                              key={type.id}
                              onClick={() => {
                                setChartType(type.id);
                                setActiveDesktopChartMenu(null);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-5 py-4 transition-all group relative",
                                chartType === type.id ? "bg-[#3d3f44]" : "hover:bg-white/5",
                                idx !== CHART_TYPES.length - 1 && "border-b border-white/5"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <type.icon 
                                  size={20} 
                                  strokeWidth={1.5}
                                  className={cn(
                                    "transition-colors",
                                    chartType === type.id ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                                  )} 
                                />
                                <span className={cn(
                                  "text-[14px] font-bold transition-colors",
                                  chartType === type.id ? "text-white" : "text-[#969696] group-hover:text-gray-200"
                                )}>
                                  {type.label}
                                </span>
                              </div>
                              {chartType === type.id && <Check size={18} className="text-white" strokeWidth={3} />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Desktop Indicators Popover */}
                  <AnimatePresence>
                    {activeDesktopChartMenu === 'indicators' && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-[58px] bottom-0 w-[300px] bg-[#222327] border border-white/5 rounded-2xl shadow-2xl py-2 z-30 overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-white/5 mb-2">
                           <span className="text-[15px] font-bold text-white tracking-wide">Indicators</span>
                        </div>
                        <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar px-2">
                          {INDICATORS_LIST.map((indicator) => (
                            <button
                              key={indicator.id}
                              onClick={() => {
                                handleSelectIndicator({
                                  id: indicator.id,
                                  name: indicator.name,
                                  instanceId: Math.random().toString(36).substr(2, 9),
                                  params: {},
                                  color: '#2962FF',
                                  visible: true
                                });
                                setActiveDesktopChartMenu(null);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-3 transition-all rounded-lg group mb-1",
                                activeIndicators.some(i => i.id === indicator.id) ? "bg-[#3d3f44]" : "hover:bg-white/5"
                              )}
                            >
                              <span className={cn(
                                "text-[14px] font-medium transition-colors",
                                activeIndicators.some(i => i.id === indicator.id) ? "text-white" : "text-[#969696] group-hover:text-gray-200"
                              )}>
                                {indicator.name}
                              </span>
                              {activeIndicators.some(i => i.id === indicator.id) && <Check size={16} className="text-blue-500" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Desktop Tools Popover */}
                  <AnimatePresence>
                    {activeDesktopChartMenu === 'tools' && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-[58px] bottom-0 w-[240px] bg-[#222327] border border-white/5 rounded-2xl shadow-2xl py-2 z-30"
                      >
                        <div className="px-5 py-4 border-b border-white/5 mb-2">
                           <span className="text-[15px] font-bold text-white tracking-wide">Drawing Tools</span>
                        </div>
                        <div className="flex flex-col px-2">
                          {DESKTOP_TOOLS_LIST.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => {
                                  handleSelectIndicator({
                                    id: tool.id,
                                    name: tool.name,
                                    instanceId: Math.random().toString(36).substr(2, 9),
                                    params: {},
                                    color: '#FF9800',
                                    visible: true
                                  });
                                  setActiveDesktopChartMenu(null);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-3 transition-all rounded-lg group mb-1",
                                  activeIndicators.some(i => i.id === tool.id) ? "bg-[#3d3f44]" : "hover:bg-white/5"
                                )}
                              >
                                <span className={cn(
                                  "text-[14px] font-medium transition-colors",
                                  activeIndicators.some(i => i.id === tool.id) ? "text-white" : "text-[#969696] group-hover:text-gray-200"
                                )}>
                                  {tool.name}
                                </span>
                                {activeIndicators.some(i => i.id === tool.id) && <Check size={16} className="text-orange-500" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

                {/* Zoom Controls (Bottom Middle) */}
                <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#1b1c21] border border-white/5 rounded-[12px] shadow-2xl z-20 overflow-hidden items-center h-10">
                  <button className="w-12 h-full flex items-center justify-center hover:bg-[#25262c] transition text-white/50 hover:text-white"><Minus size={16} strokeWidth={2.5} /></button>
                  <div className="w-[1px] h-4 bg-white/5"></div>
                  <button className="w-12 h-full flex items-center justify-center hover:bg-[#25262c] transition text-white/50 hover:text-white"><Plus size={16} strokeWidth={2.5} /></button>
                </div>
              </div>

              {/* Right Panel (Desktop) */}
              <div className="hidden md:flex">
                <DesktopTradePanel 
                  investment={investment}
                  setInvestment={setInvestment}
                  currency={currency}
                  tradeMode={tradeMode}
                  setTradeMode={setTradeMode}
                  timerDuration={timerDuration}
                  setTimerDuration={setTimerDuration}
                  clockOffset={clockOffset}
                  setClockOffset={setClockOffset}
                  getExpirationTime={getExpirationTime}
                  timezoneOffset={timezoneOffset}
                  handleTrade={handleTrade}
                  potentialProfit={potentialProfit}
                  displayCurrencySymbol={displayCurrencySymbol}
                  setIsPendingOrderSheetOpen={setIsPendingOrderSheetOpen}
                  selectedAsset={selectedAsset}
                  isFrozen={selectedAsset.isFrozen}
                  isAssetSelectorOpen={isAssetSelectorOpen}
                  setIsAssetSelectorOpen={setIsAssetSelectorOpen}
                  closeAllPanels={closeAllPanels}
                  isTradingEnabled={platformSettings.isTradingEnabled !== false}
                />
              </div>
            </>
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
            timezoneOffset={timezoneOffset}
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
            balance={balance}
            trades={trades}
            onApplyReward={(code) => {
              setSelectedRewardCode(code);
              setIsPaymentsOpen(true);
            }}
            onBack={() => setView('TRADING')}
          />
        )}
        {view === 'REFERRAL' && <ReferralPage user={user} referralSettings={referralSettings} currencySymbol={displayCurrencySymbol} onBack={() => setView('PROFILE')} />}
        {view === 'CALENDAR' && <EconomicCalendar onBack={() => setView('HOME')} />}
        {/* Removed LEADERBOARD view as it's now in ActivitiesSheet */}
        {view === 'PROFILE' && (
          <ProfilePage 
            onBack={() => setView('TRADING')} 
            onSettings={() => setView('SETTINGS')}
            onAdmin={() => setView('ADMIN')}
            user={user!}
            setView={setView}
            balance={balance}
            bonusBalance={bonusBalance}
            turnoverRequired={turnoverRequired}
            turnoverAchieved={turnoverAchieved}
            currency={currency}
            notifications={notifications}
            onNotificationsClick={() => setIsNotificationsOpen(true)}
            timezoneOffset={timezoneOffset}
          />
        )}
        {view === 'HELP' && (
          <HelpPage 
             onSupportClick={() => setIsChatOpen(true)}
             onHelpCenterClick={() => { setInfoPageTitle('Help Center'); setView('INFO_PAGE'); }}
             onEducationClick={() => { setInfoPageTitle('Education Hub'); setView('INFO_PAGE'); }}
             onTradingTutorialsClick={() => { setInfoPageTitle('Trading Tutorials'); setView('INFO_PAGE'); }}
             supportSettings={supportSettings}
             tutorials={tutorials}
             currencySymbol={activeAccount === 'DEMO' ? '$' : currency.symbol}
             onClose={() => setView('TRADING')}
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

      {/* --- Bottom Controls (Mobile Only) --- */}
      {view === 'TRADING' && (
        <div className="md:hidden bg-[#101114] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+8px)] z-20 border-t border-white/5 flex flex-col gap-4 relative overflow-hidden">
          {!platformSettings.isTradingEnabled && (
            <div className="absolute inset-0 z-50 bg-[#101114]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
               <h3 className="text-white font-bold text-[15px] mb-1">Trading is closed until Apr 29, 11:00</h3>
               <p className="text-gray-500 text-[10px] mb-4">
                 Explore assets available for trading — for instance, <span className="text-[#2ebd85] font-bold">Bitcoin OTC</span>
               </p>
               <button 
                 onClick={() => setIsAssetSelectorOpen(true)}
                 className="w-full h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between px-4"
               >
                 <span className="text-white font-bold text-[13px]">Enable Orders</span>
                 <Clock size={16} className="text-white/60" />
               </button>
            </div>
          )}
          {selectedAsset.isFrozen ? (
            <div className="flex items-center gap-3 text-red-500 bg-red-500/10 px-4 py-3 rounded-2xl border border-red-500/20 w-full">
              <Lock size={18} />
              <span className="font-bold text-sm">Trading closed for this asset</span>
            </div>
          ) : (
            <>
              {/* Info & Zoom Overlay View */}
              <div className="flex justify-between items-center text-[11px] text-gray-500 px-1">
                 <div className="flex items-center gap-2">
                    <span className="lowercase font-medium">Fixed Time mode</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <span className="font-medium">Profit:</span>
                    <span className="text-white font-bold">+{displayCurrencySymbol}{potentialProfit}</span>
                    <Info size={12} className="opacity-50" />
                 </div>
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-2 gap-3 mt-1">
                 {/* Duration Selector */}
                 <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center bg-[#1e1e1e] rounded-xl border border-white/5 overflow-hidden">
                       <button 
                         onClick={() => {
                            if (tradeMode === 'CLOCK') setClockOffset(Math.max(1, clockOffset - 1));
                            else setTimerDuration(Math.max(60, timerDuration - 60));
                         }}
                         className="w-10 h-11 flex items-center justify-center text-gray-400 hover:text-white active:bg-white/5 transition"
                       >
                          <Minus size={18} />
                       </button>
                       <div 
                         onClick={() => setIsTradeInputSheetOpen(true)}
                         className="flex-1 flex flex-col items-center justify-center leading-tight cursor-pointer"
                       >
                          <span className="text-white font-bold text-base">
                             {tradeMode === 'CLOCK' ? formatWithOffset(getExpirationTime(), 'HH:mm', timezoneOffset) : `${Math.floor(timerDuration / 60)} min`}
                          </span>
                       </div>
                       <button 
                         onClick={() => {
                            if (tradeMode === 'CLOCK') setClockOffset(clockOffset + 1);
                            else setTimerDuration(timerDuration + 60);
                         }}
                         className="w-10 h-11 flex items-center justify-center text-gray-400 hover:text-white active:bg-white/5 transition"
                       >
                          <Plus size={18} />
                       </button>
                    </div>
                 </div>

                 {/* Amount Selector */}
                 <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center bg-[#1e1e1e] rounded-xl border border-white/5 overflow-hidden h-11">
                       <button 
                         onClick={() => {
                            const min = currency.code === 'BDT' ? 20 : 1;
                            setInvestment(Math.max(min, Math.floor(investment / 2)));
                         }}
                         className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white active:bg-white/5 transition border-r border-white/5"
                       >
                          <Minus size={18} />
                       </button>
                       <div className="flex-1 h-full flex items-center justify-center relative">
                          <span className="absolute left-2.5 text-white/30 font-bold text-xs pointer-events-none">{currency.symbol}</span>
                          <input 
                            type="number"
                            inputMode="numeric"
                            value={investment || ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : Number(e.target.value);
                              setInvestment(val);
                            }}
                            onBlur={() => {
                              const min = currency.code === 'BDT' ? 20 : 1;
                              if (investment < min) setInvestment(min);
                            }}
                            className="w-full h-full bg-transparent text-center font-bold text-[15px] focus:outline-none text-white px-6"
                          />
                       </div>
                       <button 
                         onClick={() => setInvestment(investment * 2 || (currency.code === 'BDT' ? 20 : 1))}
                         className="w-10 h-full flex items-center justify-center text-gray-400 hover:text-white active:bg-white/5 transition border-l border-white/5"
                       >
                          <Plus size={18} />
                       </button>
                    </div>
                 </div>
              </div>

              {/* Trade Actions */}
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => handleTrade('DOWN')}
                   className="flex-1 h-[56px] bg-[#ff4d4d] rounded-2xl flex flex-col items-center justify-center gap-0 active:scale-[0.98] transition shadow-[0_4px_15px_rgba(255,77,77,0.15)]"
                 >
                    <span className="text-white font-black text-[11px] uppercase tracking-widest leading-none mb-0.5">Down</span>
                    <ArrowDown size={20} strokeWidth={3} className="text-white" />
                 </button>

                 <button 
                   onClick={() => setIsPendingOrderSheetOpen(true)}
                   className="w-12 h-12 bg-[#1e1e1e] rounded-xl flex items-center justify-center text-white/40 hover:text-white active:scale-95 transition border border-white/5 shadow-sm"
                 >
                    <Clock size={20} />
                 </button>

                 <button 
                   onClick={() => handleTrade('UP')}
                   className="flex-1 h-[56px] bg-[#22c55e] rounded-2xl flex flex-col items-center justify-center gap-0 active:scale-[0.98] transition shadow-[0_4px_15px_rgba(34,197,94,0.15)]"
                 >
                    <span className="text-white font-black text-[11px] uppercase tracking-widest leading-none mb-0.5">Up</span>
                    <ArrowUp size={20} strokeWidth={3} className="text-white" />
                 </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- Bottom Navigation (Mobile Only) --- */}
      <nav className="md:hidden bg-[#101114] border-t border-white/5 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+4px)] flex justify-between items-center">
        <NavButton 
          icon={<BarChart2 size={24} strokeWidth={view === 'TRADING' ? 3 : 2} />} 
          label="" 
          active={view === 'TRADING'} 
          onClick={() => setView('TRADING')}
        />
        <NavButton 
          icon={<ArrowUpDown size={24} strokeWidth={view === 'TRADES' ? 3 : 2} />} 
          label="" 
          count={activeTrades.length} 
          active={view === 'TRADES'}
          onClick={() => setView('TRADES')}
        />
        <NavButton 
          icon={<ShoppingBag size={24} strokeWidth={isActivitiesOpen ? 3 : 2} />} 
          label="" 
          active={isActivitiesOpen}
          onClick={() => {
            closeAllPanels();
            setIsActivitiesOpen(true);
          }}
        />
        <NavButton 
          icon={<Trophy size={24} strokeWidth={isLeaderboardOpen ? 3 : 2} />} 
          label="" 
          active={isLeaderboardOpen}
          onClick={() => {
            closeAllPanels();
            setIsLeaderboardOpen(true);
          }}
        />
        <NavButton 
          icon={<HelpCircle size={24} strokeWidth={view === 'HELP' ? 3 : 2} />} 
          label="" 
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
          setPaymentsInitialView(null);
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
        initialView={paymentsInitialView}
        platformSettings={platformSettings}
      />
      
      <ChartSettingsSheet 
        isOpen={isChartSettingsOpen} 
        onClose={() => setIsChartSettingsOpen(false)}
        currentTimeFrame={chartTimeFrame}
        isOTC={!!selectedAsset.isOTC}
        onTimeFrameChange={(tf) => {
          setChartTimeFrame(tf);
          setIsChartSettingsOpen(false);
        }}
        currentChartType={chartType}
        onChartTypeChange={(type) => {
          setIsLoading(true);
          setChartType(type);
          setTimeout(() => setIsLoading(false), 2500); // More professional loading duration
          setIsChartSettingsOpen(false);
        }}
      />

      <AnimatePresence>
        {(isAssetSelectorOpen && window.innerWidth < 768) && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100]"
          >
             <AssetSelector 
                isOpen={isAssetSelectorOpen} 
                onClose={() => setIsAssetSelectorOpen(false)} 
                onSelect={setSelectedAsset}
                setIsLoading={setIsLoading}
                currentAssetId={selectedAsset.id}
                marketAssets={marketAssets}
             />
          </motion.div>
        )}
      </AnimatePresence>

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
        timezoneOffset={timezoneOffset}
      />

      <PendingOrderSheet
        isOpen={isPendingOrderSheetOpen}
        onClose={() => setIsPendingOrderSheetOpen(false)}
        assetName={selectedAsset.name}
        currentPrice={currentPrice}
        onPlaceOrder={handlePlacePendingOrder}
      />

      <AnimatePresence>
        {isCalendarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex justify-end"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm md:hidden"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative h-full w-full md:w-[420px] bg-[#0a0b0d] shadow-2xl flex flex-col border-l border-white/5"
            >
              <EconomicCalendar onBack={() => setIsCalendarOpen(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Leaderboard Overlay --- */}
      <AnimatePresence>
        {isLeaderboardOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex md:justify-end"
          >
            {/* Backdrop Mobile */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLeaderboardOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm md:hidden"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative h-full w-full md:w-[420px] bg-[#121212] shadow-2xl flex flex-col border-l border-white/5"
            >
              <LeaderboardPage
                socket={socket}
                onBack={() => setIsLeaderboardOpen(false)} 
                currencySymbol={displayCurrencySymbol} 
                currentUser={leaderboardCurrentUser}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- WhatsNew Overlay --- */}
      <WhatsNewSheet 
        isOpen={isWhatsNewOpen}
        onClose={() => setIsWhatsNewOpen(false)}
        announcements={announcements}
        onMarkAsRead={(id) => {
          try {
            const stored = localStorage.getItem('read-announcements');
            const readList = stored ? JSON.parse(stored) : [];
            if (!readList.includes(id)) {
              const updated = [...readList, id];
              localStorage.setItem('read-announcements', JSON.stringify(updated));
              // Trigger a re-render or state update for counts if needed
              // we can update it locally, or let React trigger it because we used localStorage directly. 
              // Better approach: we'll update the announcements just slightly or store readAnnouncements in state. 
            }
          } catch(e){}
        }}
        onMarkAllRead={() => {
           const allIds = announcements.map(a => a.id);
           localStorage.setItem('read-announcements', JSON.stringify(allIds));
           // Trigger a re-render
           setAnnouncements([...announcements]); 
        }}
        onVote={(id, voteType) => {
          socket?.emit('announcement-vote', { id, voteType });
        }}
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
        timezoneOffset={timezoneOffset}
      />
    </div>
  </div>
);
}

const NotificationsSheet = ({ isOpen, onClose, notifications, socket, timezoneOffset = 0 }: { isOpen: boolean, onClose: () => void, notifications: any[], socket: any, timezoneOffset?: number }) => {
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
                          {formatWithOffset(notif.timestamp, 'HH:mm', timezoneOffset)}
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
                          {formatWithOffset(notif.timestamp, 'MMM dd, yyyy', timezoneOffset)}
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



function TradeDetailsSheet({ trade, onClose, tickHistory, currentTime, currencySymbol, exchangeRate, timezoneOffset, inSidebar = false }: { trade: Trade, onClose: () => void, tickHistory: TickData[], currentTime: number, currencySymbol: string, exchangeRate: number, timezoneOffset: number, inSidebar?: boolean }) {
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
    const endTime = trade.status === 'ACTIVE' ? currentTime : trade.endTime;
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
  }, [trade, tickHistory, currentTime]);

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

  if (inSidebar) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a]">
        <TradeDetailsContent 
          trade={trade} 
          onClose={onClose} 
          chartData={chartData} 
          currencySymbol={currencySymbol} 
          exchangeRate={exchangeRate} 
          timezoneOffset={timezoneOffset} 
          profitString={profitString} 
          profitColor={profitColor} 
          minPrice={minPrice}
          maxPrice={maxPrice}
          padding={padding}
          getCoordY={getCoordY}
          isWin={isWin}
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]"
    >
      <TradeDetailsContent 
        trade={trade} 
        onClose={onClose} 
        chartData={chartData} 
        currencySymbol={currencySymbol} 
        exchangeRate={exchangeRate} 
        timezoneOffset={timezoneOffset} 
        profitString={profitString} 
        profitColor={profitColor} 
        minPrice={minPrice}
        maxPrice={maxPrice}
        padding={padding}
        getCoordY={getCoordY}
        isWin={isWin}
      />
    </motion.div>
  );
}

function TradeDetailsContent({ 
  trade, 
  onClose, 
  chartData, 
  currencySymbol, 
  exchangeRate, 
  timezoneOffset, 
  profitString, 
  profitColor,
  minPrice,
  maxPrice,
  padding,
  getCoordY,
  isWin
}: any) {
  return (
    <>
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
          <DetailRow label="Trade opened" value={formatWithOffset(trade.startTime, 'MMM dd HH:mm:ss.SSS', timezoneOffset)} />
          <DetailRow label="Trade closed" value={formatWithOffset(trade.endTime, 'MMM dd HH:mm:ss.SSS', timezoneOffset)} />
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
    </>
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
  onCancelPendingOrder,
  timezoneOffset = 0,
  onClose,
  inSidebar = false
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
  onCancelPendingOrder: (id: number) => void,
  timezoneOffset?: number,
  onClose?: () => void,
  inSidebar?: boolean
}) {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const activeTrades = trades.filter(t => t.status === 'ACTIVE');
  const closedTrades = trades.filter(t => t.status !== 'ACTIVE').sort((a, b) => b.endTime - a.endTime);

  // Calculate today's stats for current timezone
  const now = Date.now();
  const offsetMs = (timezoneOffset || 0) * 3600000;
  const todayInTimezone = new Date(now + offsetMs);
  todayInTimezone.setUTCHours(0, 0, 0, 0);
  const todayStartUtc = todayInTimezone.getTime() - offsetMs;

  const todayClosedTrades = closedTrades.filter(t => t.endTime >= todayStartUtc);
  const totalToday = todayClosedTrades.length;
  const winsToday = todayClosedTrades.filter(t => t.status === 'WIN').length;
  const winRate = totalToday > 0 ? Math.round((winsToday / totalToday) * 100) : 0;

  return (
    <div className={cn(
      "bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex flex-col h-full",
      !inSidebar && "absolute inset-0 z-50 md:relative md:z-auto"
    )}>
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!inSidebar && (
            <button onClick={onViewAsset} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition">
               <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold">Trades</h1>
        </div>
        {inSidebar && onClose && (
          <button onClick={onClose} className="p-2 text-[var(--text-secondary)] hover:text-white transition">
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-[var(--border-color)] px-4 mb-4">
        <button className="px-4 py-2 border-b-2 border-blue-500 font-bold text-sm text-[var(--text-primary)]">Fixed Time</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-20">
        {/* Open Trades Section */}
        {activeTrades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
             <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 text-blue-500">
                 <History size={32} />
             </div>
            <p className="text-gray-400 text-sm mb-6 max-w-[200px]">No active Fixed Time trades or orders on this account</p>
            <button 
              onClick={onViewAsset}
              className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] font-bold py-4 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Explore Assets
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
             <h2 className="text-lg font-bold mb-3 flex items-center justify-between">
                <span>Open Trades</span>
                <span className="text-xs font-normal text-[var(--text-secondary)]">{activeTrades.length} Active</span>
             </h2>
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
        <div className="flex justify-between items-center mb-4 mt-8">
          <h2 className="text-lg font-bold">History</h2>
          <button 
            onClick={() => setShowHistory(true)}
            className="text-xs text-[var(--text-secondary)] flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors font-medium"
          >
            Show All <ChevronRight size={14}/>
          </button>
        </div>

        <div className="space-y-3">
          {totalToday === 0 ? (
            <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500" />
                <div>
                   <div className="text-xs text-[var(--text-secondary)] font-medium">Today's success</div>
                   <div className="text-sm font-bold">No trades closed today</div>
                </div>
            </div>
          ) : (
             <>
               {/* Daily Summary Box (Real logic for today)*/}
               <div 
                 onClick={() => setShowHistory(true)}
                 className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center gap-4 mb-4 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors group"
               >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0"
                    style={{ 
                      background: `conic-gradient(#22c55e ${winRate * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                    }}
                  >
                    <div className="absolute inset-[3px] bg-[var(--bg-secondary)] rounded-full flex items-center justify-center">
                       <span className="text-[10px] font-black text-[#22c55e]">{winRate}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                     <div className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest mb-1">Today's success</div>
                     <div className="text-sm font-bold flex flex-col">
                       <span className="text-[#22c55e]">{winsToday} of {totalToday} trades successful</span>
                       <span className="text-[10px] text-[var(--text-secondary)] font-normal">Success rate: {winRate}%</span>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
               </div>
               
               {closedTrades.slice(0, 5).map(trade => (
                 <TradeItem key={trade.id} trade={trade} onClick={() => setSelectedTrade(trade)} currencySymbol={currencySymbol} exchangeRate={exchangeRate} />
               ))}
             </>
          )}
        </div>
      </div>

      {/* Trade Details Sheet Overlay */}
      <AnimatePresence>
        {selectedTrade && (
          <TradeDetailsSheet 
            trade={selectedTrade} 
            tickHistory={tickHistory[selectedTrade.assetShortName] || []} 
            currentTime={currentTime}
            onClose={() => setSelectedTrade(null)} 
            currencySymbol={currencySymbol}
            exchangeRate={exchangeRate}
            timezoneOffset={timezoneOffset}
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
            timezoneOffset={timezoneOffset}
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

function ProfilePage({ 
  onBack, 
  onSettings, 
  user, 
  onAdmin, 
  setView, 
  balance, 
  bonusBalance,
  turnoverRequired,
  turnoverAchieved,
  currency, 
  notifications, 
  onNotificationsClick,
  timezoneOffset = 0
}: { 
  onBack: () => void, 
  onSettings: () => void, 
  user: any, 
  onAdmin: () => void, 
  setView: any,
  balance: number,
  bonusBalance: number,
  turnoverRequired: number,
  turnoverAchieved: number,
  currency: any,
  notifications: any[],
  onNotificationsClick: () => void,
  timezoneOffset?: number
}) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
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
        
        {(user.email?.toLowerCase() === 'tasmeaykhatun565@gmail.com') && (
          <button 
            onClick={onAdmin}
            className="mt-4 bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-2 rounded-full font-black text-xs flex items-center gap-2 hover:bg-red-500/20 transition uppercase tracking-widest"
          >
            <Settings size={14} /> Admin Panel
          </button>
        )}
      </div>

      {/* Balance Card */}
      <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 mb-4 border border-[var(--border-color)] relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[var(--text-secondary)] text-xs font-black uppercase tracking-widest">Live Balance</span>
          <div className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
            Real Account
          </div>
        </div>
        <div className="text-3xl font-black text-[var(--text-primary)] mb-6">
          {currency.symbol}{(balance + bonusBalance).toFixed(2)}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--bg-primary)] rounded-2xl p-3 border border-[var(--border-color)]">
            <div className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-1">Real</div>
            <div className="text-[var(--text-primary)] font-black">{currency.symbol}{balance.toFixed(2)}</div>
          </div>
          <div className="bg-[var(--bg-primary)] rounded-2xl p-3 border border-[var(--border-color)]">
            <div className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest mb-1">Bonus</div>
            <div className="text-[var(--text-primary)] font-black">{currency.symbol}{bonusBalance.toFixed(2)}</div>
          </div>
        </div>

        {turnoverRequired > 0 && (
          <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-widest">Turnover Progress</span>
              <span className="text-[var(--text-primary)] text-[10px] font-black">
                {((turnoverAchieved / turnoverRequired) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden mb-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (turnoverAchieved / turnoverRequired) * 100)}%` }}
                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              />
            </div>
            <div className="flex justify-between text-[9px] font-bold uppercase tracking-tighter">
              <span className="text-emerald-500">{currency.symbol}{turnoverAchieved.toFixed(2)} done</span>
              <span className="text-[var(--text-secondary)]">Target: {currency.symbol}{turnoverRequired.toFixed(2)}</span>
            </div>
          </div>
        )}
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
  onApplyReward,
  balance,
  trades,
  onBack
}: { 
  turnoverRequired: number,
  turnoverAchieved: number,
  userBonuses: any[],
  currencySymbol: string, 
  rewards: any[],
  onApplyReward: (code: string) => void,
  balance: number,
  trades: any[],
  onBack?: () => void
}) {
  const bonusProgress = turnoverRequired > 0 ? Math.min(100, (turnoverAchieved / turnoverRequired) * 100) : 0;
  const remainingTurnover = Math.max(0, turnoverRequired - turnoverAchieved);

  return (
    <div className="h-full w-full overflow-y-auto p-4 pb-24 bg-[var(--bg-primary)]">
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-2 -ml-2 text-[var(--text-secondary)] hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
        )}
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
        <h2 className="font-bold text-lg text-[var(--text-primary)]">My Trading Stats</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Total Trades</span>
          <div className="text-2xl font-black text-[var(--text-primary)] mt-1">{trades.length}</div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Win Rate</span>
          <div className="text-2xl font-black text-green-500 mt-1">
            {trades.length > 0 ? ((trades.filter(t => t.status === 'WIN').length / trades.length) * 100).toFixed(1) : 0}%
          </div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Wins</span>
          <div className="text-2xl font-black text-green-500 mt-1">{trades.filter(t => t.status === 'WIN').length}</div>
        </div>
        <div className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Losses</span>
          <div className="text-2xl font-black text-red-500 mt-1">{trades.filter(t => t.status === 'LOSS').length}</div>
        </div>
      </div>
    </div>
  );
}


function HelpPage({ 
  onSupportClick, 
  onHelpCenterClick, 
  onEducationClick, 
  onTradingTutorialsClick, 
  supportSettings,
  tutorials,
  currencySymbol,
  onClose 
}: { 
  onSupportClick: () => void; 
  onHelpCenterClick: () => void; 
  onEducationClick: () => void; 
  onTradingTutorialsClick: () => void; 
  supportSettings: any;
  tutorials: any[];
  currencySymbol: string;
  onClose: () => void; 
}) {
  return (
    <div className="h-full w-full flex flex-col bg-[#0b0b0d] text-white">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-10 pb-6">
        <h2 className="text-2xl font-bold text-white">Help</h2>
        <button 
          onClick={onClose} 
          className="text-white hover:text-white/70 transition p-2"
        >
          <X size={24} />
        </button>
      </div>

      <div className="px-4 grid grid-cols-2 gap-4">
        {/* Support */}
        <div 
          onClick={onSupportClick}
          className="bg-[#1c1c1e] rounded-2xl p-5 flex flex-col gap-6 cursor-pointer hover:bg-[#252528] transition active:scale-[0.98] h-[160px] justify-between"
        >
           <HelpCircle size={24} className="text-white" />
           <div className="flex flex-col gap-1">
             <span className="font-bold text-[16px] text-white">Support</span>
             <span className="text-[13px] text-gray-400 leading-tight">We're here for you<br />24/7</span>
           </div>
        </div>

        {/* Help Center */}
        <div 
          onClick={onHelpCenterClick}
          className="bg-[#1c1c1e] rounded-2xl p-5 flex flex-col gap-6 cursor-pointer hover:bg-[#252528] transition active:scale-[0.98] h-[160px] justify-between"
        >
           <Info size={24} className="text-white" />
           <div className="flex flex-col gap-1">
             <span className="font-bold text-[16px] text-white">Help Center</span>
             <span className="text-[13px] text-gray-400 leading-tight">Get to know<br />the platform</span>
           </div>
        </div>

        {/* Education */}
        <div 
          onClick={onEducationClick}
          className="bg-[#1c1c1e] rounded-2xl p-5 flex flex-col gap-6 cursor-pointer hover:bg-[#252528] transition active:scale-[0.98] h-[160px] justify-between"
        >
           <GraduationCap size={24} className="text-white" />
           <div className="flex flex-col gap-1">
             <span className="font-bold text-[16px] text-white">Education</span>
             <span className="text-[13px] text-gray-400 leading-tight">Expand your<br />knowledge</span>
           </div>
        </div>

        {/* Trading Tutorials */}
        <div 
          onClick={onTradingTutorialsClick}
          className="bg-[#1c1c1e] rounded-2xl p-5 flex flex-col gap-6 cursor-pointer hover:bg-[#252528] transition active:scale-[0.98] h-[160px] justify-between"
        >
           <BarChart2 size={24} className="text-white" />
           <div className="flex flex-col gap-1">
             <span className="font-bold text-[16px] text-white">Trading Tutorials</span>
             <span className="text-[13px] text-gray-400 leading-tight">Learn how to open<br />a trade</span>
           </div>
        </div>
      </div>
    </div>
  );
}

const DesktopSidebar = ({ 
  currentView, 
  setView, 
  activeTradesCount,
  isHistoryOpen,
  setIsHistoryOpen,
  isMarketOpen,
  setIsMarketOpen,
  isRewardsOpen,
  setIsRewardsOpen,
  isActivitiesOpen,
  setIsActivitiesOpen,
  isLeaderboardOpen,
  setIsLeaderboardOpen,
  isHelpOpen,
  setIsHelpOpen,
  isAssetSelectorOpen,
  setIsAssetSelectorOpen,
  setIsProfileOpen,
  setIsPaymentsOpen,
  setIsAccountsSheetOpen
}: { 
  currentView: string, 
  setView: any, 
  activeTradesCount: number,
  isHistoryOpen: boolean,
  setIsHistoryOpen: (v: boolean) => void,
  isMarketOpen: boolean,
  setIsMarketOpen: (v: boolean) => void,
  isRewardsOpen: boolean,
  setIsRewardsOpen: (v: boolean) => void,
  isActivitiesOpen: boolean,
  setIsActivitiesOpen: (v: boolean) => void,
  isLeaderboardOpen: boolean,
  setIsLeaderboardOpen: (v: boolean) => void,
  isHelpOpen: boolean,
  setIsHelpOpen: (v: boolean) => void,
  isAssetSelectorOpen: boolean,
  setIsAssetSelectorOpen: (v: boolean) => void,
  setIsProfileOpen: (v: boolean) => void,
  setIsPaymentsOpen: (v: boolean) => void,
  setIsAccountsSheetOpen: (v: boolean) => void
}) => {
  const { t } = useTranslation();
  
  const handleNavClick = (panelKey: string) => {
    // If not in TRADING view, switch to TRADING first
    if (currentView !== 'TRADING') {
       setView('TRADING');
    }
    
    // Close all panels first
    const closeAll = () => {
      setIsHistoryOpen(false);
      setIsMarketOpen(false);
      setIsRewardsOpen(false);
      setIsActivitiesOpen(false);
      setIsLeaderboardOpen(false);
      setIsHelpOpen(false);
      setIsAssetSelectorOpen(false);
      setIsProfileOpen(false);
      setIsPaymentsOpen(false);
      setIsAccountsSheetOpen(false);
    };

    if (panelKey === 'TERMINAL') {
      closeAll();
    } else if (panelKey === 'TRADES') {
      const target = !isHistoryOpen;
      closeAll();
      setIsHistoryOpen(target);
    } else if (panelKey === 'MARKET') {
      const target = !isActivitiesOpen;
      closeAll();
      setIsActivitiesOpen(target);
    } else if (panelKey === 'LEADERBOARD') {
      const target = !isLeaderboardOpen;
      closeAll();
      setIsLeaderboardOpen(target);
    } else if (panelKey === 'REWARDS') {
      const target = !isRewardsOpen;
      closeAll();
      setIsRewardsOpen(target);
    } else if (panelKey === 'HELP') {
      const target = !isHelpOpen;
      closeAll();
      setIsHelpOpen(target);
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-20 border-r border-white/5 bg-[#121212] z-30 transition-all duration-300 items-center py-4">
      <div className="mb-6 w-12 h-12 flex items-center justify-center cursor-pointer active:scale-95 transition overflow-hidden rounded-full border border-white/10 shadow-lg shadow-black/80 ring-1 ring-white/5">
        <img 
          src="https://i.imghippo.com/files/Gtw3911Dmk.jpg" 
          alt="Onyx Elite Logo" 
          className="w-[120%] h-[120%] object-cover contrast-110 brightness-110"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex flex-col gap-2 flex-1 w-full px-2">
        <SidebarNavButton 
          icon={<ArrowUpDown size={20} />} 
          label={t('nav.trades')} 
          active={isHistoryOpen} 
          onClick={() => handleNavClick('TRADES')} 
          count={activeTradesCount} 
        />
        <SidebarNavButton 
          icon={<ShoppingBag size={20} />} 
          label="Market" 
          active={isActivitiesOpen} 
          onClick={() => handleNavClick('MARKET')} 
        />
        <SidebarNavButton 
          icon={<Trophy size={20} />} 
          label={t('nav.rewards')} 
          active={isRewardsOpen} 
          onClick={() => handleNavClick('REWARDS')} 
        />
        <SidebarNavButton 
          icon={<HelpCircle size={20} />} 
          label={t('nav.help')} 
          active={isHelpOpen} 
          onClick={() => handleNavClick('HELP')} 
        />
      </div>
      
      <div className="mt-auto pt-4 w-full flex flex-col items-center gap-1 text-[10px] text-white/40 font-mono">
        <span className="font-bold text-white">3788</span>
        <span>online</span>
      </div>
    </aside>
  );
};

const SidebarNavButton = ({ icon, label, active, onClick, count }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, count?: number }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center py-3 rounded-xl transition-all w-full select-none",
        active ? "text-white" : "text-white/40 hover:text-white/80 hover:bg-white/5"
      )}
    >
      <div className="relative mb-1">
        {icon}
        {count && count > 0 ? (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
            {count}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
      )}
    </button>
  );
};

// ... existing DesktopTradePanel ...
const PaymentsSidePanel = ({ onClose, ...props }: any) => {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] p-4 overflow-y-auto z-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Payments</h2>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
          <X size={20} />
        </button>
      </div>
      <PaymentsSheet {...props} onClose={onClose} />
    </aside>
  );
};

const HistorySidePanel = ({ onClose, trades, pendingOrders, currencySymbol, exchangeRate, onCancelPendingOrder, timezoneOffset, ...props }: any) => {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] overflow-y-auto z-20 scrollbar-hide">
      <TradesPage 
        trades={trades}
        pendingOrders={pendingOrders}
        currencySymbol={currencySymbol}
        exchangeRate={exchangeRate}
        onCancelPendingOrder={onCancelPendingOrder}
        timezoneOffset={timezoneOffset}
        onClose={onClose}
        inSidebar={true}
        onViewAsset={onClose}
        {...props}
      />
    </aside>
  );
};

const AssetSidePanel = ({ onClose, onSelect, setIsLoading, currentAssetId, marketAssets }: any) => {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] z-20 overflow-hidden">
      <AssetSelector 
        isOpen={true} 
        onClose={onClose} 
        onSelect={onSelect}
        setIsLoading={setIsLoading}
        currentAssetId={currentAssetId}
        marketAssets={marketAssets}
      />
    </aside>
  );
};

const MarketSidePanel = ({ onClose }: any) => {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] p-4 overflow-y-auto z-20 scrollbar-hide">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Market</h2>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
          <X size={20} />
        </button>
      </div>
      <MarketPage />
    </aside>
  );
};

const AccountsSidePanel = ({ accounts, activeAccount, onSelectAccount, onClose, onAddAccount, onDeposit, onWithdraw, onSetDemoBalance, currentDemoBalance }: any) => {
  const [isEditingDemo, setIsEditingDemo] = useState(false);
  const [editAmount, setEditAmount] = useState(currentDemoBalance !== undefined ? currentDemoBalance.toString() : '10000');
  
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-[var(--border-color)] bg-[var(--bg-primary)] p-4 overflow-y-auto z-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Accounts</h2>
        <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-white">
          <X size={20} />
        </button>
      </div>

       <div className="space-y-2">
          {accounts.map((account: any) => {
              const isActive = activeAccount === account.id;
              return (
                  <div 
                    key={account.id} 
                    className={cn(
                        "rounded-[16px] flex flex-col transition-colors",
                        isActive ? "bg-[#252a30] p-4 border border-white/5" : "bg-transparent p-4 hover:bg-[var(--bg-secondary)] cursor-pointer"
                    )}
                    onClick={() => !isActive && onSelectAccount(account.id)}
                  >
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs relative overflow-hidden" 
                               style={{ backgroundColor: account.type === 'DEMO' ? '#d97706' : '#059669' }}
                             >
                                 {account.type === 'DEMO' ? (
                                    <span className="font-black text-white text-sm">Đ</span>
                                 ) : account.currency === 'BDT' ? (
                                    <div className="w-full h-full bg-[#059669] flex items-center justify-center relative">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                    </div>
                                 ) : account.currency === 'USDT' || account.currency === 'USD' ? (
                                    <span className="font-bold text-white text-[12px]">T</span>
                                 ) : (
                                    <span className="font-bold text-white text-[12px]">{account.symbol}</span>
                                 )}
                                 
                                 {isActive && (
                                     <div className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 translate-x-[2px] -translate-y-[2px] border-[2px] border-[#252a30]" />
                                 )}
                             </div>
                             <div className="flex flex-col">
                                 <span className="text-sm font-medium text-[var(--text-primary)]">
                                    {account.name}
                                 </span>
                                 <span className="text-sm font-medium text-[var(--text-primary)]">
                                     {account.id === 'DEMO' ? 'Đ' : account.symbol}
                                     {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </span>
                             </div>
                         </div>
                         {isActive ? (
                             <button className="text-[var(--text-secondary)] hover:text-white p-1">
                                 <MoreVertical size={16} />
                             </button>
                         ) : (
                             <div />
                         )}
                     </div>
                     {isActive && (
                         <div className="flex gap-2 mt-4">
                            {account.id === 'DEMO' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditAmount(account.balance.toString());
                                    setIsEditingDemo(true);
                                  }}
                                  className="flex-1 bg-white/10 text-white py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                  Edit Balance
                                </button>
                            ) : (
                                <>
                                  <button onClick={onWithdraw} className="flex-1 bg-white/10 text-white py-2 rounded-xl text-xs font-bold hover:bg-white/20 transition-colors">
                                      Withdraw
                                  </button>
                                  <button onClick={onDeposit} className="flex-1 bg-[#22c55e] text-black py-2 rounded-xl text-xs font-bold hover:bg-[#1ea851] transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                      Deposit
                                  </button>
                                </>
                            )}
                         </div>
                     )}
                  </div>
              );
          })}
       </div>

       <button onClick={onAddAccount} className="flex items-center gap-2 mt-6 text-[var(--text-primary)] hover:text-[#22c55e] transition text-sm font-bold pl-4">
           <Plus size={16} /> Add Account
       </button>
       
      <AnimatePresence>
        {isEditingDemo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsEditingDemo(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-2xl"
            >
              <div className="p-5 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Set Demo Balance</h3>
                  <button onClick={() => setIsEditingDemo(false)} className="text-[var(--text-secondary)] hover:text-white transition">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">New Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 shadow outline-none top-1/2 -translate-y-1/2 text-white/50 cursor-default">$</span>
                      <input 
                        type="number" 
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:border-blue-500 focus:outline-none transition"
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      const amount = parseFloat(editAmount);
                      if (!isNaN(amount) && amount >= 0) {
                        onSetDemoBalance && onSetDemoBalance(amount);
                        setIsEditingDemo(false);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl transition active:scale-[0.98] shadow-lg shadow-blue-500/20"
                  >
                    Save Balance
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
};

const ProfileSidePanel = ({ user, balance, bonusBalance, currency, onSettings, onAdmin, notifications, onNotificationsClick, turnoverRequired, turnoverAchieved, onClose, setView }: any) => {
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <aside className="hidden md:flex flex-col w-[360px] border-r border-[#2a2b30] bg-[#121212] p-6 overflow-y-auto z-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold tracking-tight">Profile</h2>
        <div className="flex items-center gap-3">
          <button onClick={onNotificationsClick} className="p-2 -mr-2 text-gray-400 relative hover:text-white transition">
             <Bell size={20} />
             {unreadCount > 0 && (
               <div className="absolute top-1 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-[#121212] flex items-center justify-center text-[9px] font-black text-white">
                 {unreadCount}
               </div>
             )}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Profile Info */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-[#1b1c21] flex items-center justify-center border border-white/10 overflow-hidden shadow-xl">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={24} className="text-gray-400" />
            )}
          </div>
        </div>
        <div className="flex flex-col">
           <h1 className="text-[17px] font-bold mb-0.5 tracking-tight">{user.displayName || user.email?.split('@')[0]}</h1>
           <div className="flex items-center gap-2 text-gray-500 text-[13px] font-medium tracking-wide">
             <span>{user.email}</span>
           </div>
           {(user.email?.toLowerCase() === 'tasmeaykhatun565@gmail.com') && (
             <button 
               onClick={onAdmin}
               className="mt-2 w-fit bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-md font-bold text-[10px] flex items-center gap-1.5 hover:bg-red-500/20 transition uppercase tracking-widest"
             >
               <Settings size={12} /> Admin Panel
             </button>
           )}
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-[#1b1c21] rounded-2xl p-5 mb-5 border border-white/5 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">Live Balance</span>
          <div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded font-bold text-[10px] uppercase tracking-wider border border-emerald-500/20">
            Real Account
          </div>
        </div>
        <div className="text-3xl font-black text-white mb-6 tabular-nums tracking-tight">
          {currency.symbol}{(balance + bonusBalance).toFixed(2)}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#121212] rounded-xl p-3 border border-white/5">
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Real</div>
            <div className="text-white font-bold text-sm tracking-wide">{currency.symbol}{balance.toFixed(2)}</div>
          </div>
          <div className="bg-[#121212] rounded-xl p-3 border border-white/5">
            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Bonus</div>
            <div className="text-white font-bold text-sm tracking-wide">{currency.symbol}{bonusBalance.toFixed(2)}</div>
          </div>
        </div>

        {turnoverRequired > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5 relative z-10">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Turnover Progress</span>
              <span className="text-emerald-400 text-[11px] font-bold tracking-wide">
                {((turnoverAchieved / Math.max(1, turnoverRequired)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-[#121212] rounded-full overflow-hidden mb-2.5 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (turnoverAchieved / Math.max(1, turnoverRequired)) * 100)}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold tracking-wide">
              <span className="text-emerald-500/80">{currency.symbol}{turnoverAchieved.toFixed(2)} done</span>
              <span className="text-gray-500">Target: {currency.symbol}{turnoverRequired.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
        <button 
          onClick={() => { onClose(); if (setView) setView('REWARDS'); }}
          className="bg-[#1b1c21] rounded-2xl p-4 flex flex-col items-start gap-4 border border-white/5 hover:bg-[#25262c] transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-transform group-hover:scale-105 bg-emerald-500/10 text-emerald-500">
            <Gift size={18} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Bonuses</span>
        </button>
        <button 
          onClick={() => { onClose(); if (setView) setView('REFERRAL'); }}
          className="bg-[#1b1c21] rounded-2xl p-4 flex flex-col items-start gap-4 border border-white/5 hover:bg-[#25262c] transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-transform group-hover:scale-105 bg-indigo-500/10 text-indigo-500">
            <Users size={18} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-300">Referrals</span>
        </button>
      </div>

      <button onClick={onSettings} className="w-full bg-[#1b1c21] rounded-xl p-3.5 flex items-center justify-center gap-2.5 font-bold border border-white/5 hover:bg-[#25262c] transition text-sm tracking-wide shadow-sm">
        <Settings size={16} className="text-gray-400" />
        <span>Settings</span>
      </button>
    </aside>
  );
};

const DesktopTradePanel = ({ 
  investment, setInvestment, currency, tradeMode, setTradeMode, timerDuration, setTimerDuration, clockOffset, setClockOffset, getExpirationTime, timezoneOffset, handleTrade, potentialProfit, displayCurrencySymbol, setIsPendingOrderSheetOpen, selectedAsset, isFrozen, isAssetSelectorOpen, setIsAssetSelectorOpen, closeAllPanels, isTradingEnabled
}: any) => {
  return (
    <aside className="hidden md:flex flex-col w-72 border-l border-white/5 bg-[#121212] p-4 overflow-y-auto scrollbar-hide z-20 relative">
      {!isTradingEnabled && (
        <div className="absolute inset-0 z-50 bg-[#121212]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
           <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
              <Lock size={32} className="text-white/40" />
           </div>
           <h3 className="text-white font-bold text-lg mb-2">Trading is closed</h3>
           <p className="text-gray-500 text-xs mb-8 leading-relaxed">
             The market is currently closed for maintenance or scheduled break. 
             You can explore assets available for trading in the menu.
           </p>
           <button 
             onClick={() => setIsAssetSelectorOpen(true)}
             className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-bold text-[13px] rounded-xl border border-white/10 transition flex items-center justify-center gap-2"
           >
             <span>Explore Assets</span>
             <ChevronRight size={16} />
           </button>
        </div>
      )}
      <div className="space-y-4">
        {/* Amount Section */}
        <div className="space-y-2">
           <div className="bg-[#1b1c21] border border-white/5 rounded-xl p-3 flex flex-col group focus-within:border-emerald-500/50 transition-colors">
             <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Investment Amount</div>
             <div className="flex items-center gap-2">
               <span className="text-white/30 font-bold text-lg">{displayCurrencySymbol}</span>
               <input 
                 type="number" 
                 inputMode="numeric"
                 value={investment || ''} 
                 onChange={e => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    setInvestment(val);
                 }}
                 onBlur={() => {
                    const min = currency.code === 'BDT' ? 20 : 1;
                    if (investment < min) setInvestment(min);
                 }}
                 className="w-full bg-transparent text-left font-black text-xl focus:outline-none min-w-0 text-white placeholder:text-white/10"
                 placeholder="0.00"
               />
             </div>
           </div>
           <div className="flex items-center gap-2">
             <button 
               onClick={() => {
                  const min = currency.code === 'BDT' ? 20 : 1;
                  setInvestment(Math.max(min, Math.floor(investment - 10)));
               }}
               className="flex-1 h-10 bg-[#1b1c21] hover:bg-[#25262c] text-white/50 hover:text-white rounded-xl flex items-center justify-center transition border border-white/5 active:scale-95 shadow-sm"
             >
               <Minus size={18} strokeWidth={2.5} />
             </button>
             <button 
               onClick={() => setInvestment((investment || 0) + 10)}
               className="flex-1 h-10 bg-[#1b1c21] hover:bg-[#25262c] text-white/50 hover:text-white rounded-xl flex items-center justify-center transition border border-white/5 active:scale-95 shadow-sm"
             >
               <Plus size={18} strokeWidth={2.5} />
             </button>
           </div>
        </div>

        {/* Duration Section */}
        <div className="space-y-2">
           <div className="bg-[#1b1c21] rounded-lg p-3 cursor-pointer">
             <div className="text-[11px] text-gray-400 font-medium tracking-wide mb-1">Duration</div>
             <div className="flex items-baseline gap-3 text-white">
                <span className="font-bold text-lg">
                  {tradeMode === 'CLOCK' ? formatWithOffset(getExpirationTime(), 'HH:mm', timezoneOffset) : `${Math.floor(timerDuration / 60)} min`}
                </span>
                {tradeMode === 'CLOCK' && (
                  <span className="text-[11px] text-gray-500 font-medium">{formatWithOffset(getExpirationTime(), 'MM/dd', timezoneOffset)}</span>
                )}
             </div>
           </div>
           <div className="flex items-center gap-2">
             <button 
               onClick={() => tradeMode === 'CLOCK' ? setClockOffset(Math.max(1, clockOffset - 1)) : setTimerDuration(Math.max(60, timerDuration - 60))}
               className="flex-1 h-8 bg-[#1b1c21] hover:bg-[#25262c] text-white/60 hover:text-white rounded-lg flex items-center justify-center transition"
             >
               <Minus size={16} />
             </button>
             <button 
               onClick={() => tradeMode === 'CLOCK' ? setClockOffset(clockOffset + 1) : setTimerDuration(timerDuration + 60)}
               className="flex-1 h-8 bg-[#1b1c21] hover:bg-[#25262c] text-white/60 hover:text-white rounded-lg flex items-center justify-center transition"
             >
               <Plus size={16} />
             </button>
           </div>
        </div>

        {/* Pending Order / Mode Switch */}
        <div className="pt-2">
          <button 
            onClick={() => setIsPendingOrderSheetOpen(true)}
            className="w-full h-12 bg-[#1b1c21] hover:bg-[#25262c] rounded-lg flex items-center justify-between px-4 transition active:scale-[0.98]"
          >
            <span className="text-[13px] font-bold text-white">Enable Orders</span>
            <Clock size={16} className="text-white/60" />
          </button>
        </div>

        <div className="flex flex-col gap-1 pt-1">
           <button 
             disabled={isFrozen}
             onClick={() => handleTrade('UP')}
             className="w-full h-12 bg-[#2ebd85] hover:bg-[#2ebd85]/90 active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition rounded-lg flex items-center justify-between px-4 text-[#121212]"
           >
              <span className="text-[14px] font-bold">Up</span>
              <ArrowUp size={20} strokeWidth={2.5} />
           </button>

           <button 
             disabled={isFrozen}
             onClick={() => handleTrade('DOWN')}
             className="w-full h-12 bg-[#ff5e5e] hover:bg-[#ff5e5e]/90 active:scale-[0.98] disabled:opacity-50 disabled:grayscale transition rounded-lg flex items-center justify-between px-4 text-[#121212]"
           >
              <span className="text-[14px] font-bold">Down</span>
              <ArrowDown size={20} strokeWidth={2.5} />
           </button>
        </div>

        {/* Profit display */}
        <div className="pt-2">
           <div className="flex justify-center items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-medium">Profit:</span>
              <span className="text-gray-300 font-medium">+{displayCurrencySymbol}{potentialProfit}</span>
              <HelpCircle size={12} className="text-gray-500" />
           </div>
        </div>
      </div>
    </aside>
  );
};


