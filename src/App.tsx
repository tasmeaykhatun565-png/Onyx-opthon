import { IndicatorConfig } from './types';
import { DRAWING_TOOLS, TIME_FRAMES, CHART_TYPES, INDICATORS_LIST, DESKTOP_TOOLS_LIST } from './constants';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ResponsiveContainer, LineChart, AreaChart, Area, Line, ReferenceLine, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { AdminPanel } from './AdminPanel';
import { 
  ArrowUp, ArrowDown, Wallet, History, Settings, Bell, Menu, X, 
  User, ChevronDown, ChevronUp, Signal, BarChart2, BarChart, HelpCircle, AlertCircle, 
  Briefcase, Gift, LayoutGrid, Plus, Minus, Divide, Clock, Percent,
  ChevronLeft, Copy, Box, Link as LinkIcon, CalendarDays, ChevronRight,
  Shuffle, Target, ChevronsUp, GraduationCap, MessageCircle, MessageSquare, BookOpen,
  Trophy, ShoppingBag, ArrowUpDown, Mail, UserCheck, Key, Shield, ShieldCheck, Zap, Check, Grid, Image, Activity, LogOut, Camera, Calendar,
  Search, Info, AlignLeft, Star, MoreVertical, Lock, Video, FileText, Phone, Youtube, Globe, Send, Bitcoin, Gem, TrendingUp, RefreshCw, Users, Newspaper, BadgeCheck,
  Coins, Droplets, Flame, Pencil, PencilLine, CandlestickChart, Radio, Compass, Headphones, ArrowRight, Layers, Twitter, Facebook, Instagram, Download, Smartphone, Apple, PlayCircle, DollarSign
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
import EmailVerificationSheet from './EmailVerificationSheet';
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

import { ReferralPage } from './ReferralPage';
import { LeaderboardPage } from './LeaderboardPage';
import WhatsNewSheet from './WhatsNewSheet';
import IndicatorSheet from './IndicatorSheet';
import ServiceAgreementSheet from './ServiceAgreementSheet';
import LanguageSheet from './LanguageSheet';
import AppearanceSheet from './AppearanceSheet';
import CurrencySheet from './CurrencySheet';
import TradingPlatformSheet from './TradingPlatformSheet';
import ActivitiesSheet from './ActivitiesSheet';
import { EconomicCalendar } from './EconomicCalendar';
import TournamentsPage from './TournamentsPage';
import OnboardingModal from './OnboardingModal';
import PendingOrderSheet from './PendingOrderSheet';
import PaymentOrderPage from './PaymentOrderPage';

import { io, Socket } from 'socket.io-client';
import { ToastProvider, useToast } from './Toast';
import { useTranslation } from './i18n';
import { useTheme } from './ThemeContext';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';

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
  currency?: string;
  currencySymbol?: string;
  exchangeRate?: number;
  profit?: number;
  asset: string;
  assetShortName: string;
  assetFlag: string;
  assetCategory: 'Crypto' | 'Forex' | 'Stocks' | 'Commodities';
  tradeMode?: 'TIMER' | 'CLOCK';
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
  isRealMarket?: boolean;
  precision?: number;
  liveTargetPrice?: number;
  lastRealUpdate?: number;
  priceSource?: string;
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
// --- Components ---
const LoadingOverlay = ({ message }: { message?: string }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-bg-primary flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-6"
      >
        <div className="relative flex items-center justify-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-border-color border-t-[var(--color-accent-color)]"
          />
        </div>
        {message && (
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-text-secondary text-sm font-medium tracking-widest uppercase mt-4"
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
};

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
  { id: 'cad_jpy_otc', name: 'CAD/JPY OTC', shortName: 'CAD/JPY OTC', payout: 92, category: 'Forex', flag: '🇨🇦🇯🇵', basePrice: 112.50, volatility: 0.012, isOTC: true },
  { id: 'chf_jpy_otc', name: 'CHF/JPY OTC', shortName: 'CHF/JPY OTC', payout: 92, category: 'Forex', flag: '🇨🇭🇯🇵', basePrice: 171.50, volatility: 0.012, isOTC: true },
  { id: 'gbp_aud_otc', name: 'GBP/AUD OTC', shortName: 'GBP/AUD OTC', payout: 92, category: 'Forex', flag: '🇬🇧🇦🇺', basePrice: 1.8950, volatility: 0.00015, isOTC: true },
  { id: 'gbp_nzd_otc', name: 'GBP/NZD OTC', shortName: 'GBP/NZD OTC', payout: 92, category: 'Forex', flag: '🇬🇧🇳🇿', basePrice: 2.0750, volatility: 0.00015, isOTC: true },
  { id: 'aud_nzd_otc', name: 'AUD/NZD OTC', shortName: 'AUD/NZD OTC', payout: 92, category: 'Forex', flag: '🇦🇺🇳🇿', basePrice: 1.0950, volatility: 0.0001, isOTC: true },
  { id: 'usd_try_otc', name: 'USD/TRY OTC', shortName: 'USD/TRY OTC', payout: 90, category: 'Forex', flag: '🇺🇸🇹🇷', basePrice: 32.50, volatility: 0.005, isOTC: true },
  { id: 'usd_brl_otc', name: 'USD/BRL OTC', shortName: 'USD/BRL OTC', payout: 90, category: 'Forex', flag: '🇺🇸🇧🇷', basePrice: 5.15, volatility: 0.0008, isOTC: true },
  { id: 'latam_index_otc', name: 'LATAM INDEX OTC', shortName: 'LATAM INDEX', payout: 93, category: 'Stocks', flag: '🌎', basePrice: 3200, volatility: 2.5, isOTC: true },
  { id: 'asia_index_otc', name: 'ASIA INDEX OTC', shortName: 'ASIA INDEX', payout: 93, category: 'Stocks', flag: '🌏', basePrice: 1800, volatility: 1.5, isOTC: true },
  { id: 'europe_index_otc', name: 'EUROPE INDEX OTC', shortName: 'EUROPE INDEX', payout: 93, category: 'Stocks', flag: '🌍', basePrice: 4500, volatility: 1.2, isOTC: true },
  { id: 'commodity_index_otc', name: 'COMMODITIES INDEX OTC', shortName: 'COMMODITY', payout: 93, category: 'Commodities', flag: '🏗️', basePrice: 950, volatility: 0.8, isOTC: true },
  
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
  { id: 'eur_usd', name: 'EUR/USD', shortName: 'EUR/USD', payout: 85, category: 'Forex', flag: '🇪🇺🇺🇸', basePrice: 1.08, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'gbp_usd', name: 'GBP/USD', shortName: 'GBP/USD', payout: 85, category: 'Forex', flag: '🇬🇧🇺🇸', basePrice: 1.25, volatility: 0.00018, isOTC: false, precision: 5 },
  { id: 'usd_jpy', name: 'USD/JPY', shortName: 'USD/JPY', payout: 85, category: 'Forex', flag: '🇺🇸🇯🇵', basePrice: 155, volatility: 0.02, isOTC: false, precision: 3 },
  { id: 'usd_cad', name: 'USD/CAD', shortName: 'USD/CAD', payout: 85, category: 'Forex', flag: '🇺🇸🇨🇦', basePrice: 1.35, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'gbp_jpy', name: 'GBP/JPY', shortName: 'GBP/JPY', payout: 85, category: 'Forex', flag: '🇬🇧🇯🇵', basePrice: 195.5, volatility: 0.025, isOTC: false, precision: 3 },
  { id: 'eur_jpy', name: 'EUR/JPY', shortName: 'EUR/JPY', payout: 85, category: 'Forex', flag: '🇪🇺🇯🇵', basePrice: 168.0, volatility: 0.02, isOTC: false, precision: 3 },
  { id: 'aud_jpy', name: 'AUD/JPY', shortName: 'AUD/JPY', payout: 82, category: 'Forex', flag: '🇦🇺🇯🇵', basePrice: 101.5, volatility: 0.02, isOTC: false, precision: 3 },
  { id: 'aud_usd', name: 'AUD/USD', shortName: 'AUD/USD', payout: 85, category: 'Forex', flag: '🇦🇺🇺🇸', basePrice: 0.66, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'nzd_usd', name: 'NZD/USD', shortName: 'NZD/USD', payout: 85, category: 'Forex', flag: '🇳🇿🇺🇸', basePrice: 0.60, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'usd_chf', name: 'USD/CHF', shortName: 'USD/CHF', payout: 85, category: 'Forex', flag: '🇺🇸🇨🇭', basePrice: 0.90, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'eur_gbp', name: 'EUR/GBP', shortName: 'EUR/GBP', payout: 85, category: 'Forex', flag: '🇪🇺🇬🇧', basePrice: 0.86, volatility: 0.0001, isOTC: false, precision: 5 },
  { id: 'eur_aud', name: 'EUR/AUD', shortName: 'EUR/AUD', payout: 85, category: 'Forex', flag: '🇪🇺🇦🇺', basePrice: 1.63, volatility: 0.0002, isOTC: false, precision: 5 },
  { id: 'eur_cad', name: 'EUR/CAD', shortName: 'EUR/CAD', payout: 85, category: 'Forex', flag: '🇪🇺🇨🇦', basePrice: 1.47, volatility: 0.0002, isOTC: false, precision: 5 },
  { id: 'gbp_cad', name: 'GBP/CAD', shortName: 'GBP/CAD', payout: 85, category: 'Forex', flag: '🇬🇧🇨🇦', basePrice: 1.71, volatility: 0.0002, isOTC: false, precision: 5 },
  { id: 'aud_cad', name: 'AUD/CAD', shortName: 'AUD/CAD', payout: 85, category: 'Forex', flag: '🇦🇺🇨🇦', basePrice: 0.90, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'nzd_jpy', name: 'NZD/JPY', shortName: 'NZD/JPY', payout: 85, category: 'Forex', flag: '🇳🇿🇯🇵', basePrice: 93.5, volatility: 0.015, isOTC: false, precision: 3 },
  { id: 'chf_jpy', name: 'CHF/JPY', shortName: 'CHF/JPY', payout: 85, category: 'Forex', flag: '🇨🇭🇯🇵', basePrice: 171.5, volatility: 0.015, isOTC: false, precision: 3 },
  { id: 'cad_jpy', name: 'CAD/JPY', shortName: 'CAD/JPY', payout: 85, category: 'Forex', flag: '🇨🇦🇯🇵', basePrice: 112.5, volatility: 0.015, isOTC: false, precision: 3 },
  { id: 'gbp_aud', name: 'GBP/AUD', shortName: 'GBP/AUD', payout: 85, category: 'Forex', flag: '🇬🇧🇦🇺', basePrice: 1.89, volatility: 0.0002, isOTC: false, precision: 5 },
  { id: 'gbp_nzd', name: 'GBP/NZD', shortName: 'GBP/NZD', payout: 85, category: 'Forex', flag: '🇬🇧🇳🇿', basePrice: 2.07, volatility: 0.0002, isOTC: false, precision: 5 },
  { id: 'aud_nzd', name: 'AUD/NZD', shortName: 'AUD/NZD', payout: 85, category: 'Forex', flag: '🇦🇺🇳🇿', basePrice: 1.09, volatility: 0.00015, isOTC: false, precision: 5 },
  { id: 'gold', name: 'Gold', shortName: 'GOLD', payout: 85, category: 'Commodities', flag: '🟡', basePrice: 2300, volatility: 2.0, isOTC: false, precision: 2 },
  { id: 'silver', name: 'Silver', shortName: 'SILVER', payout: 88, category: 'Commodities', flag: '💍', basePrice: 28.0, volatility: 0.05, isOTC: false, precision: 3 },
  { id: 'oil', name: 'WTI Crude Oil', shortName: 'OIL', payout: 80, category: 'Commodities', flag: '🛢️', basePrice: 80, volatility: 0.5, isOTC: false, precision: 2 },
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
      <div className={cn("rounded-full bg-white flex items-center justify-center border border-border-color shadow-sm overflow-hidden", containerSize)}>
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
    <div className={cn("rounded-full bg-bg-tertiary flex items-center justify-center border border-border-color shadow-sm", containerSize, fontSize)}>
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
  
  const filteredAssets = ASSETS.filter(asset => {
    const dynamicAsset = marketAssets[asset.shortName];
    if (dynamicAsset && dynamicAsset.isVisible === false) return false;

    const cleanQuery = searchQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanQuery) {
      const cleanName = asset.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanShortName = asset.shortName.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanName.includes(cleanQuery) || cleanShortName.includes(cleanQuery);
    }

    // Filtering by active tab (roughly mapping categories to tabs)
    if (activeTab === 'Fixed Time' && asset.category !== 'Crypto' && asset.category !== 'Forex' && asset.category !== 'Stocks' && asset.category !== 'Commodities') return false; 
    // In many platforms, "Fixed Time" includes many categories but with a fixed expiration
    // For simplicity, we'll show based on category for other tabs
    if (activeTab === 'Forex' && asset.category !== 'Forex') return false;
    if (activeTab === 'Stocks' && asset.category !== 'Stocks') return false;
    if (activeTab === 'Crypto' && asset.category !== 'Crypto') return false;

    return true;
  }).sort((a, b) => {
    const payoutA = marketAssets[a.shortName]?.payout || a.payout;
    const payoutB = marketAssets[b.shortName]?.payout || b.payout;
    return payoutB - payoutA; // Higher payout first
  });

  if (!isOpen) return null;

  return (
    <div className="w-full h-full bg-bg-primary font-sans flex flex-col text-text-primary">
       {/* Header */}
       <div className="flex items-center justify-between px-6 pt-6 pb-4">
         <h2 className="text-[28px] font-bold">Assets</h2>
         <button onClick={onClose} className="text-gray-400 hover:text-text-primary transition p-1">
            <X size={28} strokeWidth={2.5} />
         </button>
       </div>

       {/* Tabs */}
       <div className="flex items-center px-6 border-b border-border-color mb-4">
           {['Fixed Time', 'Forex', 'Stocks'].map(tab => (
               <button
                 key={tab}
                 onClick={() => setActiveTab(tab)}
                 className={cn(
                     "px-0 py-3 mr-8 text-[15px] font-bold whitespace-nowrap transition relative",
                     activeTab === tab 
                         ? "text-text-primary" 
                         : "text-gray-500 hover:text-gray-300"
                 )}
               >
                 {tab}
                 {activeTab === tab && (
                   <motion.div 
                     layoutId="asset-tab-indicator"
                     className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-color rounded-full"
                   />
                 )}
               </button>
           ))}
       </div>

       {/* Search Bar */}
       <div className="px-6 mb-4">
         <div className="relative group">
            <input 
                type="text" 
                placeholder="Search" 
                className="w-full bg-bg-secondary text-text-primary pl-4 pr-10 py-3 rounded-xl border border-border-color focus:outline-none focus:border-accent-color transition placeholder:text-gray-600 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-text-secondary transition" size={20} />
         </div>
       </div>

       {/* Filters */}
       <div className="flex items-center px-6 gap-2 mb-6">
          <button className="flex items-center gap-2 bg-bg-secondary px-4 py-2 rounded-xl border border-border-color text-[13px] font-bold text-text-secondary hover:bg-bg-tertiary transition">
            <AlignLeft size={16} className="text-text-secondary/40" />
            Profitability
            <ChevronDown size={16} className="text-text-secondary/40" />
          </button>
          <button className="bg-bg-secondary px-4 py-2 rounded-xl border border-border-color text-[13px] font-bold text-text-secondary hover:bg-bg-tertiary transition">
            Favorites
          </button>
          <button className="flex items-center gap-2 bg-bg-secondary px-4 py-2 rounded-xl border border-border-color text-[13px] font-bold text-text-secondary hover:bg-bg-tertiary transition">
            Any profitability
            <ChevronDown size={14} className="text-text-secondary/40" />
          </button>
       </div>

       {/* List Header Labels */}
       <div className="px-6 flex justify-between items-center mb-2">
          <span className="text-[11px] font-bold text-text-secondary/20 uppercase tracking-widest">Name</span>
          <div className="flex items-center gap-1 cursor-help group">
            <span className="text-[11px] font-bold text-text-secondary/20 uppercase tracking-widest">Profitability</span>
            <HelpCircle size={14} className="text-text-secondary/10 group-hover:text-text-secondary/30 transition" />
          </div>
       </div>

       {/* Asset List */}
       <div className="flex-1 overflow-y-auto px-2 pb-24 space-y-0.5 custom-scrollbar">
          {filteredAssets.map(asset => {
              const dynamicAsset = marketAssets[asset.shortName];
              const isFrozen = dynamicAsset?.isFrozen;
              const payout = dynamicAsset?.payout || asset.payout;
              
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
                          "flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[var(--color-text-primary)]/[0.03] cursor-pointer transition-all active:scale-[0.98]",
                          asset.id === currentAssetId && "bg-[var(--color-text-primary)]/[0.05]",
                          isFrozen && "opacity-40 grayscale"
                      )}
                  >
                      <div className="flex items-center gap-4">
                          <div className="relative">
                              <AssetIcon 
                                  shortName={asset.shortName} 
                                  category={asset.category} 
                                  flag={asset.flag} 
                                  size="md"
                              />
                              {isFrozen && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 border border-black shadow-lg">
                                      <Lock size={8} className="text-text-primary" />
                                  </div>
                              )}
                          </div>
                          <div className="flex flex-col">
                              <span className="text-text-primary font-bold text-[15px] leading-tight">
                                {asset.name.split(' (')[0]}
                              </span>
                              {asset.name.includes('Equity') && (
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Stock Market</span>
                              )}
                              {asset.isOTC && !asset.name.toLowerCase().includes('quickler') && (
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Over-the-counter</span>
                              )}
                              {asset.name.toLowerCase().includes('quickler') && (
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">5 Second Trading</span>
                              )}
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                          <span className={cn(
                            "text-[15px] font-bold",
                            payout >= 90 ? "text-[#22c55e]" : "text-[#22c55e]/80"
                          )}>
                              {payout}%
                          </span>
                          <button className="text-gray-600 hover:text-text-primary transition p-1">
                             <Info size={18} />
                          </button>
                      </div>
                  </div>
              );
          })}
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
  const { t } = useTranslation();
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
        inSidebar ? "h-full flex flex-col w-full bg-bg-primary" : "fixed inset-0 z-[60] bg-bg-primary flex flex-col"
      )}
    >
      {!inSidebar && (
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h2 className="text-xl font-bold text-text-primary">Trades</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-text-secondary hover:text-text-primary transition">
            <X size={24} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex px-4 border-b border-border-color">
        <button 
          onClick={() => setActiveTab('CLOSED')}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition relative",
            activeTab === 'CLOSED' ? "text-[var(--color-success)]" : "text-text-secondary/40"
          )}
        >
          Closed
          {activeTab === 'CLOSED' && <motion.div layoutId="history-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-success)]" />}
        </button>
        <button 
          onClick={() => setActiveTab('PENDING')}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition relative",
            activeTab === 'PENDING' ? "text-[var(--color-success)]" : "text-text-secondary/40"
          )}
        >
          Pending
          {activeTab === 'PENDING' && <motion.div layoutId="history-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-success)]" />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {activeTab === 'CLOSED' ? (
          <>
            {totalToday > 0 && (
              <div className="bg-bg-secondary p-4 rounded-2xl border border-border-color flex items-center gap-4 mb-4 shadow-xl">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0"
                  style={{ 
                    background: `conic-gradient(var(--color-success) ${winRate * 3.6}deg, rgba(255,255,255,0.05) 0deg)`
                  }}
                >
                  <div className="absolute inset-[3px] bg-bg-secondary rounded-full flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-[var(--color-success)]">{winRate}%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] text-text-secondary/40 font-black uppercase tracking-widest mb-1">Today's Success</div>
                  <div className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <span className="text-[#22c55e]">{winsToday} Wins</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span className="text-text-secondary/60">{totalToday} {t('common.total_trades')}</span>
                  </div>
                </div>
              </div>
            )}
            
            {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <History size={48} className="text-text-secondary/10 mb-4" />
              <p className="text-text-secondary/40 text-sm">No trade history yet</p>
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
              <Clock size={48} className="text-text-secondary/10 mb-4" />
              <p className="text-text-secondary/40 text-sm">No pending orders</p>
            </div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} className="bg-bg-secondary rounded-xl p-4 border border-border-color">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-text-primary font-bold text-sm">{order.assetName}</div>
                    <div className="text-[10px] text-text-secondary/40 uppercase font-bold tracking-wider">
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
                  <div className="text-xs text-text-secondary/60">
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

      {!inSidebar && (
        <div className="p-4 border-t border-border-color bg-bg-secondary/30 backdrop-blur-md">
          <button 
            onClick={onClose}
            className="w-full bg-bg-secondary text-text-primary font-bold py-4 rounded-xl border border-border-color hover:bg-bg-tertiary transition active:scale-95 shadow-xl"
          >
            {t('common.close') || 'Close'}
          </button>
        </div>
      )}
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
  savePreferences,
  isAppearanceSheetOpen,         // Added
  isCurrencySheetOpen,
  setIsAppearanceSheetOpen,
  setIsCurrencySheetOpen,
  setIsTradingPlatformOpen
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
  savePreferences: (prefs: any) => void,
  isAppearanceSheetOpen: boolean,// Added
  isCurrencySheetOpen: boolean,
  setIsAppearanceSheetOpen: (v: boolean) => void,
  setIsCurrencySheetOpen: (v: boolean) => void,
  setIsTradingPlatformOpen: (v: boolean) => void
}) {
  const { t } = useTranslation();
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

  return (
    <div className="min-h-[100dvh] bg-bg-primary text-text-primary font-sans flex flex-col relative overflow-x-hidden">
      {/* Sheets moved here */}
      <CurrencySheet 
        isOpen={isCurrencySheetOpen}
        onClose={() => setIsCurrencySheetOpen(false)}
        currency={currency}
        setCurrency={setCurrency}
      />
      <AppearanceSheet 
        isOpen={isAppearanceSheetOpen} 
        onClose={() => setIsAppearanceSheetOpen(false)} 
      />
      <div className="flex items-center justify-between p-4 border-b border-border-color">
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-[17px] font-bold text-text-primary absolute left-1/2 -translate-x-1/2 tracking-tight">{t('nav.settings')}</h1>
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <X size={28} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-12 space-y-8 no-scrollbar pt-4">
        {/* PROFILE SECTION */}
        <section className="space-y-4">
          <h2 className="text-[14px] font-bold px-2 text-text-secondary/40 uppercase tracking-widest">{t('settings.profile')}</h2>
          <div className="space-y-2">
            <SettingsItem 
              icon={<User size={18} />} 
              label={t('settings.personal_info')} 
              onClick={() => setActiveSubPage('PERSONAL')}
            />
            <SettingsItem 
              icon={<Mail size={18} />} 
              label={t('settings.contacts')} 
              onClick={() => setActiveSubPage('CONTACTS')}
            />
            <SettingsItem 
              icon={<Smartphone size={18} />} 
              label={t('settings.2fa')} 
              subtitle={t('settings.2fa_desc')}
              onClick={() => setActiveSubPage('2FA')}
            />
            <SettingsItem 
              icon={<Key size={18} />} 
              label={t('auth.password')} 
              subtitle={t('settings.password_desc')}
              onClick={() => setActiveSubPage('PASSWORD')}
            />
          </div>
        </section>

        {/* SETUP SECTION */}
        <section className="space-y-4">
          <h2 className="text-[14px] font-bold px-2 text-text-secondary/40 uppercase tracking-widest">{t('settings.setup')}</h2>
          <div className="space-y-2">
            <SettingsItem 
              icon={<DollarSign size={18} />} 
              label={t('settings.currency') || 'Currency'} 
              subtitle={currency.code}
              onClick={() => setIsCurrencySheetOpen(true)}
            />
            <SettingsItem 
              icon={<Image size={18} />} 
              label={t('settings.appearance')} 
              subtitle={t('settings.appearance_desc')}
              onClick={() => setIsAppearanceSheetOpen(true)}
            />
            <SettingsItem 
              icon={<Activity size={18} />} 
              label={t('settings.trading_platform')} 
              subtitle={t('settings.trading_platform_desc')}
              onClick={() => setIsTradingPlatformOpen(true)}
            />
            <SettingsItem 
              icon={<Bell size={18} />} 
              label={t('settings.notifications')} 
              subtitle={t('settings.notifications_desc')}
              onClick={() => setActiveSubPage('NOTIFICATIONS')}
            />
          </div>
        </section>

        {/* LOGOUT BUTTON */}
        <div className="pt-2">
          <button 
            onClick={onLogout}
            className="w-full bg-[#ff3b30]/5 hover:bg-[#ff3b30]/10 text-[#ff3b30] font-bold py-4 rounded-[14px] flex items-center justify-center gap-2 transition active:scale-[0.98] border border-[#ff3b30]/10"
          >
            <LogOut size={18} />
            <span className="text-base uppercase tracking-wider font-black">{t('settings.logout')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Pages Overlay */}
      <AnimatePresence mode="wait">
        {activeSubPage === 'TRADING' && (
          <TradingPlatformSettings key="trading" onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === 'APPEARANCE' && (
          <AppearanceSettings 
            key="appearance"
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
          <NotificationSettings key="notifications" onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === 'PASSWORD' && (
          <PasswordSettings key="password" onBack={() => setActiveSubPage(null)} />
        )}
        {activeSubPage === '2FA' && (
          <TwoFactorSettings 
            key="2fa"
            onBack={() => setActiveSubPage(null)} 
            socket={socket}
            userEmail={user.email || ''}
          />
        )}
        {activeSubPage === 'PERSONAL' && (
          <PersonalInformationPage 
            key="personal-page"
            onBack={() => setActiveSubPage(null)} 
            user={user} 
          />
        )}
        {activeSubPage === 'CONTACTS' && (
          <ContactsPage 
            key="contacts-page"
            onBack={() => setActiveSubPage(null)} 
            user={user} 
          />
        )}
        {/* Removed Language as requested */}
      </AnimatePresence>
    </div>
  );
}

function PersonalInformationPage({ onBack, user }: { onBack: () => void, user: any }) {
  const [nickname, setNickname] = useState(() => localStorage.getItem('user-name') || user.displayName || '');
  const [dob, setDob] = useState(() => localStorage.getItem('user-dob') || '');

  return (
    <div className="fixed inset-0 z-[100] bg-bg-primary text-text-primary font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <ChevronLeft size={28} />
        </button>
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <X size={28} />
        </button>
      </div>

      <div className="px-6 flex flex-col h-full">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Personal Information</h1>

        {/* Profile Image Circle */}
        <div className="flex justify-center mb-10">
          <button className="w-32 h-32 rounded-full bg-bg-secondary flex items-center justify-center relative overflow-hidden group border border-border-color shadow-xl">
             {user?.photoURL ? (
               <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover opacity-60" />
             ) : (
               <div className="w-full h-full bg-bg-tertiary" />
             )}
             <div className="absolute inset-0 bg-bg-tertiary flex items-center justify-center group-hover:bg-bg-secondary transition">
               <Camera size={32} className="text-text-primary/80" />
             </div>
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 flex-1">
          {/* Name Field */}
          <div className="bg-bg-secondary rounded-[14px] p-1.5 px-4 flex items-center gap-4 border border-border-color">
            <div className="text-text-secondary/30"><Pencil size={20} /></div>
            <div className="flex-1 py-1">
              <label className="block text-[11px] font-medium text-text-secondary/30 uppercase tracking-wider">Name or nickname</label>
              <input 
                type="text" 
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname"
                className="w-full bg-transparent border-none text-base font-bold text-text-primary focus:ring-0 p-0 placeholder:text-text-secondary/10"
              />
            </div>
          </div>

          {/* DOB Field */}
          <div className="bg-bg-secondary rounded-[14px] p-1.5 px-4 flex items-center gap-4 border border-border-color">
            <div className="text-text-secondary/30"><Calendar size={20} /></div>
            <div className="flex-1 py-1">
              <label className="block text-[11px] font-medium text-text-secondary/30 uppercase tracking-wider">Date of birth</label>
              <input 
                type="text"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                placeholder="Not specified"
                className="w-full bg-transparent border-none text-base font-bold text-text-primary focus:ring-0 p-0 placeholder:text-text-secondary/10"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pb-10 pt-4">
          <button 
            onClick={() => {
              localStorage.setItem('user-name', nickname);
              localStorage.setItem('user-dob', dob);
              onBack();
            }}
            className="w-full bg-[#0ecb81] hover:bg-[#0da669] text-black font-black py-5 rounded-[16px] text-lg transition shadow-lg shadow-[#0ecb81]/20 active:scale-[0.98] focus:outline-none"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactsPage({ onBack, user }: { onBack: () => void, user: any }) {
  const [confirmSubPage, setConfirmSubPage] = useState<'EMAIL' | 'PHONE' | null>(null);

  return (
    <div className="fixed inset-0 z-[100] bg-bg-primary text-text-primary font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <ChevronLeft size={28} />
        </button>
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <X size={28} />
        </button>
      </div>

      <div className="px-6 flex flex-col h-full overflow-y-auto no-scrollbar">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Contacts</h1>

        {/* CONTACTS SECTION */}
        <section className="mb-8 space-y-4">
          <h2 className="text-xl font-bold text-text-primary/90">Contacts</h2>
          <div className="space-y-2">
            <button 
              onClick={() => setConfirmSubPage('EMAIL')}
              className="w-full bg-bg-secondary rounded-[14px] p-4 flex items-center justify-between border border-border-color hover:bg-bg-tertiary transition active:scale-[0.98]"
            >
              <span className="text-[15px] font-bold text-text-primary/90">{user.email || 'user@example.com'}</span>
              
              {user.emailVerified ? (
                <div className="w-5 h-5 rounded-full border border-green-500 flex items-center justify-center">
                  <Check size={12} className="text-green-500" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border border-[#ff9f0a] flex items-center justify-center">
                  <span className="text-[#ff9f0a] text-[10px] font-bold">!</span>
                </div>
              )}
            </button>
            <button 
              onClick={() => setConfirmSubPage('PHONE')}
              className="w-full bg-bg-secondary rounded-[14px] p-4 flex items-center justify-between border border-border-color hover:bg-bg-tertiary transition active:scale-[0.98]"
            >
              <span className="text-[15px] font-bold text-text-secondary/40">Phone number</span>
              <div className="w-5 h-5 rounded-full border border-[#ff9f0a] flex items-center justify-center">
                <span className="text-[#ff9f0a] text-[10px] font-bold">!</span>
              </div>
            </button>
          </div>
        </section>

        {/* SOCIAL SECTION */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary/90">Social</h2>
          <div className="space-y-2">
            <SocialConnectButton icon={<Apple size={20} />} label="Connect Apple" />
            <SocialConnectButton icon={<Facebook size={20} className="fill-blue-600 text-blue-600" />} label="Connect Facebook" />
            <SocialConnectButton 
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
              } 
              label="Google Connected" 
              isConnected 
            />
          </div>
        </section>
      </div>

      {/* Sub-Overlays */}
      <AnimatePresence>
        {confirmSubPage === 'EMAIL' && (
          <ConfirmEmailOverlay 
            user={user} 
            onBack={() => setConfirmSubPage(null)} 
          />
        )}
        {confirmSubPage === 'PHONE' && (
          <ConfirmPhoneOverlay 
            onBack={() => setConfirmSubPage(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SocialConnectButton({ icon, label, isConnected }: { icon: React.ReactNode, label: string, isConnected?: boolean }) {
  return (
    <button className="w-full bg-bg-secondary rounded-[14px] p-4 flex items-center justify-between border border-border-color hover:bg-bg-tertiary transition active:scale-[0.98]">
      <div className="flex items-center gap-4 text-text-primary/80">
        {icon}
        <span className="text-[15px] font-bold">{label}</span>
      </div>
      {isConnected && (
        <Check size={20} className="text-[#0ecb81]" />
      )}
    </button>
  );
}

function ConfirmEmailOverlay({ user, onBack }: { user: any, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[110] bg-bg-primary text-text-primary font-sans flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <ChevronLeft size={28} />
        </button>
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <X size={28} />
        </button>
      </div>

      <div className="px-6 flex flex-col h-full">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Confirm Email</h1>
        <p className="text-lg text-text-primary/90 leading-tight mb-8">
          Let's make sure we can contact you at {user.email || 'tasmeaykhatun565@gmail.com'}.
        </p>
        <p className="text-base text-text-secondary/50 leading-snug mb-10">
          Confirming your email address helps us keep your profile safe and ensures that you'll never miss important updates about your money.
        </p>

        <div className="mt-auto pb-10">
          <button 
            onClick={onBack}
            className="w-full bg-[#0ecb81] hover:bg-[#0da669] text-black font-black py-5 rounded-[16px] text-lg transition shadow-lg shadow-[#0ecb81]/20 active:scale-[0.98]"
          >
            Get Email Code
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ConfirmPhoneOverlay({ onBack }: { onBack: () => void }) {
  const [phoneNumber, setPhoneNumber] = useState('');

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[110] bg-bg-primary text-text-primary font-sans flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <ChevronLeft size={28} />
        </button>
        <button onClick={onBack} className="text-text-secondary/70 hover:text-text-primary transition">
          <X size={28} />
        </button>
      </div>

      <div className="px-6 flex flex-col h-full">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Confirm Phone Number</h1>
        <p className="text-base text-text-secondary/70 leading-snug mb-8">
          Your phone number will only be used to ensure your profile's security
        </p>

        <div className="space-y-4">
          <div className="bg-bg-secondary rounded-[14px] p-5 border border-border-color">
            <input 
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Mobile phone number"
              className="w-full bg-transparent border-none text-lg font-bold text-text-primary focus:ring-0 p-0 placeholder:text-text-secondary/20"
            />
          </div>

          {/* Fake ReCAPTCHA */}
          <div className="bg-bg-secondary rounded-[14px] p-4 flex items-center justify-between border border-border-color">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-white/20 rounded bg-bg-secondary" />
              <span className="text-sm font-medium text-text-primary/80">I'm not a robot</span>
            </div>
            <div className="flex flex-col items-center">
               <div className="w-10 h-10 flex items-center justify-center">
                 <RefreshCw size={24} className="text-blue-500" />
               </div>
               <span className="text-[10px] text-text-secondary/30 uppercase font-black tracking-tighter">reCAPTCHA</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pb-10">
          <button 
            disabled={!phoneNumber}
            onClick={onBack}
            className={cn(
              "w-full font-black py-5 rounded-[16px] text-lg transition active:scale-[0.98]",
              phoneNumber ? "bg-[#0ecb81] text-black shadow-lg shadow-[#0ecb81]/20" : "bg-bg-secondary text-text-secondary/20"
            )}
          >
            Get SMS Code
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SettingsItem({ 
  icon, 
  label, 
  subtitle, 
  showWarning, 
  onClick 
}: { 
  icon: React.ReactNode, 
  label: string, 
  subtitle?: string,
  showWarning?: boolean,
  onClick?: () => void 
}) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-bg-secondary rounded-2xl p-4 flex items-center justify-between transition active:scale-[0.99] group"
    >
      <div className="flex items-center gap-4">
        <div className="w-6 h-6 flex items-center justify-center text-text-secondary/40 group-hover:text-text-primary transition">
          {icon}
        </div>
        <div className="text-left">
          <span className="block text-[15px] font-medium text-text-primary/90 leading-snug">{label}</span>
          {subtitle && (
            <span className="block text-[13px] font-normal text-text-secondary/40 leading-tight mt-0.5">{subtitle}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {showWarning && (
           <div className="w-5 h-5 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
             <AlertCircle size={14} />
           </div>
        )}
        <ChevronLeft size={20} className="text-text-secondary/20 rotate-180" />
      </div>
    </button>
  );
}


export const CURRENCIES = [
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
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { theme: currentTheme, setTheme: setGlobalTheme } = useTheme();

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [chartType, setChartType] = useState(() => {
    return localStorage.getItem('chartType') || 'Candlestick';
  });
  const [view, setView] = useState<'HOME' | 'TRADING' | 'PROFILE' | 'MARKET' | 'REWARDS' | 'REFERRAL' | 'HELP' | 'TRADES' | 'SETTINGS' | 'ADMIN' | 'INFO_PAGE' | 'NEWS' | 'LEADERBOARD' | 'CALENDAR' | 'PAY_ORDER'>('HOME');
  const [preferences, setPreferences] = useState({
    language: localStorage.getItem('app-language') || 'en',
    currency: localStorage.getItem('app-currency') || 'USD',
    timeframe: localStorage.getItem('app-timeframe') || '1m',
    chartType: localStorage.getItem('app-chartType') || 'Candlestick',
    theme: localStorage.getItem('app-theme') || 'Dark'
  });

  const savePreferences = useCallback(async (newPrefs: Partial<typeof preferences>) => {
    console.log('savePreferences called with:', newPrefs);
    if (!user?.email || !user?.uid) {
      console.log('User not logged in, skipping preference save');
      return;
    }
    
    setPreferences(prev => ({ ...prev, ...newPrefs }));

    try {
      // Sync with SQL backend
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          email: user.email,
          ...newPrefs
        })
      });
      
      console.log('Backend response status:', response.status);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      console.log('Backend response ok');

      // Sync with Firestore for real-time remote updates
      const userRef = doc(db, 'users', user.uid);
      const firestoreUpdate: any = {};
      if (newPrefs.theme) firestoreUpdate['preferences.theme'] = newPrefs.theme;
      if (newPrefs.chartType) firestoreUpdate['preferences.chartType'] = newPrefs.chartType;
      if (newPrefs.language) firestoreUpdate['preferences.language'] = newPrefs.language;
      if (newPrefs.timeframe) firestoreUpdate['preferences.timeframe'] = newPrefs.timeframe;

      if (Object.keys(firestoreUpdate).length > 0) {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(userRef, firestoreUpdate);
        console.log('Firestore update ok');
      }
    } catch (error) {
      console.error('Error saving preferences deeply:', error);
    }
  }, [user]);
  const { language, setLanguage } = useTranslation();

  useEffect(() => {
    if (preferences.language && preferences.language !== language) {
      setLanguage(preferences.language as any);
    }
  }, [preferences.language, setLanguage, language]);

  useEffect(() => {
    if (preferences.theme && preferences.theme !== currentTheme) {
      setGlobalTheme(preferences.theme as any);
    }
  }, [preferences.theme, currentTheme, setGlobalTheme]);

  useEffect(() => {
    if (preferences.chartType && preferences.chartType !== chartType) {
      setChartType(preferences.chartType);
    }
  }, [preferences.chartType, chartType]);
  const [infoPageTitle, setInfoPageTitle] = useState<string>('');
  const [data, setData] = useState<OHLCData[]>([]);
  const [tickHistory, setTickHistory] = useState<Record<string, TickData[]>>({});
  const [currentPrice, setCurrentPrice] = useState<number>(51.677);
  const [activeAccount, setActiveAccount] = useState<string>('DEMO');
  const [chartTimeFrame, setChartTimeFrame] = useState(() => {
    return localStorage.getItem('chartTimeFrame') || '1m';
  });

  useEffect(() => {
    if (chartType !== preferences.chartType) {
      savePreferences({ chartType: chartType });
    }
  }, [chartType, preferences.chartType, savePreferences]);

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
  const [userReferralCode, setUserReferralCode] = useState<string | null>(null);
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
  const [activeSidePanel, setActiveSidePanel] = useState<'TRADES' | 'MARKET' | 'HELP' | 'REWARDS' | 'INDICATORS' | null>(null);
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
  const [referralSettings, setReferralSettings] = useState({ bonusAmount: 10, referralPercentage: 25, minDepositForBonus: 20 });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [investment, setInvestment] = useState<number>(() => {
    // Check if initial currency is BDT and set 20 if so
    const saved = localStorage.getItem('app-currency');
    if (saved) {
      try {
        const c = JSON.parse(saved);
        if (c.code === 'BDT') return 20;
      } catch (e) {}
    }
    return 1;
  });
  
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
      // Only include trades ended today and exclude DEMO account trades
      if (t.endTime >= todayStartTs && (t.status === 'WIN' || t.status === 'LOSS') && t.accountType !== 'DEMO') {
        const p = t.profit !== undefined ? t.profit : (t.status === 'WIN' ? t.amount * ((t.payout || 82) / 100) : -t.amount);
        return acc + p;
      }
      return acc;
    }, 0);

    return { 
      name: user.displayName || user.email.split('@')[0], 
      profit: todayProfit 
    };
  }, [user, trades]);

  // Smooth local clock that syncs with server
  useEffect(() => {
    let lastTick = 0;
    const timer = setInterval(() => {
      const now = Date.now() + (serverTimeOffset || 0);
      currentTimeRef.current = now;
      
      // Update UI state every 1000ms to minimize re-renders
      if (now - lastTick >= 1000) {
        lastTick = now;
        setCurrentTime(now);
      }
    }, 100); 
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

  const [rewards, setRewards] = useState<any[]>([
    { id: 'lunar2026', title: '110% Deposit Bonus', description: 'Use LUNAR2026 when depositing $10.00+', value: 'LUNAR2026', percentage: 110, category: 'PROMO CODE' },
    { id: 'welcome', title: 'Welcome Bonus', description: 'Get 50% extra on your first deposit', value: 'WELCOME50', percentage: 50, category: 'WELCOME' }
  ]);
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
  const historyCacheRef = useRef<Record<string, any>>({});
  const lastChartUpdateRef = useRef(0);
  const userRef = useRef(user);
  const selectedAssetRef = useRef(selectedAsset);
  const lastAssetIdRef = useRef(selectedAsset.id);

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
          const response = await fetch(`/api/user?email=${encodeURIComponent(firebaseUser.email)}`);
          if (response.status === 404) {
             // User not yet synced to backend, normal for first-time login
             setAuthLoading(false);
             return;
          }
          if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
          }
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`Expected JSON but received ${contentType || 'unknown'}. Body: ${text.substring(0, 100)}...`);
          }
          const userData = await response.json();
          if (userData.referralCode) {
            setUserReferralCode(userData.referralCode);
          }
          if (userData.language || userData.currency || userData.timeframe || userData.chartType || userData.theme) {
            setPreferences(prev => {
              const updates: any = {};
              if (userData.language && userData.language !== prev.language) updates.language = userData.language;
              if (userData.currency && userData.currency !== prev.currency) updates.currency = userData.currency;
              if (userData.timeframe && userData.timeframe !== prev.timeframe) updates.timeframe = userData.timeframe;
              if (userData.chartType && userData.chartType !== prev.chartType) updates.chartType = userData.chartType;
              if (userData.theme && userData.theme !== prev.theme) updates.theme = userData.theme;
              
              if (userData.theme) localStorage.setItem('app-theme', userData.theme);
              if (userData.chartType) localStorage.setItem('app-chartType', userData.chartType);
              if (userData.language) localStorage.setItem('app-language', userData.language);
              if (userData.currency) localStorage.setItem('app-currency', userData.currency);
              if (userData.timeframe) localStorage.setItem('app-timeframe', userData.timeframe);

              if (Object.keys(updates).length > 0) return { ...prev, ...updates };
              return prev;
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

    let isMounted = true;
    
    // Main user doc listener
    const unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (!isMounted) return;
      if (doc.exists()) {
        const userData = doc.data();
        
        let balanceToSet = userData.balance;
        if (balanceToSet === undefined && userData.extraAccounts) {
          const realAccount = userData.extraAccounts.find((a: any) => a.type === 'REAL');
          if (realAccount) balanceToSet = realAccount.balance;
        }
        if (balanceToSet !== undefined) setBalance(prev => Math.abs(prev - balanceToSet) < 0.000001 ? prev : balanceToSet);
        if (userData.bonus_balance !== undefined) setBonusBalance(prev => Math.abs(prev - userData.bonus_balance) < 0.000001 ? prev : userData.bonus_balance);
        if (userData.demoBalance !== undefined) setDemoBalance(prev => Math.abs(prev - userData.demoBalance) < 0.000001 ? prev : userData.demoBalance);
        if (userData.kycStatus !== undefined) setKycStatus(prev => prev === userData.kycStatus ? prev : userData.kycStatus);
        if (userData.turnover_required !== undefined) setTurnoverRequired(prev => prev === userData.turnover_required ? prev : userData.turnover_required);
        if (userData.turnover_achieved !== undefined) setTurnoverAchieved(prev => prev === userData.turnover_achieved ? prev : userData.turnover_achieved);
        if (userData.referralCode !== undefined) setUserReferralCode(userData.referralCode);
        
        // Sync preferences from remote
        if (userData.preferences) {
          const { theme: remoteTheme, chartType: remoteChartType } = userData.preferences;
          setPreferences(prev => {
            const updates: any = {};
            if (remoteTheme && remoteTheme !== prev.theme) updates.theme = remoteTheme;
            if (remoteChartType && remoteChartType !== prev.chartType) updates.chartType = remoteChartType;
            if (Object.keys(updates).length > 0) return { ...prev, ...updates };
            return prev;
          });
        }
        
        if (userData.currency && userData.currencySymbol) {
          setCurrency(prev => {
            if (prev.code === userData.currency && prev.symbol === userData.currencySymbol) return prev;
            if (Date.now() - lastCurrencyChangeRef.current > 15000) {
              return {
                code: userData.currency,
                symbol: userData.currencySymbol,
                name: userData.currencyName || userData.currency,
                flag: userData.currencyFlag || ''
              };
            }
            return prev;
          });
        }
        setIsUserDataLoaded(true);
      }
    }, (error) => {
      if (!isMounted) return;
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
    });

    // Trades subcollection listener
    const tradesQuery = query(collection(db, 'users', user.uid, 'trades'), orderBy('startTime', 'desc'), limit(100));
    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      if (!isMounted) return;
      const tradesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      
      setTrades(prev => {
        const now = Date.now() + (serverTimeOffset || 0);
        const merged = tradesData.map(remoteTrade => {
          if (remoteTrade.status === 'ACTIVE' && resolvedTradeIdsRef.current.has(remoteTrade.id)) {
            const localTrade = prev.find(t => t.id === remoteTrade.id);
            if (localTrade && localTrade.status !== 'ACTIVE') return localTrade;
          }
          
          if (remoteTrade.status === 'ACTIVE' && remoteTrade.endTime < now) {
             const localTrade = prev.find(t => t.id === remoteTrade.id);
             if (localTrade && localTrade.status !== 'ACTIVE') return localTrade;
          }
          return remoteTrade;
        });

        const activeIds = new Set(merged.map(t => t.id));
        const uniquelyLocal = prev.filter(t => !activeIds.has(t.id) && t.status === 'ACTIVE');
        
        const all = [...uniquelyLocal, ...merged];
        const seen = new Set();
        const final = all.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        }).sort((a, b) => (b.startTime || 0) - (a.startTime || 0)).slice(0, 100);

        return deepEqual(prev, final) ? prev : final;
      });
    }, (error) => {
      if (!isMounted) return;
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/trades`);
    });

    return () => {
      isMounted = false;
      unsubscribeUser();
      unsubscribeTrades();
    };
  }, [user?.uid, currentTheme, chartType, setGlobalTheme]); // Use UID and sync prefs for stability

  const currentTimeRef = useRef(currentTime);

  // Proactive local trade resolution to ensure UI reflects expiry immediately
  useEffect(() => {
    const checkTimer = setInterval(() => {
      const now = currentTimeRef.current;
      setTrades(prev => {
        let changed = false;
        const next = prev.map(t => {
          // If a trade is expired locally, mark it as RESOLVING to show it's closing
          if (t.status === 'ACTIVE' && t.endTime <= now) {
            changed = true;
            return { ...t, status: 'RESOLVING' as any };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }, 500);
    return () => clearInterval(checkTimer);
  }, []);

  // Force candle update on interval
  useEffect(() => {
    const timer = setInterval(() => {
      const tfMs = getTimeFrameInMs(chartTimeFrame);
      const currentTimeAligned = Math.floor(currentTimeRef.current / tfMs) * tfMs;
      
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
  }, [chartTimeFrame, timezoneOffset]);

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
  const [isCurrencySheetOpen, setIsCurrencySheetOpen] = useState(false);
  const [isAppearanceSheetOpen, setIsAppearanceSheetOpen] = useState(false);
  const [isTradingPlatformOpen, setIsTradingPlatformOpen] = useState(false);
  const [paymentsInitialView, setPaymentsInitialView] = useState<'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'HISTORY' | null>(null);

  const handleOpenPayments = useCallback((view: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'HISTORY' | null = null) => {
    setPaymentsInitialView(view);
    setIsPaymentsOpen(true);
  }, []);

  // Route Synchronization Effect
  useEffect(() => {
    const path = location.pathname;
    
    // First, sync side sheets for pages that should display over TRADING
    setIsActivitiesOpen(path === '/tournaments');
    setIsWhatsNewOpen(path === '/whats-new');
    setIsProfileOpen(path === '/profile-sheet'); // /profile is the full page
    setIsTournamentsOpen(path === '/events');
    setIsCalendarOpen(path === '/calendar-view');
    
    // Define active side panels based on url (For desktop slide-overs)
    let panel = null;
    if (path === '/indicators') panel = 'INDICATORS';
    // If you want desktop to use sliding panels for these routes, you could do it here
    // But currently /market, /trades, /help map to full pages via 'view'.
    setActiveSidePanel(panel as any);

    // Handle specific views
    if (path === '/') setView('HOME');
    else if (path === '/trade' || path === '/trade/live' || path === '/trading' || path === '/trading/live' || path === '/tournaments' || path === '/whats-new' || path === '/indicators') {
      setView('TRADING');
      if (path === '/trade' || path === '/trade/live' || path === '/trading' || path === '/trading/live') {
          setActiveAccount('REAL');
      }
    }
    else if (path === '/trade/demo' || path === '/trading/demo') {
      setView('TRADING');
      setActiveAccount('DEMO');
    }
    else if (path === '/profile') setView('PROFILE');
    else if (path === '/market') setView('MARKET');
    else if (path === '/rewards' || path === '/bonuses') setView('REWARDS');
    else if (path === '/referral' || path === '/affiliate') setView('REFERRAL');
    else if (path === '/support' || path === '/help') setView('HELP');
    else if (path === '/trades') setView('TRADES');
    else if (path === '/settings') setView('SETTINGS');
    else if (path === '/admin') setView('ADMIN');
    else if (path === '/leaderboard') setView('LEADERBOARD');
    else if (path === '/calendar') setView('CALENDAR');
    else if (path.startsWith('/pay/')) setView('PAY_ORDER');
    else if (path.startsWith('/info/')) {
      setView('INFO_PAGE');
      const page = path.split('/').pop();
      if (page === 'help') setInfoPageTitle('Help Center');
      else if (page === 'education') setInfoPageTitle('Education Hub');
      else if (page === 'tutorials') setInfoPageTitle('Trading Tutorials');
      else if (page === 'assets') setInfoPageTitle('Assets Index');
      else if (page === 'terms') setInfoPageTitle('Terms and Conditions');
      else if (page === 'privacy') setInfoPageTitle('Privacy Policy');
      else if (page === 'risk') setInfoPageTitle('Risk Disclosure');
    }

    // Handle payment sheets
    if (path === '/deposit') {
      setView('TRADING');
      handleOpenPayments('DEPOSIT');
    } else if (path === '/withdraw') {
      setView('TRADING');
      handleOpenPayments('WITHDRAW');
    } else if (path === '/transfer') {
      setView('TRADING');
      handleOpenPayments('TRANSFER');
    } else if (path === '/history') {
      setView('TRADING');
      handleOpenPayments('HISTORY');
    } else {
      setIsPaymentsOpen(false);
    }

  }, [location.pathname, handleOpenPayments]);

  // Auth Protection for secured routes
  useEffect(() => {
    const publicPaths = ['/', '/login', '/register', '/signup'];
    const isPublicPath = publicPaths.includes(location.pathname) || location.pathname.startsWith('/pay/');
    
    if (!authLoading && !user && !isPublicPath) {
      navigate('/login');
    }
  }, [user, authLoading, location.pathname, navigate]);
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

  // Always stick to exactly what the user sets or what is in localStorage
  const lastCurrencyRef = useRef(currency.code);
  useEffect(() => {
    if (lastCurrencyRef.current === currency.code) return;
    
    // We stop automatic balance conversion based on exchange rates 
    // because it causes unexpected jumps like 20 -> 2200.
    // Instead, we only ensure the minimum bound is respected.
    setInvestment(prev => {
      const minVal = currency.code === 'BDT' ? 20 : 1;
      if (prev < minVal) return minVal;
      return prev;
    });
    
    lastCurrencyRef.current = currency.code;
  }, [currency.code]);

  useEffect(() => {
    if (!selectedAsset.isOTC && tradeMode === 'TIMER' && timerDuration < 60) {
      setTimerDuration(60);
    }
  }, [selectedAsset.isOTC, tradeMode, timerDuration]);

  useEffect(() => {
    localStorage.setItem('app-currency', safeStringify(currency));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('chartTimeFrame', chartTimeFrame);
  }, [chartTimeFrame]);

  useEffect(() => {
    localStorage.setItem('chartType', chartType);
  }, [chartType]);

  const lastCurrencyChangeRef = useRef(0);
  const handleCurrencyChange = async (newCurrency: typeof CURRENCIES[0]) => {
    lastCurrencyChangeRef.current = Date.now();
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
  // Force reset timeframe if invalid for non-OTC removed by user request
  useEffect(() => {
    // Sub-minute timeframes now allowed for all assets
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

      // SYTHETIC FALLBACK - If we still don't have enough data
      const isRealMarket = marketAssets[assetShortName]?.isRealMarket || selectedAssetRef.current?.isRealMarket;
      if (candles.length < 500 && !response.isOlder && !isRealMarket) {
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
        historyCacheRef.current[response.asset] = candles;
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
    
    // Clear data only if the asset ID changed (not just the timeframe)
    if (selectedAsset.id !== lastAssetIdRef.current) {
        setData([]);
        dataRef.current = [];
    }
    lastAssetIdRef.current = selectedAsset.id;

    setIsLoading(true);

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
      // ONLY block ticks if we have ZERO data. If we have data, we want to see it move even if history is still syncing.
      if (!currentAsset || (isLoadingRef.current && dataRef.current.length === 0)) return; 

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

      // Sanity check: prevent unrealistic spikes (e.g., > 20% jump on one tick) - Increased for gaps
      if (lastCloseRef.current !== null && Math.abs(newPrice - lastCloseRef.current) / lastCloseRef.current > 0.20) {
          console.warn("Unrealistic price jump ignored:", newPrice, lastCloseRef.current);
          return;
      }
      
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

            const isMinuteTf = chartTimeFrameRef.current === '1m';
            const useMinuteAcc = isMinuteTf && tick.minuteOpen !== undefined;

            const newCandle = {
                time: currentTFStart,
                open: useMinuteAcc ? tick.minuteOpen : newPrice,
                high: useMinuteAcc ? tick.minuteHigh : Math.max(newPrice, tick.high || newPrice),
                low: useMinuteAcc ? tick.minuteLow : Math.min(newPrice, tick.low || newPrice),
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
        const isMinuteTf = chartTimeFrameRef.current === '1m';
        const useMinuteAcc = isMinuteTf && tick.minuteOpen !== undefined;

        if (lastCandle.time === currentTFStart) {
            // Update existing candle
            const updatedCandle = {
                ...lastCandle,
                open: useMinuteAcc ? tick.minuteOpen : lastCandle.open,
                close: newPrice,
                high: useMinuteAcc ? tick.minuteHigh : Math.max(lastCandle.high, tick.high || newPrice),
                low: useMinuteAcc ? tick.minuteLow : Math.min(lastCandle.low, tick.low || newPrice),
                volume: (lastCandle.volume || 0) + 1,
            };
            
            // Critical guard: Only update if anything changed
            if (lastCandle.close === updatedCandle.close && 
                lastCandle.high === updatedCandle.high && 
                lastCandle.low === updatedCandle.low &&
                lastCandle.open === updatedCandle.open) return prev;
            
            updatedData = [...prev.slice(0, -1), updatedCandle];
        } else {
            // New candle started
            const newCandle = {
                time: currentTFStart,
                open: useMinuteAcc ? tick.minuteOpen : lastCandle.close,
                high: useMinuteAcc ? tick.minuteHigh : Math.max(lastCandle.close, tick.high || newPrice),
                low: useMinuteAcc ? tick.minuteLow : Math.min(lastCandle.close, tick.low || newPrice),
                close: newPrice,
                volume: Math.floor(Math.random() * 10) + 1,
                formattedTime: formatWithOffset(currentTFStart, 'HH:mm:ss', timezoneOffset),
            };
            updatedData = [...prev, newCandle];
            if (updatedData.length > 5000) updatedData.shift();
        }
        
        dataRef.current = updatedData;
        return updatedData;
      });
    };

    const handlePayoutUpdate = (data: { assetId: string, payout: number }) => {
      console.log('Received payout update:', data);
      setMarketAssets(prev => ({
        ...prev,
        [data.assetId]: {
          ...(prev[data.assetId] || {}),
          payout: data.payout
        }
      }));

      // Sync active selectedAsset payout
      if (selectedAssetRef.current.shortName === data.assetId) {
        setSelectedAsset(prev => ({ ...prev, payout: data.payout }));
      }
    };

    const handleGlobalPayoutUpdate = (payout: number) => {
      setMarketAssets(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          updated[key] = { ...updated[key], payout };
        });
        return updated;
      });
      setSelectedAsset(prev => ({ ...prev, payout: payout }));
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

    socket.on('initial-prices', (prices: Record<string, any>) => {
      setMarketAssets(prev => {
        const next = { ...prev };
        Object.entries(prices).forEach(([symbol, price]) => {
          next[symbol] = {
            ...(prev[symbol] || {}),
            price: Number(price),
            isVisible: true,
            isFrozen: false
          };
        });
        return next;
      });
      
      // Update current price if it matches selected asset to prevent jumps
      if (selectedAsset && prices[selectedAsset.shortName]) {
        const initialPrice = Number(prices[selectedAsset.shortName]);
        setCurrentPrice(initialPrice);
        lastCloseRef.current = initialPrice;
      }
    });

    socket.on('market-tick', (ticks: Record<string, any>) => {
      handleTick(ticks);
      
      // Also update marketAssets so indicators/sidebars match
      setMarketAssets(prev => {
        let changed = false;
        const next = { ...prev };
        Object.entries(ticks).forEach(([symbol, tick]) => {
          if (!next[symbol] || next[symbol].price !== tick.price) {
            next[symbol] = { ...(next[symbol] || {}), price: tick.price };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    });
    socket.on('asset-payout-updated', handlePayoutUpdate);
    socket.on('market-assets-updated', (updatedAssets: Record<string, any>) => {
      setMarketAssets(prev => {
        const newState = { ...prev };
        Object.keys(updatedAssets).forEach(key => {
          newState[key] = {
            ...(prev[key] || {}),
            ...updatedAssets[key]
          };
        });
        return newState;
      });
    });
    socket.on('global-payout-updated', handleGlobalPayoutUpdate);

    socket.on('user-data-updated', (userData) => {
      if (userData.balance !== undefined) setBalance(prev => Math.abs(prev - userData.balance) < 0.000001 ? prev : userData.balance);
      if (userData.bonus_balance !== undefined) setBonusBalance(prev => Math.abs(prev - userData.bonus_balance) < 0.000001 ? prev : userData.bonus_balance);
      if (userData.demoBalance !== undefined) setDemoBalance(prev => Math.abs(prev - userData.demoBalance) < 0.000001 ? prev : userData.demoBalance);
      if (userData.turnover_required !== undefined) setTurnoverRequired(prev => prev === userData.turnover_required ? prev : userData.turnover_required);
      if (userData.turnover_achieved !== undefined) setTurnoverAchieved(prev => prev === userData.turnover_achieved ? prev : userData.turnover_achieved);
      if (userData.referralCode !== undefined) setUserReferralCode(userData.referralCode);
      // Removed userData.trades sync here as the trades subcollection onSnapshot listener is the source of truth for trades and handles updates safely.
      if (userData.extraAccounts !== undefined) setExtraAccounts(prev => deepEqual(prev, userData.extraAccounts) ? prev : userData.extraAccounts);
      
      if (userData.currency !== undefined && userData.currency !== null) {
        const found = CURRENCIES.find(c => c.code === userData.currency);
        // Only update if it's a valid change to avoid unwanted reverts, and strictly check if different
        if (found && found.code !== currency.code) {
           // We ONLY update if the local state was just initialized or if the server has a newer authoritative version
           // To keep the user's manual change, we trust the local state if it was changed recently.
           if (Date.now() - lastCurrencyChangeRef.current > 15000) {
              setCurrency(found);
           }
        }
      }
      
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

    socket.on('withdrawal-cancelled', ({ id, newBalance, currency, bonus_balance: newBonusBalance }) => {
      if (currency === 'BDT') {
        setExtraAccounts(prev => prev.map(a => a.currency === 'BDT' ? { ...a, balance: a.balance + (newBalance || 0) } : a));
      } else {
        if (newBalance !== undefined) setBalance(prev => Math.abs(prev - newBalance) < 0.000001 ? prev : newBalance);
        if (newBonusBalance !== undefined) setBonusBalance(prev => Math.abs(prev - (newBonusBalance as number)) < 0.000001 ? prev : (newBonusBalance as number));
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
      playSound('click'); // Or a dedicated notification sound if available
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
      socket.off('market-assets-updated');
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
    if (!socket || !user) return;
    
    const activeTrades = trades.filter(t => t.status === 'ACTIVE');
    activeTrades.forEach(trade => {
      if (!sentTradesRef.current.has(trade.id)) {
        sentTradesRef.current.add(trade.id);
        socket.emit('place-trade', trade);
      }
    });
  }, [socket, user?.uid, activeTradesCount]);

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
      const isDraw = result.status === 'DRAW';
      
      let profit = result.profit;
      if (profit === undefined && trade) {
        if (isWin) profit = trade.amount * (trade.payout / 100);
        else if (isDraw) profit = 0;
        else profit = -trade.amount;
      }
      
      if (isWin) {
        playSound('win');
      } else if (isDraw) {
        // No sound or draw sound for draw
      } else {
        playSound('loss');
      }

      // Update the trades array locally for zero latency
      setTrades(prev => prev.map(t => {
        if (t.id === result.id) {
          return {
            ...t,
            status: result.status,
            profit: profit || 0,
            closePrice: result.closePrice,
            endTime: result.endTime || Date.now()
          };
        }
        return t;
      }));

      // Professional Firestore Update for Trade Result
      if (user) {
        try {
          // Update the specific trade document immediately, even if local trade state hasn't caught up
          const tradeDocRef = doc(db, 'users', user.uid, 'trades', result.id);
          setDoc(tradeDocRef, {
            status: result.status,
            profit: profit,
            closePrice: result.closePrice,
            endTime: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error("Error updating trade result:", error);
        }
      }

      // If trade is already updated by user-data-updated or missing locally, don't update local wallet balances directly
      if (!trade || trade.status !== 'ACTIVE') return;

      // Update results locally for immediate feedback
      if (isWin) {
        if (trade.accountType === 'DEMO') {
          setDemoBalance(prev => prev + trade.amount + profit);
        } else if (trade.accountType === 'REAL') {
          // Calculation might need care if multiple trades are active
          // But usually the Firestore listener will correct it.
          setBalance(prev => prev + (result.realReturn || (trade.amount + profit)));
          if (result.bonusReturn) setBonusBalance(prev => prev + result.bonusReturn);
        }
      }

      // Add to results toast
      setTradeResults(r => [...r, { id: result.id, profit: profit, isWin }]);
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
    if (selectedAsset.isFrozen) return showToast(t('trade.closed_assets'), "error");
    
    // Demo trade limit check
    if (activeAccount === 'DEMO') {
      const activeDemoTradesCount = trades.filter(t => t.status === 'ACTIVE' && t.accountType === 'DEMO').length;
      if (activeDemoTradesCount >= 10) {
        return showToast(t('trade.max_active_reached'), "error");
      }
    }

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

    const investmentInUSD = Math.round((investment / rate) * 100000000) / 100000000;

    let totalAvailable = currentBalance;
    if (activeAccount === 'REAL') {
      totalAvailable = balance + bonusBalance;
    }

    if (totalAvailable < investmentInUSD - 0.00000001) {
      showToast(`${t('trade.insufficient_balance')}. You need ${displayCurrencySymbol}${(investmentInUSD * rate).toFixed(2)} but have ${displayCurrencySymbol}${(totalAvailable * rate).toFixed(2)}.`, "error");
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
      setDemoBalance(prev => Math.round((prev - investmentInUSD) * 100000000) / 100000000);
    } else if (activeAccount === 'REAL') {
      let remaining = investmentInUSD;
      let newRealBalance = balance;
      let newBonusBalance = bonusBalance;
      
      if (newRealBalance >= remaining) {
        newRealBalance = Math.round((newRealBalance - remaining) * 100000000) / 100000000;
        remaining = 0;
      } else {
        remaining -= newRealBalance;
        newRealBalance = 0;
        newBonusBalance = Math.round(Math.max(0, newBonusBalance - remaining) * 100000000) / 100000000;
      }
      setBalance(newRealBalance);
      setBonusBalance(newBonusBalance);
      
      // Update turnover achieved locally for immediate feedback
      setTurnoverAchieved(prev => prev + investmentInUSD);
    } else {
      setExtraAccounts(prev => prev.map(a => a.id === activeAccount ? { ...a, balance: Math.round((a.balance - investment) * 100) / 100 } : a));
    }
    
    const now = Date.now() + serverTimeOffset;
    const expirationTime = getExpirationTime();
    const tradeDurationSeconds = Math.floor((expirationTime - now) / 1000);

    const tradeId = Math.random().toString(36).substr(2, 9);
    
    // Determine the symbol to store with this specific trade
    let tradeSymbol = currency.symbol;
    if (activeAccount !== 'DEMO' && activeAccount !== 'REAL') {
      const extra = extraAccounts.find(a => a.id === activeAccount);
      if (extra) {
        const found = CURRENCIES.find(c => c.code === extra.currency);
        tradeSymbol = found?.symbol || (extra.currency === 'BDT' ? 'BDT ' : '$');
      }
    }

    const newTrade: Trade = {
      id: tradeId,
      type,
      entryPrice: entryPrice,
      amount: investmentInUSD, // Store in USD for global stats
      currency: currency.code,
      currencySymbol: tradeSymbol,
      exchangeRate: rate,
      startTime: now,
      endTime: expirationTime,
      duration: tradeDurationSeconds,
      status: 'ACTIVE',
      tradeMode: tradeMode,
      accountType: activeAccount,
      payout: currentPayout,
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
            // We use local state updates for immediate feedback
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
      const rate = EXCHANGE_RATES[currency.code] || 1;
      const amountInUSD = investment / rate;
      
      const pendingOrder = {
        email: user.email,
        uid: user.uid,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        type: order.type,
        triggerValue: order.type === 'PRICE' ? parseFloat(order.value) : parseInt(order.value),
        profitability: order.minProfitability,
        amount: amountInUSD,
        duration: timerDuration,
        direction: order.direction,
        accountType: activeAccount,
        currency: currency.code,
        currencySymbol: currency.symbol,
        exchangeRate: rate
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

// Client-side Trade Resolution Fallback removed to prevent syncing issues. Server is the source of truth.

  const appClosedTrades = useMemo(() => {
    return trades.filter(t => t.status !== 'ACTIVE' && t.accountType === activeAccount).sort((a, b) => b.endTime - a.endTime);
  }, [trades, activeAccount]);

  const currentPayout = marketAssets[selectedAsset.shortName]?.payout || selectedAsset.payout || 90;
  console.log('Current payout:', currentPayout, 'Selected asset:', selectedAsset.shortName, 'Market assets:', marketAssets[selectedAsset.shortName]);
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
    return <LoadingOverlay message="Initializing Onyx" />;
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />;
  }

  if (view === 'INFO_PAGE') {
    return (
      <InfoPage 
        title={infoPageTitle} 
        onBack={() => navigate('/help')} 
      />
    );
  }

  if (view === 'HOME') {
    return (
      <div className="min-h-screen bg-bg-primary text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-[100] px-4 md:px-12 h-16 md:h-24 flex items-center justify-between bg-bg-primary/80 backdrop-blur-lg border-b border-border-color">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="relative shrink-0">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl overflow-hidden border border-border-color shadow-[0_8px_20px_rgba(37,99,235,0.2)] group-hover:scale-105 transition-transform duration-500 bg-white">
                <img 
                  src="https://i.imghippo.com/files/Gtw3911Dmk.jpg" 
                  alt="Onyx Elite Logo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 md:w-3.5 md:h-3.5 bg-emerald-500 rounded-full border-2 border-[#061626] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter leading-none text-text-primary flex items-center uppercase">
                  ONYX<span className="text-blue-500 ml-0.5">ELITE</span>
                </span>
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 hidden md:block" />
              </div>
              <span className="hidden sm:block text-[8px] md:text-[9px] font-black uppercase tracking-[0.5em] text-blue-400/60 mt-1 leading-none">Elite Trading Terminal</span>
              <span className="sm:hidden text-[7px] font-black uppercase tracking-[0.2em] text-blue-400/60 mt-1 leading-none">Elite Trading</span>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-10 text-[11px] font-bold text-text-secondary/50 uppercase tracking-widest shrink-0">
            <button onClick={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} className="hover:text-text-primary transition-colors">Trading</button>
            <button onClick={() => { setInfoPageTitle('Assets'); navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade'); }} className="hover:text-text-primary transition-colors">Assets</button>
            <button onClick={() => navigate('/leaderboard')} className="hover:text-text-primary transition-colors">Tournament</button>
            <div className="flex items-center gap-1 cursor-pointer hover:text-text-primary">
              <Globe size={14} />
              <span>English</span>
              <ChevronDown size={14} />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button 
              onClick={() => navigate('/login')}
              className="text-[11px] font-black text-text-primary/70 hover:text-text-primary uppercase tracking-[0.2em] transition-colors hidden md:block"
            >
              Log In
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="px-4 py-2 md:px-6 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] md:text-xs font-black rounded-md transition-all active:scale-95 shadow-lg shadow-blue-600/20 uppercase tracking-widest"
            >
              <span className="hidden sm:inline">REGISTRATION</span>
              <span className="sm:hidden">REGISTER</span>
            </button>
            <button className="lg:hidden p-1.5 md:p-2 text-text-secondary/70 -mr-2"><AlignLeft size={22} /></button>
          </div>
        </nav>

        {/* Live Asset Ticker Bar */}
        <div className="fixed top-16 md:top-24 left-0 right-0 z-[90] bg-bg-secondary border-b border-border-color h-10 flex items-center overflow-hidden">
          <motion.div 
            animate={{ x: [0, -1000] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap gap-12 px-6"
          >
            {[
              { pair: 'BTC/USD', price: '64,281.20', change: '+1.24%' },
              { pair: 'ETH/USD', price: '3,452.15', change: '+0.85%' },
              { pair: 'EUR/USD', price: '1.0842', change: '-0.12%' },
              { pair: 'GOLD', price: '2,314.80', change: '+0.45%' },
              { pair: 'GBP/JPY', price: '192.45', change: '+0.32%' },
              { pair: 'SOL/USD', price: '142.60', change: '+4.52%' },
              { pair: 'OIL', price: '82.15', change: '-1.05%' },
              { pair: 'APPLE', price: '189.40', change: '+0.25%' },
              { pair: 'BTC/USD', price: '64,281.20', change: '+1.24%' },
              { pair: 'ETH/USD', price: '3,452.15', change: '+0.85%' },
              { pair: 'EUR/USD', price: '1.0842', change: '-0.12%' },
              { pair: 'GOLD', price: '2,314.80', change: '+0.45%' },
              { pair: 'GBP/JPY', price: '192.45', change: '+0.32%' },
              { pair: 'SOL/USD', price: '142.60', change: '+4.52%' },
              { pair: 'OIL', price: '82.15', change: '-1.05%' },
              { pair: 'APPLE', price: '189.40', change: '+0.25%' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                <span className="text-text-secondary/40">{item.pair}</span>
                <span className="text-text-primary">{item.price}</span>
                <span className={item.change.startsWith('+') ? 'text-emerald-500' : 'text-red-500'}>{item.change}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero Section */}
        <section className="relative pt-[180px] pb-24 px-6 md:px-12 min-h-screen flex items-center justify-center overflow-hidden">
          {/* Enhanced Background Layer */}
          <div className="absolute inset-0 -z-10 bg-bg-primary">
             <div className="absolute inset-0 bg-gradient-to-tr from-[#061626] via-[#061626]/80 to-transparent" />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#061626]/20 to-[#061626]" />
          </div>
          
          <div className="max-w-4xl mx-auto w-full text-center flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-[1.1] tracking-tight uppercase drop-shadow-xl text-white">
                TRADE SMART <br className="md:hidden" />
                <span className="text-blue-500 font-black inline-block mt-2">
                  ON FINANCIAL MARKETS
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-2xl mx-auto font-medium">
                Access over 100+ global trading assets with our most user-friendly interface yet.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <button 
                  onClick={() => setView('TRADING')}
                  className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg transition-all shadow-[0_10px_30px_rgba(37,99,235,0.3)] active:scale-95 text-lg uppercase tracking-wider"
                >
                  Start Trading Now
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trading Conditions */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-24 tracking-tight">Place your trades on best conditions</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-y-20 gap-x-16">
               {[
                 { label: 'Minimum investment', value: '$5*', sub: 'Minimum investment amount' },
                 { label: 'Trade amount', value: '$1', sub: 'Minimum trade amount' },
                 { label: 'Demo balance', value: '$50 000', sub: 'Virtual money on your Demo account' },
                 { label: 'Payment methods', value: '50+', sub: 'Fast and secure payment methods' },
                 { label: 'Commission', value: '$0', sub: 'No commission on deposit and withdrawal' },
                 { pair: 'Assets', value: '100+', sub: 'Available assets for trading' }
               ].map((item, i) => (
                 <div key={i} className="border-l-4 border-blue-600 pl-8 transition-transform hover:translate-x-2">
                   <div className="text-5xl md:text-6xl font-black text-blue-600 mb-3">{item.value}</div>
                   <div className="text-lg font-bold text-text-primary/40 uppercase tracking-widest">{item.sub}</div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Professional Asset Index Preview */}
        <section className="py-32 px-6 md:px-12 bg-bg-primary text-text-primary">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
               <div>
                  <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Asset Coverage</span>
                  <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">Global Markets</h2>
               </div>
               <div className="flex gap-4">
                  {['Currencies', 'Crypto', 'Stocks', 'Commodities'].map((cat) => (
                    <button key={cat} className="px-6 py-2 rounded-full border border-gray-200 text-xs font-bold uppercase hover:bg-blue-600 hover:text-white transition-all">
                      {cat}
                    </button>
                  ))}
               </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 { pair: 'AUD/USD OTC', payout: '92%', status: 'Hot' },
                 { pair: 'EUR/USD OTC', payout: '91%', status: 'Hot' },
                 { pair: 'GBP/USD OTC', payout: '89%', status: 'Stable' },
                 { pair: 'GOLD (XAU/USD)', payout: '82%', status: 'Volatile' },
                 { pair: 'BITCOIN', payout: '78%', status: 'Trending' },
                 { pair: 'APPLE INC', payout: '85%', status: 'Stable' },
                 { pair: 'ETH/USD', payout: '80%', status: 'Trending' },
                 { pair: 'CRUDE OIL', payout: '75%', status: 'Volatile' },
               ].map((asset, i) => (
                 <div key={i} className="p-6 bg-white rounded-xl border border-gray-100 flex justify-between items-center hover:shadow-lg transition-all group cursor-pointer">
                    <div>
                       <div className="text-sm font-black uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{asset.pair}</div>
                       <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.status}</div>
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-black text-emerald-600">{asset.payout}</div>
                       <div className="text-[9px] font-black text-gray-300 uppercase">Payout</div>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Security Pillars Deep Dive */}
        <section className="py-32 px-6 md:px-12 bg-bg-primary text-white">
           <div className="max-w-7xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-24 items-center">
                 <div className="relative">
                    <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
                    <h2 className="text-4xl md:text-6xl font-black uppercase mb-10 leading-tight">Institutional Grade<br /> <span className="text-blue-500">Security Layers</span></h2>
                    <p className="text-xl text-text-secondary/50 mb-12 leading-relaxed">
                       Your security is our highest priority. We use the same encryption standards as leading global banking institutions.
                    </p>
                    <div className="space-y-8">
                       {[
                         { title: 'Segregated Accounts', desc: 'Client funds are held in top-tier banks, completely separate from company capital.' },
                         { title: '256-bit SSL Encryption', desc: 'Every byte of data transmitted between your device and our servers is encrypted.' },
                         { title: 'Two-Factor Authentication', desc: 'Secure your withdrawals and sensitive actions with biometric or SMS verification.' }
                       ].map((item, i) => (
                         <div key={i} className="flex gap-6">
                            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center shrink-0">
                               <ShieldCheck size={24} className="text-blue-500" />
                            </div>
                            <div>
                               <h3 className="text-lg font-bold uppercase tracking-tight mb-2">{item.title}</h3>
                               <p className="text-text-secondary/30 text-sm leading-relaxed">{item.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="bg-bg-secondary p-10 rounded-[40px] border border-border-color relative group">
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px]" />
                    <div className="relative z-10">
                       <Lock size={80} className="text-blue-500/20 mb-10" />
                       <h3 className="text-3xl font-black uppercase italic mb-6">Regulated Infrastructure</h3>
                       <p className="text-text-secondary/40 mb-10 leading-relaxed font-medium">
                          Our platform architecture is built on multi-node redundancy, ensuring 99.9% uptime and zero-latency execution even during periods of extreme market volatility.
                       </p>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="p-6 bg-bg-tertiary rounded-2xl border border-border-color">
                             <div className="text-2xl font-black text-blue-500">24/7</div>
                             <div className="text-[10px] font-black uppercase text-text-secondary/30 tracking-widest">Monitoring</div>
                          </div>
                          <div className="p-6 bg-bg-tertiary rounded-2xl border border-border-color">
                             <div className="text-2xl font-black text-blue-500">AI</div>
                             <div className="text-[10px] font-black uppercase text-text-secondary/30 tracking-widest">Fraud Guard</div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Why Choose Us Icons */}
        <section className="py-32 px-6 md:px-12 bg-gray-50 text-text-primary">
           <div className="max-w-7xl mx-auto">
             <h2 className="text-4xl font-bold mb-20 tracking-tight text-center lg:text-left">Why choose us?</h2>
             <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-x-16 gap-y-20">
                {[
                  { icon: ArrowUpDown, title: 'FLEXIBLE TRADING', desc: 'Latest trends: quick and digital trading, express trades, pending trades, copy trading. Payouts of up to 218%.' },
                  { icon: GraduationCap, title: 'COMPREHENSIVE EDUCATION', desc: 'Our help section contains tutorials, guides and various trading strategies for all levels.' },
                  { icon: Bitcoin, title: 'DIVERSE INSTRUMENTS', desc: 'Assets suitable for any trader: currency pairs, major crypto, commodities, and stocks.' },
                  { icon: Activity, title: 'FREE DEMO ACCOUNT', desc: 'Try all platform benefits on the Demo account using virtual money. No investment needed.' },
                  { icon: RefreshCw, title: 'QUICK DEPOSITS & WITHDRAWALS', desc: 'Use the most convenient payment methods for hassle-free deposits and withdrawals locally.' },
                  { icon: Trophy, title: 'PLATFORM REWARDS', desc: 'Trading tournaments, regular bonuses, gifts, promo codes and contests are available to loyal users.' }
                ].map((feat, i) => (
                  <div key={i} className="flex flex-col gap-8 group">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                      <feat.icon size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase mb-4 tracking-tighter">0 {i+1} {feat.title}</h3>
                      <p className="text-text-primary/60 leading-relaxed font-medium text-sm">{feat.desc}</p>
                    </div>
                  </div>
                ))}
             </div>
           </div>
        </section>

        {/* How to Start Section */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">How it works?</h2>
              <p className="text-xl text-text-primary/50">Start trading in three simple steps</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
               {[
                 { title: 'Registration', desc: 'Open an account for free in just a few minutes.', icon: UserCheck },
                 { title: 'Practice', icon: Target, desc: 'Perfect your skills with a demo account and educational materials.' },
                 { title: 'Deposit and trade', icon: TrendingUp, desc: 'Over 100 assets (currency pairs, stocks, commodities, indices) for best trading conditions.' }
               ].map((step, i) => (
                 <div key={i} className="relative p-10 rounded-3xl bg-gray-50 flex flex-col items-center text-center group hover:bg-blue-600 hover:text-white transition-all duration-500">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-blue-600 mb-8 shadow-xl shadow-black/5 group-hover:scale-110 transition-transform">
                       <step.icon size={32} />
                    </div>
                    <div className="absolute top-10 right-10 text-4xl font-black text-blue-600/10 group-hover:text-text-secondary/10 uppercase">0{i+1}</div>
                    <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">{step.title}</h3>
                    <p className="opacity-60 font-medium">{step.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Community / Global Stats */}
        <section className="py-32 px-6 md:px-12 bg-blue-600 text-white overflow-hidden relative">
           <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10">
              <div>
                 <h2 className="text-4xl md:text-6xl font-black uppercase mb-10 leading-tight">Trusted by millions<br /> of traders worldwide</h2>
                 <p className="text-xl opacity-80 mb-12 max-w-lg">Over <span className="font-bold underline">10 000 000</span> active clients use our platform for their financial success every day.</p>
                 <button onClick={() => setView('TRADING')} className="px-10 py-5 bg-white text-blue-600 font-bold rounded-lg uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-2xl">Join Community</button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 {[
                   { label: 'Total active users', value: '14.2M' },
                   { label: 'Trades handled per day', value: '1.5M+' },
                   { label: 'Weekly turnover', value: '$840M' },
                   { label: 'Withdrawals in 24h', value: '$2.5M' }
                 ].map((stat, i) => (
                   <div key={i} className="p-8 bg-bg-tertiary backdrop-blur-md rounded-2xl border border-border-color text-center">
                     <div className="text-3xl md:text-5xl font-black mb-2 tracking-tighter uppercase">{stat.value}</div>
                     <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</div>
                   </div>
                 ))}
              </div>
           </div>
           {/* Abstract Map Background */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-10 pointer-events-none grayscale">
              <Globe size={1000} className="mx-auto" strokeWidth={0.5} />
           </div>
        </section>

        {/* Mobile App Promotion */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-24">
              <div className="flex-1 order-2 lg:order-1">
                 <div className="relative inline-block">
                    <img 
                      src="https://i.postimg.cc/QM7BFVV4/Gemini-Generated-Image-3ztx3l3ztx3l3ztx.png" 
                      alt="Mobile App Mockup" 
                      className="w-[300px] md:w-[450px] mx-auto rounded-[3rem] shadow-2xl"
                    />
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-600 rounded-full flex items-center justify-center text-white flex-col animate-bounce">
                       <span className="text-2xl font-black">NEW</span>
                       <span className="text-[10px] font-bold uppercase tracking-widest">Version 4.2</span>
                    </div>
                 </div>
              </div>
              <div className="flex-1 order-1 lg:order-2">
                 <h2 className="text-4xl md:text-6xl font-black uppercase mb-10 tracking-tight leading-tight">Always with you on <span className="text-blue-600">any device</span></h2>
                 <p className="text-xl text-text-primary/60 mb-12 leading-relaxed">
                    The platform for computer allows you to trade on your laptop, but for those who are always on the go, our mobile app provides the same level of security and performance.
                 </p>
                 <div className="flex flex-wrap gap-4">
                    <button className="flex items-center gap-3 px-8 py-4 bg-bg-primary text-white rounded-xl hover:bg-bg-secondary transition-all">
                       <Apple size={24} />
                       <div className="text-left">
                          <div className="text-[10px] uppercase opacity-50 font-bold">Download on the</div>
                          <div className="text-lg font-black leading-tight">App Store</div>
                       </div>
                    </button>
                    <button className="flex items-center gap-3 px-8 py-4 bg-bg-primary text-white rounded-xl hover:bg-bg-secondary transition-all">
                       <PlayCircle size={24} />
                       <div className="text-left">
                          <div className="text-[10px] uppercase opacity-50 font-bold">Get it on</div>
                          <div className="text-lg font-black leading-tight">Google Play</div>
                       </div>
                    </button>
                 </div>
              </div>
           </div>
        </section>

        {/* Live Market Insights / Signals */}
        <section className="py-32 px-6 md:px-12 bg-bg-secondary text-white relative overflow-hidden">
           <div className="max-w-7xl mx-auto relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
                 <div>
                    <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Market Sentiment</span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">Trading Indicators</h2>
                 </div>
                 <p className="max-w-md text-text-secondary/50 text-right font-medium">Use our built-in technical indicators and charts to evaluate market trends and make informed decisions.</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {[
                   { name: 'RSI', desc: 'Relative Strength Index for momentum measurement', value: 'Overbought: 70 / Oversold: 30' },
                   { name: 'MACD', desc: 'Moving Average Convergence Divergence trend identifier', value: 'Golden Cross Detection' },
                   { name: 'Bollinger Bands', desc: 'Volatility measurement and price breakout zones', value: 'Adaptive Volatility Filter' },
                   { name: 'Candlestick Patterns', desc: 'Advanced recognition of reversal and continuation', value: '60+ Patterns Identified' }
                 ].map((signal, i) => (
                   <div key={i} className="p-8 bg-bg-primary border border-border-color rounded-2xl hover:border-blue-500/50 transition-all group">
                      <div className="text-blue-500 font-bold mb-4 flex items-center gap-2">
                        <Zap size={16} />
                        {signal.name}
                      </div>
                      <h3 className="text-lg font-bold mb-3 uppercase tracking-tighter">{signal.desc}</h3>
                      <div className="text-[11px] font-black uppercase tracking-widest text-text-secondary/30 group-hover:text-blue-400 transition-colors">{signal.value}</div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Live Payouts / Wins Feed */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
           <div className="max-w-7xl mx-auto">
              <h2 className="text-4xl font-bold mb-16 tracking-tight">Recent successful payouts</h2>
              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { user: 'Ahmed R.', amount: '+ $1,420.00', asset: 'BTC/USD', time: '2m ago' },
                   { user: 'Sarah K.', amount: '+ $580.50', asset: 'EUR/USD', time: '5m ago' },
                   { user: 'Jason L.', amount: '+ $2,100.00', asset: 'GOLD', time: '8m ago' }
                 ].map((win, i) => (
                   <div key={i} className="p-6 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100 hover:shadow-xl transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">{win.user[0]}</div>
                        <div>
                          <div className="font-bold text-sm tracking-tight">{win.user}</div>
                          <div className="text-[10px] uppercase font-black text-text-primary/40">{win.time}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-600 font-black">{win.amount}</div>
                        <div className="text-[10px] font-bold uppercase text-blue-600/50">{win.asset}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Awards and Recognition */}
        <section className="py-24 px-6 md:px-12 bg-bg-primary border-t border-border-color">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 opacity-40">
              <div className="flex flex-col items-center gap-4">
                 <Trophy size={48} className="text-blue-500" />
                 <div className="text-center">
                    <div className="text-text-primary font-black tracking-tighter">BEST MOBILE TRADING PLATFORM</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40">IBT Awards 2024</div>
                 </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                 <ShieldCheck size={48} className="text-blue-500" />
                 <div className="text-center">
                    <div className="text-text-primary font-black tracking-tighter">FASTEST WITHDRAWALS SYSTEM</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40">Financial Review 2025</div>
                 </div>
              </div>
              <div className="flex flex-col items-center gap-4">
                 <Star size={48} className="text-blue-500" />
                 <div className="text-center">
                    <div className="text-text-primary font-black tracking-tighter">MOST INNOVATIVE BROKER</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/40">Global Forex Expo</div>
                 </div>
              </div>
           </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
           <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                 <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Success Stories</span>
                 <h2 className="text-4xl md:text-5xl font-bold tracking-tight">What our traders say</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { name: 'Michael Thompson', role: 'Full-time Trader', text: 'The lightning-fast execution and clear interface made Onyx Option my primary tool for daily market analysis and profits.' },
                   { name: 'Elena Rodriguez', role: 'Financial Analyst', text: 'I have tried many platforms, but the level of security and withdrawal speed here is truly unmatched in the industry.' },
                   { name: 'David Wilson', role: 'Beginner Trader', text: 'The demo account and educational materials helped me understand the market within a week. Now I am trading live and confident.' }
                 ].map((testimonial, i) => (
                   <div key={i} className="p-10 rounded-3xl bg-gray-50 border border-gray-100 flex flex-col justify-between relative group hover:bg-blue-600 hover:text-white transition-all duration-500">
                      <div className="absolute top-8 left-8 text-6xl font-black opacity-10 font-serif">"</div>
                      <p className="text-lg font-medium leading-relaxed relative z-10 mb-10 italic">
                        {testimonial.text}
                      </p>
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold group-hover:bg-white transition-colors">{testimonial.name[0]}</div>
                         <div>
                            <div className="font-bold text-sm tracking-tight">{testimonial.name}</div>
                            <div className="text-[10px] uppercase font-black opacity-40 group-hover:opacity-60">{testimonial.role}</div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Global Referral Program */}
        <section className="py-32 px-6 md:px-12 bg-blue-600 text-white relative overflow-hidden">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20 relative z-10">
              <div className="flex-1">
                 <h2 className="text-4xl md:text-6xl font-black uppercase mb-8 leading-tight">Join our <br />Affiliate Network</h2>
                 <p className="text-xl opacity-80 mb-10 max-w-lg">Invite your friends and colleagues and earn up to <span className="font-black">60% RevShare</span> on their trading volume. The highest payouts in the industry.</p>
                 <div className="flex flex-wrap gap-6">
                    <div className="px-8 py-4 bg-bg-tertiary backdrop-blur-md rounded-xl border border-border-color">
                       <div className="text-2xl font-black italic">60%</div>
                       <div className="text-[10px] font-black uppercase tracking-widest opacity-60">RevShare</div>
                    </div>
                    <div className="px-8 py-4 bg-bg-tertiary backdrop-blur-md rounded-xl border border-border-color">
                       <div className="text-2xl font-black italic">Instant</div>
                       <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Payouts</div>
                    </div>
                 </div>
              </div>
              <div className="flex-1 bg-white p-12 rounded-[40px] text-text-primary">
                 <h3 className="text-2xl font-black uppercase mb-6 italic tracking-tighter">Become a Partner</h3>
                 <p className="mb-10 text-gray-500 font-medium leading-relaxed">Fill out a simple application and get access to your personalized dashboard, marketing materials, and real-time statistics.</p>
                 <button onClick={() => setView('TRADING')} className="w-full py-5 bg-blue-600 text-white font-black rounded-xl uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95">Apply for Partnership</button>
              </div>
           </div>
           <div className="absolute top-0 right-0 w-1/2 h-full bg-bg-secondary -skew-x-12 translate-x-1/2" />
        </section>

        {/* Economic Calendar Preview */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
           <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-20">
                 <div>
                    <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Market Pulse</span>
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">Economic Calendar</h2>
                 </div>
                 <p className="max-w-md text-text-primary/50 text-right font-medium">Keep track of high-impact news events that drive global market volatility and create trading opportunities.</p>
              </div>

              <div className="space-y-4">
                 {[
                   { event: 'Non-Farm Payrolls (NFP)', impact: 'High', currency: 'USD', time: '13:30 GMT', forecast: '240K' },
                   { event: 'Interest Rate Decision', impact: 'Very High', currency: 'EUR', time: '12:45 GMT', forecast: '4.50%' },
                   { event: 'CPI Consumer Price Index', impact: 'High', currency: 'GBP', time: '07:00 GMT', forecast: '3.1%' },
                   { event: 'GDP Growth Rate QoQ', impact: 'Medium', currency: 'AUD', time: '01:30 GMT', forecast: '0.4%' }
                 ].map((news, i) => (
                   <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-6 hover:bg-blue-50 transition-colors">
                      <div className="flex items-center gap-6 min-w-[250px]">
                         <div className={`w-3 h-3 rounded-full ${news.impact === 'Very High' ? 'bg-red-600 animate-pulse' : news.impact === 'High' ? 'bg-orange-500' : 'bg-blue-400'}`} />
                         <div>
                            <div className="font-bold text-sm uppercase tracking-tight">{news.event}</div>
                            <div className="text-[10px] font-black text-gray-400 uppercase">{news.impact} Impact</div>
                         </div>
                      </div>
                      <div className="flex items-center gap-12">
                         <div className="text-center">
                            <div className="font-black text-blue-600">{news.currency}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase">Currency</div>
                         </div>
                         <div className="text-center">
                            <div className="font-black">{news.forecast}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase">Forecast</div>
                         </div>
                         <div className="text-center">
                            <div className="font-black text-gray-400">{news.time}</div>
                            <div className="text-[9px] font-bold text-gray-400 uppercase">Time</div>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Account Types / VIP Section */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary">
           <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                 <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Account Levels</span>
                 <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">Trading Statuses</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                 {[
                   { title: 'Starter', deposit: '$10+', profit: 'Upto 82%', perks: ['Basic Tools', '24/7 Support', 'Standard Payouts'], color: 'bg-gray-50' },
                   { title: 'Advanced', deposit: '$500+', profit: 'Upto 85%', perks: ['Personal Manager', 'Faster Withdrawals', 'Extra Asset Access'], color: 'border-blue-600 border-2 shadow-2xl scale-105' },
                   { title: 'Expert', deposit: '$2000+', profit: 'Upto 92%', perks: ['Priority Payouts', 'Private Consulting', 'Risk-free Trades'], color: 'bg-bg-primary text-white' }
                 ].map((plan, i) => (
                   <div key={i} className={`p-10 rounded-[40px] flex flex-col justify-between transition-all duration-500 hover:-translate-y-4 ${plan.color}`}>
                      <div>
                         <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{plan.title}</h3>
                         <div className="text-sm font-bold opacity-60 mb-8 uppercase tracking-widest">Min Deposit: {plan.deposit}</div>
                         <div className="space-y-4 mb-12">
                            {plan.perks.map((perk, j) => (
                              <div key={j} className="flex items-center gap-3 font-medium">
                                 <Check size={18} className="text-blue-500" strokeWidth={3} />
                                 <span>{perk}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                      <div>
                         <div className="text-4xl font-black text-blue-600 mb-6">{plan.profit}</div>
                         <button onClick={() => setView('TRADING')} className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all ${plan.title === 'Expert' ? 'bg-blue-600 text-white' : 'bg-bg-primary text-white hover:bg-blue-600'}`}>Get {plan.title}</button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Global Trading Academy */}
        <section className="py-32 px-6 md:px-12 bg-gray-50 text-text-primary">
           <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-24 items-center">
              <div className="flex-1">
                 <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Learn to Trade</span>
                 <h2 className="text-4xl md:text-6xl font-black uppercase mb-10 leading-tight tracking-tight">Onyx <br /><span className="text-blue-600">Academy</span></h2>
                 <p className="text-xl text-text-primary/50 mb-12 leading-relaxed font-medium">
                    Master the art of technical analysis and market psychology with our comprehensive educational program. From basic concepts to professional strategies.
                 </p>
                 <div className="grid grid-cols-2 gap-8 mb-12">
                    <div>
                       <h4 className="text-lg font-black uppercase mb-2 text-blue-600">Video Courses</h4>
                       <p className="text-sm text-gray-500 font-medium">Over 50+ hours of professional video content.</p>
                    </div>
                    <div>
                       <h4 className="text-lg font-black uppercase mb-2 text-blue-600">Webinars</h4>
                       <p className="text-sm text-gray-500 font-medium">Live market analysis with expert traders.</p>
                    </div>
                 </div>
                 <button onClick={() => setView('TRADING')} className="px-10 py-5 bg-bg-primary text-white rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Start Learning</button>
              </div>
              <div className="flex-1 relative">
                 <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full" />
                 <div className="grid grid-cols-2 gap-6 relative z-10">
                    {[
                      { icon: BookOpen, title: 'Basics' },
                      { icon: CandlestickChart, title: 'Analysis' },
                      { icon: Zap, title: 'Strategies' },
                      { icon: Target, title: 'Psychology' }
                    ].map((item, i) => (
                      <div key={i} className={`p-8 bg-white rounded-3xl border border-gray-100 flex flex-col items-center transition-all hover:shadow-2xl hover:border-blue-500 hover:-translate-y-2 ${i === 1 || i === 2 ? 'mt-8' : ''}`}>
                         <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
                            <item.icon size={32} />
                         </div>
                         <h3 className="font-black uppercase tracking-tighter">{item.title}</h3>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </section>

        {/* Global Presence Map */}
        <section className="py-32 px-6 md:px-12 bg-white text-text-primary overflow-hidden">
           <div className="max-w-7xl mx-auto text-center">
              <span className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs mb-4 block">Our Reach</span>
              <h2 className="text-4xl md:text-5xl font-black uppercase mb-6 tracking-tight">Worldwide infrastructure</h2>
              <p className="text-lg text-gray-500 mb-20 max-w-2xl mx-auto font-medium">Low-latency order execution provided by 12 data centers located in major financial hubs across the globe.</p>
              
              <div className="relative h-[400px] md:h-[600px] w-full flex items-center justify-center">
                 <Globe size={600} className="text-blue-500/10 scale-150 md:scale-100" strokeWidth={0.5} />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative w-full h-full max-w-4xl">
                       <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-600 rounded-full animate-ping" />
                       <div className="absolute top-1/3 left-1/2 w-3 h-3 bg-blue-600 rounded-full animate-ping delay-300" />
                       <div className="absolute bottom-1/4 left-1/3 w-3 h-3 bg-blue-600 rounded-full animate-ping delay-700" />
                       <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-blue-600 rounded-full animate-ping delay-1000" />
                       <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-blue-600 rounded-full animate-ping delay-1500" />
                    </div>
                 </div>
              </div>
           </div>
        </section>

        {/* Professional Deposit Guide */}
        <section className="py-32 px-6 md:px-12 bg-bg-primary text-white">
           <div className="max-w-7xl mx-auto">
              <div className="text-center mb-24">
                 <h2 className="text-4xl md:text-5xl font-bold tracking-tight uppercase">Ready to trade live?</h2>
                 <p className="text-text-secondary/40 mt-4 font-medium">Follow these steps to fund your account and start your profit journey</p>
              </div>

              <div className="grid md:grid-cols-4 gap-12">
                 {[
                   { step: '01', title: 'Login', desc: 'Access your account or register a new one in seconds.' },
                   { step: '02', title: 'Finance', desc: 'Go to the Deposit section in your trading terminal.' },
                   { step: '03', title: 'Payment', desc: 'Select your preferred method (bKash, Binance, etc).' },
                   { step: '04', title: 'Profit', desc: 'Confirmation is instant. Start placing your trades.' }
                 ].map((s, i) => (
                   <div key={i} className="flex flex-col gap-6 group">
                      <div className="text-6xl font-black text-blue-500/20 group-hover:text-blue-500/40 transition-colors">{s.step}</div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">{s.title}</h3>
                      <p className="text-text-secondary/40 text-sm leading-relaxed font-medium">{s.desc}</p>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* FAQ Section */}
        <section className="py-32 px-6 md:px-12 bg-gray-50 text-text-primary">
           <div className="max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-16 tracking-tight text-center">Frequently asked questions</h2>
              <div className="space-y-4">
                 {[
                   { q: 'Is it free to register?', a: 'Yes, registration is absolutely free. You can open an account in less than a minute and start practicing with virtual funds immediately.' },
                   { q: 'How much money can I earn?', a: 'Your potential profit depends on your strategy, market conditions, and the amount of invested funds. Some assets offer payouts up to 95% per successful trade.' },
                   { q: 'Can I withdraw my money anytime?', a: 'Yes, you can request a withdrawal of your available funds at any time. We process most requests within 24 hours without any additional commission.' },
                   { q: 'What is a demo account?', a: 'A demo account is a training tool that uses virtual money. It allows you to practice trading and explore all platform features without any financial risk.' }
                 ].map((item, i) => (
                   <div key={i} className="group overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-blue-600 transition-colors">
                      <button className="w-full p-6 text-left flex justify-between items-center bg-transparent">
                         <span className="text-lg font-bold uppercase tracking-tight">{item.q}</span>
                         <HelpCircle className="text-blue-600" size={24} />
                      </button>
                      <div className="px-6 pb-6 text-text-primary/60 leading-relaxed font-medium border-t border-gray-100 pt-4 opacity-0 group-hover:opacity-100 h-0 group-hover:h-auto overflow-hidden transition-all duration-500">
                         {item.a}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Payment Methods Section */}
        <section className="py-24 px-6 md:px-12 bg-bg-primary border-y border-border-color">
           <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 items-center gap-12 opacity-80 hover:opacity-100 transition-all duration-500 cursor-default">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-6 md:h-8 mx-auto" alt="Visa" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-10 md:h-12 mx-auto" alt="Mastercard" />
                <img src="https://www.vectorlogo.zone/logos/bkash/bkash-ar21.svg" className="h-12 md:h-14 mx-auto" alt="bKash" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/57/Binance_Logo.svg" className="h-8 md:h-10 mx-auto" alt="Binance" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-8 md:h-10 mx-auto" alt="PayPal" />
                <div className="text-white font-black uppercase tracking-[0.2em] text-[10px] text-center bg-blue-600/20 py-2 px-4 rounded-full border border-blue-600/30">And 50+ more</div>
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer className="pt-32 pb-16 px-6 md:px-12 bg-bg-primary">
           <div className="max-w-7xl mx-auto">
             <div className="grid lg:grid-cols-4 gap-16 mb-24">
                <div className="lg:col-span-1">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="relative">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl overflow-hidden border border-border-color shadow-[0_8px_25px_rgba(37,99,235,0.3)] bg-white">
                        <img 
                          src="https://i.imghippo.com/files/Gtw3911Dmk.jpg" 
                          alt="Onyx Option Logo" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#040d17]" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-2xl md:text-3xl font-black tracking-tighter leading-none text-text-primary uppercase">
                        ONYX<span className="text-blue-500">ELITE</span>
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-blue-400 mt-2 leading-none">Institutional Intelligence</span>
                    </div>
                  </div>
                  <p className="text-text-secondary/30 text-sm leading-relaxed mb-10 font-medium text-justify">
                    Onyx Elite is a world-class trading ecosystem providing premium access to digital assets for over 14 million users worldwide. Registered and regulated since 2018.
                  </p>
                  <div className="flex flex-col gap-4 mb-10">
                     <button className="flex items-center gap-3 bg-bg-secondary border border-border-color px-4 py-2.5 rounded-xl hover:bg-bg-tertiary transition-colors group">
                        <div className="text-text-secondary/40 group-hover:text-text-primary"><Zap size={20} /></div>
                        <div className="text-left">
                           <div className="text-[8px] font-black uppercase tracking-widest text-text-secondary/30">Download on the</div>
                           <div className="text-xs font-black uppercase text-text-secondary/70">App Store</div>
                        </div>
                     </button>
                     <button className="flex items-center gap-3 bg-bg-secondary border border-border-color px-4 py-2.5 rounded-xl hover:bg-bg-tertiary transition-colors group">
                        <div className="text-text-secondary/40 group-hover:text-text-primary"><Zap size={20} /></div>
                        <div className="text-left">
                           <div className="text-[8px] font-black uppercase tracking-widest text-text-secondary/30">Get it on</div>
                           <div className="text-xs font-black uppercase text-text-secondary/70">Google Play</div>
                        </div>
                     </button>
                  </div>
                  <div className="flex gap-4">
                     {[Twitter, Facebook, Instagram].map((Icon, i) => (
                       <a key={i} href="#" className="w-12 h-12 rounded-xl bg-bg-secondary flex items-center justify-center hover:bg-blue-600 transition-all text-text-secondary/50 hover:text-white">
                         <Icon size={20} />
                       </a>
                     ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:col-span-3 gap-12">
                   <div className="flex flex-col gap-5">
                     <span className="text-text-primary text-[12px] font-black uppercase tracking-[0.3em] mb-4 text-blue-500">Platform</span>
                     <button onClick={() => setView('TRADING')} className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Web Terminal</button>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Mobile Apps</button>
                     <button onClick={() => { setInfoPageTitle('Assets Index'); setView('INFO_PAGE'); }} className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Assets Index</button>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Tournaments</button>
                   </div>
                   <div className="flex flex-col gap-5">
                     <span className="text-text-primary text-[12px] font-black uppercase tracking-[0.3em] mb-4 text-blue-500">Company</span>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">About Us</button>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Academy</button>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">News & Events</button>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Partnerships</button>
                   </div>
                   <div className="flex flex-col gap-5">
                     <span className="text-text-primary text-[12px] font-black uppercase tracking-[0.3em] mb-4 text-blue-500">Legal</span>
                     <button onClick={() => { setInfoPageTitle('Terms and Conditions'); setView('INFO_PAGE'); }} className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Terms of Use</button>
                     <button onClick={() => { setInfoPageTitle('Privacy Policy'); setView('INFO_PAGE'); }} className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Privacy Policy</button>
                     <button onClick={() => { setInfoPageTitle('Risk Disclosure'); setView('INFO_PAGE'); }} className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Risk Warning</button>
                     <button className="text-text-secondary/40 hover:text-text-primary transition-colors text-[13px] text-left font-bold uppercase tracking-widest leading-none">Cookie Policy</button>
                   </div>
                   <div className="hidden md:flex flex-col gap-5">
                     <span className="text-text-primary text-[12px] font-black uppercase tracking-[0.3em] mb-4 text-blue-500">Support</span>
                     <span className="text-text-secondary/60 text-sm font-bold">support@onyxoption.com</span>
                     <span className="text-text-secondary/30 text-[11px] font-bold leading-relaxed">Corporate Office:<br />Marina Bay Financial Centre,<br />Tower 3, Singapore</span>
                     <div className="mt-4 flex gap-3">
                        <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-full border border-emerald-500/20">System Online</div>
                     </div>
                   </div>
                </div>
             </div>
             
             {/* Large Risk Disclosure Footer Block */}
             <div className="p-8 md:p-12 bg-bg-secondary rounded-3xl border border-border-color mb-20 text-center md:text-left">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                   <ShieldCheck size={60} className="text-blue-500/30 shrink-0" strokeWidth={1} />
                   <div>
                      <h4 className="text-text-primary font-black uppercase tracking-[0.2em] text-xs mb-4">Official Risk Disclosure</h4>
                      <p className="text-text-secondary/20 text-[11px] leading-relaxed uppercase tracking-wider font-bold">
                        The financial products offered by the company include contracts for difference ('CFDs') and other complex financial products. Trading CFDs carries a high level of risk since leverage can work both to your advantage and disadvantage. As a result, CFDs may not be suitable for all investors because you may lose all your invested capital. You should never invest money that you cannot afford to lose. Before trading in the complex financial products offered please ensure to understand the risks involved. 
                      </p>
                   </div>
                </div>
             </div>

             <div className="flex flex-col md:flex-row justify-between items-center gap-10 pt-10 border-t border-border-color">
                <div className="flex items-center gap-8">
                   <span className="text-text-secondary/20 text-[10px] font-black uppercase tracking-[0.3em]">&copy; 2026 ONYX OPTION LTD.</span>
                   <div className="w-1 h-1 rounded-full bg-bg-tertiary" />
                   <span className="text-text-secondary/20 text-[10px] font-black uppercase tracking-[0.3em]">SECURE SSL CONNECTION</span>
                </div>
                <div className="flex gap-4 grayscale opacity-30">
                   <div className="px-4 py-2 bg-bg-secondary rounded text-[10px] font-black tracking-widest border border-border-color">PCI DSS COMPLIANT</div>
                   <div className="px-4 py-2 bg-bg-secondary rounded text-[10px] font-black tracking-widest border border-border-color">18+ ONLY</div>
                </div>
             </div>
           </div>
        </footer>
      </div>
    );
  }


  // Auth Views
  if (location.pathname === '/login' || location.pathname === '/signup') {
    if (user) {
      setTimeout(() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade'), 0);
      return <LoadingOverlay message="Redirecting..." />;
    }
    return <Auth onSuccess={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} />;
  }

  if (!user && location.pathname !== '/') {
    return <Auth onSuccess={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} />;
  }

  // Verification Gate for Email/Password users
  if (user && !user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
    return (
      <div className="fixed inset-0 bg-bg-primary flex items-center justify-center p-4">
        <EmailVerificationSheet 
          email={user.email || ''} 
          isOpen={true} 
          onClose={() => signOut(auth)} 
          onSuccess={() => {
            // Success handler will reload via EmailVerificationSheet's internal check
            // or we can force a state update here
            window.location.reload();
          }} 
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-bg-primary text-text-primary font-sans overflow-hidden select-none">
      {view === 'TRADING' && (
        <DesktopSidebar 
          currentView={view} 
          navigate={navigate} 
          activeAccount={activeAccount}
          activeTradesCount={trades.length}
          isHistoryOpen={isHistoryOpen}
          isMarketOpen={isMarketOpen}
          isRewardsOpen={isRewardsOpen}
          isActivitiesOpen={isActivitiesOpen}
          isLeaderboardOpen={isLeaderboardOpen}
          isHelpOpen={isHelpOpen}
          isAssetSelectorOpen={isAssetSelectorOpen}
          setActiveSidePanel={setActiveSidePanel}
          setIsProfileOpen={setIsProfileOpen}
          setIsPaymentsOpen={setIsPaymentsOpen}
          setIsAccountsSheetOpen={setIsAccountsSheetOpen}
        />
      )}
      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        {/* --- Side Panels Overlay (Desktop/Mobile) --- */}
        <AnimatePresence>
          {activeSidePanel && (
            <motion.div 
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 left-0 w-full md:w-[350px] bg-bg-secondary border-r border-border-color z-40 flex flex-col shadow-2xl"
            >
              <div className="p-4 flex justify-between items-center bg-bg-secondary border-b border-white/[0.03]">
                <span className="font-black uppercase text-[10px] tracking-[0.2em] text-text-secondary/60 ml-2">{activeSidePanel}</span>
                <button 
                  onClick={() => setActiveSidePanel(null)}
                  className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-white rounded-xl hover:bg-white/5 transition-all active:scale-95"
                >
                  <X size={20}/>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeSidePanel === 'TRADES' && (
                  <TradeHistoryLog 
                    trades={trades}
                    pendingOrders={[]}
                    onClose={() => setActiveSidePanel(null)}
                    currencySymbol={currency.symbol}
                    exchangeRate={exchangeRate}
                    onSelectTrade={() => {}}
                    onCancelPendingOrder={() => {}}
                    timezoneOffset={timezoneOffset}
                    inSidebar={true}
                  />
                )}
                {activeSidePanel === 'MARKET' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 pb-0">
                      <h2 className="text-2xl font-black text-white mb-1">Market</h2>
                      <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-6">Professional Tools</p>
                    </div>
                    <MarketPage hideHeader={true} />
                  </div>
                )}
                {activeSidePanel === 'HELP' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 pb-0">
                      <h2 className="text-2xl font-black text-white mb-1">Support</h2>
                      <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-6">24/7 Assistance</p>
                    </div>
                    <HelpPage 
                      supportSettings={supportSettings} 
                      user={user} 
                      socket={socket} 
                      initialView="AUTO"
                      hideHeader={true}
                      onSupportClick={() => setIsChatOpen(true)}
                      onHelpCenterClick={() => navigate('/info/help')}
                      onEducationClick={() => navigate('/info/education')}
                      onTradingTutorialsClick={() => navigate('/info/tutorials')}
                      currencySymbol={currency.symbol}
                      tutorials={tutorials}
                    />
                  </div>
                )}
                {activeSidePanel === 'REWARDS' && (
                  <div className="h-full flex flex-col">
                    <div className="p-6 pb-0">
                      <h2 className="text-2xl font-black text-white mb-1">Rewards</h2>
                      <p className="text-xs text-text-secondary uppercase font-bold tracking-widest mb-6">Tasks & Bonuses</p>
                    </div>
                    <RewardsPage 
                      turnoverRequired={turnoverRequired}
                      turnoverAchieved={turnoverAchieved}
                      userBonuses={userBonuses}
                      currencySymbol={displayCurrencySymbol} 
                      rewards={rewards}
                      balance={balance}
                      trades={trades}
                      hideHeader={true}
                      onApplyReward={(code) => {
                        setSelectedRewardCode(code);
                        handleOpenPayments('DEPOSIT');
                        setActiveSidePanel(null);
                      }}
                    />
                  </div>
                )}
                {activeSidePanel === 'INDICATORS' && (
                  <div className="p-4 text-text-secondary">Indicators panel content</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Main View Logic --- */}
        {user?.email?.toLowerCase() === 'emon@gmail.com' || user?.email?.toLowerCase() === 'hasan23@gmail.com' ? (
          <AdminPanel socket={socket} onBack={() => logout()} userEmail={user.email || ''} isRestricted={false} />
        ) : user?.email?.toLowerCase() === 'mdrajon56@gmail.com' ? (
          <AdminPanel socket={socket} onBack={() => logout()} userEmail={user.email || ''} isRestricted={true} />
        ) : view === 'PROFILE' ? (
          <ProfilePage 
            onBack={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} 
            onSettings={() => navigate('/settings')} 
            user={user} 
            onAdmin={() => navigate('/admin')} 
            setView={(v) => {
              if (v === 'REWARDS') navigate('/bonuses');
              else if (v === 'REFERRAL') navigate('/affiliate');
              else if (v === 'SETTINGS') navigate('/settings');
              else if (v === 'ADMIN') navigate('/admin');
              else setView(v as any);
            }}
            balance={balance}
            bonusBalance={bonusBalance}
            turnoverRequired={turnoverRequired}
            turnoverAchieved={turnoverAchieved}
            currency={currency}
            notifications={notifications}
            onNotificationsClick={() => setIsNotificationsOpen(true)}
            clientAds={clientAds}
            timezoneOffset={timezoneOffset}
            navigate={navigate}
          />
        ) : view === 'SETTINGS' ? (
          <SettingsPage 
            onBack={() => navigate('/profile')} 
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
            setIsAppearanceSheetOpen={setIsAppearanceSheetOpen}
            setIsCurrencySheetOpen={setIsCurrencySheetOpen}
            setIsTradingPlatformOpen={setIsTradingPlatformOpen}
            isAppearanceSheetOpen={isAppearanceSheetOpen}
            isCurrencySheetOpen={isCurrencySheetOpen}
          />
        ) : view === 'ADMIN' ? (
          <AdminPanel socket={socket} onBack={() => {
            if (user.email?.toLowerCase() === 'emon@gmail.com') {
              logout();
            } else {
              setView('TRADING');
            }
          }} userEmail={user.email || ''} />
        ) : view === 'PAY_ORDER' ? (
          <PaymentOrderPage />
        ) : null}

        {/* --- Top Navbar & Main Trading Area --- */}
        {view === 'TRADING' && !isActivitiesOpen && (
          <>
            {/* Desktop Header */}
            <header className="hidden md:flex items-center justify-between px-6 bg-bg-primary z-20 h-[72px] shrink-0 relative border-b border-border-color">
              {/* Left: Asset Selection Tabs */}
              <div className="flex items-center gap-2">
                 <button className="w-10 h-10 bg-bg-secondary hover:bg-bg-tertiary rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary transition">
                    <Plus size={18} />
                 </button>
                 <button 
                   onClick={() => setIsAssetSelectorOpen(true)}
                   className="flex items-center gap-4 px-4 h-12 bg-bg-secondary hover:bg-bg-tertiary rounded-xl active:scale-95 transition shrink-0 cursor-pointer text-left border border-border-color"
                 >
                   <div className="w-6 h-6 rounded-md overflow-hidden shrink-0 bg-bg-tertiary flex items-center justify-center">
                      <AssetIcon shortName={selectedAsset.shortName} category={selectedAsset.category} flag={selectedAsset.flag} size="sm" />
                   </div>
                   <div className="flex flex-col">
                      <div className="text-text-primary font-bold text-[12px] leading-none mb-0.5">{selectedAsset.name.split('(')[0].trim()}</div>
                      <div className="text-[10px] text-text-secondary font-medium leading-none">FT • <span className="text-text-primary/80">{currentPayout}%</span></div>
                   </div>
                 </button>
              </div>
              
              {/* Right: Account & Payments */}
              <div className="flex items-center gap-4">
                 {/* Connection Status Indicator */}
                 <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border-color">
                    <div className={cn(
                       "w-1.5 h-1.5 rounded-full shadow-[0_0_8px]",
                       isConnected ? "bg-green-500 shadow-green-500/50 animate-pulse" : "bg-red-500 shadow-red-500/50"
                    )} />
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none">
                       {isConnected ? "LIVE" : "OFFLINE"}
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
                       <span className="text-text-primary font-black text-[16px] tracking-tight">
                         {displayCurrencySymbol}{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                       </span>
                    </div>
                    <div className={cn("flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition-colors", activeAccount === 'DEMO' ? 'text-[#f59e0b]' : 'text-text-secondary')}>
                       {activeAccount === 'DEMO' ? t('account.demo') : t('account.real')} <ChevronDown size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                 </div>
                 
                 <button 
                   onClick={() => setIsPaymentsOpen(true)}
                   className="h-[48px] px-6 rounded-xl bg-[#00ff5f] text-[#0d0e12] font-black text-sm uppercase tracking-widest flex items-center justify-center transition-all hover:bg-[#00e154] active:scale-95 shadow-[0_0_25px_rgba(0,255,95,0.3)]"
                 >
                   Deposit
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
                   className="w-[48px] h-[48px] rounded-full border-2 border-border-color bg-white/[0.03] flex items-center justify-center text-text-secondary/50 cursor-pointer active:scale-95 transition hover:bg-white/[0.08] hover:text-text-primary"
                 >
                   <User size={24} strokeWidth={2.5} />
                 </button>
              </div>
            </header>

            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between px-3 bg-bg-primary z-20 border-b border-border-color h-14">
              {/* Left: Logo & Profile */}
              <div className="flex items-center gap-3">
                <div 
                  onClick={() => navigate('/profile')}
                  className="w-[38px] h-[38px] rounded-full border-2 border-border-color bg-bg-secondary flex items-center justify-center cursor-pointer active:scale-95 transition hover:bg-bg-tertiary overflow-hidden"
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
                  navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade');
                  setIsAccountsSheetOpen(true);
                }}
                className="flex flex-col items-center cursor-pointer active:scale-95 transition group"
              >
                <div className="text-text-primary font-bold text-[15px] tracking-tight leading-tight flex items-center gap-1">
                  {displayCurrencySymbol}{displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors",
                  activeAccount === 'DEMO' ? "text-orange-400" : "text-gray-500"
                )}>
                  {activeAccount === 'DEMO' ? t('account.demo') : `${currency.code} Account`} <ChevronDown size={10} className="text-gray-600" />
                </div>
              </div>

              {/* Right: Wallet/Deposit */}
              <button 
                onClick={() => setIsPaymentsOpen(true)}
                className="w-[42px] h-[42px] bg-[#00ff5f] rounded-lg flex items-center justify-center text-[#0d0e12] shadow-[0_0_20px_rgba(0,255,95,0.25)] transition active:scale-95"
              >
                <Wallet size={24} strokeWidth={2.5} />
              </button>
            </header>
          </>
        )}

        {/* Client Ads Banner Segment */}
        {clientAds.length > 0 && view === 'TRADING' && !isActivitiesOpen && (
          <div className="w-full bg-bg-secondary border-b border-border-color relative z-10 flex h-[48px] overflow-hidden items-center justify-center shrink-0">
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
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
                         <span className="text-text-primary text-xs font-black tracking-widest uppercase drop-shadow-md">{clientAds[activeAdIndex].title}</span>
                      </div>
                    </a>
                  ) : (
                    <div className="w-full h-full relative">
                      {clientAds[activeAdIndex].imageUrl && (
                         <img src={clientAds[activeAdIndex].imageUrl} alt="Ad" className="w-full h-full object-cover opacity-60" />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
                         <span className="text-text-primary text-xs font-black tracking-widest uppercase drop-shadow-md">{clientAds[activeAdIndex].title}</span>
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
          <div className="md:hidden flex items-center px-2 bg-bg-primary gap-1 overflow-x-auto scrollbar-hide border-b border-border-color h-11">
             <div 
               onClick={() => setIsAssetSelectorOpen(true)}
               className="flex items-center gap-2 px-2.5 h-8 bg-[var(--color-text-primary)]/[0.03] rounded-lg border border-[var(--color-text-primary)]/5 active:scale-95 transition shrink-0 cursor-pointer"
             >
                <div className="w-6 h-6 rounded-md overflow-hidden shrink-0">
                  <AssetIcon shortName={selectedAsset.shortName} category={selectedAsset.category} flag={selectedAsset.flag} size="sm" />
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-text-primary font-bold text-[12px] truncate max-w-[80px]">{selectedAsset.name.split('(')[0].trim()}</span>
                   <span className="text-[var(--color-success)] text-[11px] font-black">{currentPayout}%</span>
                   <ChevronDown size={10} className="text-text-secondary" />
                </div>
             </div>
             
             <div className="flex items-center h-full gap-1 ml-auto">
                <button 
                  onClick={() => setIsIndicatorSheetOpen(true)}
                  className="w-10 h-10 flex items-center justify-center text-text-secondary/80 hover:text-text-primary transition group relative ml-1 rounded-sm border-r border-border-color bg-transparent"
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
                  className="px-2 h-8 flex items-center justify-center gap-1 transition bg-[var(--color-text-primary)]/5 rounded-md border border-[var(--color-text-primary)]/5"
                >
                   <span className="text-[11px] font-black text-text-primary/90">{chartTimeFrame}</span>
                   <ChevronDown size={10} className="text-text-secondary/40" />
                </button>
                <button 
                  onClick={() => setIsServiceAgreementOpen(true)}
                  className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition group"
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
              if (id === 'DEMO') navigate('/trade/demo');
              else if (id === 'REAL') navigate('/trade/live');
              else setActiveAccount(id); // For extra accounts, handle as before for now or define routes
              setIsSwitchingAccount(false);
            }, 1000); // reduced timeout slightly for better UX
          }}
          onRefill={refillDemoBalance}
          onSetDemoBalance={handleSetCustomDemoBalance}
          accounts={[
            { id: 'DEMO', name: 'Demo account', currency: currency.code, symbol: currency.symbol, balance: demoBalance * (EXCHANGE_RATES[currency.code] || 1), type: 'DEMO', flag: currency.flag },
            { id: 'REAL', name: `${currency.code} Account`, currency: currency.code, symbol: currency.symbol, balance: (balance + bonusBalance) * (EXCHANGE_RATES[currency.code] || 1), type: 'REAL', flag: currency.flag },
            ...extraAccounts.filter(a => a.id !== 'DEMO' && a.id !== 'REAL')
          ]}
          onAddAccount={(account) => setExtraAccounts(prev => [...prev, account])}
          onDeleteAccount={(id) => {
            setExtraAccounts(prev => prev.filter(a => a.id !== id));
            if (activeAccount === id) {
              navigate('/trade/demo');
            }
          }}
          onDeposit={() => handleOpenPayments('DEPOSIT')}
          onWithdraw={() => handleOpenPayments('WITHDRAW')}
          onTransfer={() => handleOpenPayments('TRANSFER')}
          onHistory={() => handleOpenPayments('HISTORY')}
        />
      </div>

      <AnimatePresence>
        {isSwitchingAccount && (
          <LoadingOverlay message={`Switching to ${activeAccount === 'DEMO' ? 'Demo' : 'Real'} Account`} />
        )}
      </AnimatePresence>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex relative bg-bg-primary overflow-hidden">
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
                  onSettings={() => navigate('/settings')}
                  onAdmin={() => navigate('/admin')}
                  notifications={notifications}
                  onNotificationsClick={() => setIsNotificationsOpen(true)}
                  turnoverRequired={turnoverRequired}
                  turnoverAchieved={turnoverAchieved}
                  onDeposit={() => navigate('/deposit')}
                  onClose={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
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
                       if (id === 'DEMO') navigate('/trade/demo');
                       else if (id === 'REAL') navigate('/trade/live');
                       else setActiveAccount(id);
                       setIsSwitchingAccount(false);
                     }, 1000);
                   }}
                   onClose={() => setIsAccountsSheetOpen(false)}
                   onAddAccount={() => { setIsAccountsSheetOpen(false); }}
                   onDeposit={() => navigate('/deposit')}
                   onWithdraw={() => navigate('/withdraw')}
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
                <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-primary p-4 overflow-y-auto scrollbar-hide z-20">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Rewards</h2>
                    <button onClick={() => setIsRewardsOpen(false)} className="text-text-secondary hover:text-text-primary">
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
                <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-primary overflow-hidden z-20">
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
                <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-secondary overflow-y-auto scrollbar-hide z-20">
                  <HelpPage 
                    onSupportClick={() => setIsChatOpen(true)} 
                    onHelpCenterClick={() => navigate('/info/help')}
                    onEducationClick={() => navigate('/info/education')}
                    onTradingTutorialsClick={() => navigate('/info/tutorials')}
                    supportSettings={supportSettings}
                    tutorials={tutorials}
                    currencySymbol={currency.symbol}
                    onClose={() => setIsHelpOpen(false)}
                    hideHeader={true}
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
               onAccept={() => {
                 setIsServiceAgreementOpen(false);
                 setIsPaymentsOpen(true);
                 setPaymentsInitialView('DEPOSIT');
               }}
             />

             <ActivitiesSheet
                isOpen={isActivitiesOpen}
                onClose={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
                unreadAnnouncementsCount={unreadAnnouncementsCount}
                clientAds={clientAds}
                onOpenLeaderboard={() => navigate('/leaderboard')}
                onOpenRewards={() => navigate('/rewards')}
                onOpenTournaments={() => navigate('/events')} // /events or something else since /tournaments is ActivitiesSheet itself! Oh wait! 
                onOpenWhatsNew={() => navigate('/whats-new')}
                onOpenReferral={() => navigate('/affiliate')}
                onOpenCalendar={() => navigate('/calendar')}
              />

              <TournamentsPage 
                isOpen={isTournamentsOpen}
                onClose={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
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
                isFrozen={selectedAsset.isFrozen}
                precision={selectedAsset.precision || (selectedAsset.shortName.includes('JPY') || selectedAsset.shortName === 'GOLD' ? 3 : (selectedAsset.shortName === 'OIL' ? 2 : 5))}
                minMove={1 / Math.pow(10, selectedAsset.precision || (selectedAsset.shortName.includes('JPY') || selectedAsset.shortName === 'GOLD' ? 3 : (selectedAsset.shortName === 'OIL' ? 2 : 5)))}
              />
              
              {/* Desktop Chart Overlays (Timeframe selector, indicators) */}
              <div className="hidden md:flex absolute bottom-8 left-8 z-20">
                <div id="desktop-chart-toolbar" className="flex flex-col bg-bg-secondary border border-border-color rounded-[12px] shadow-2xl w-[44px] relative pointer-events-auto">
                  <button 
                    onClick={() => {
                      setActiveDesktopChartMenu(activeDesktopChartMenu === 'time' ? null : 'time');
                    }}
                    className={cn(
                      "h-11 flex flex-col items-center justify-center border-b border-border-color transition rounded-t-[12px]",
                      activeDesktopChartMenu === 'time' ? "bg-bg-tertiary" : "hover:bg-bg-tertiary"
                    )}
                  >
                    <span className={cn(
                      "text-[12px] font-bold tracking-tight transition-colors",
                      activeDesktopChartMenu === 'time' ? "text-text-primary" : "text-text-primary/80"
                    )}>{chartTimeFrame}</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setActiveDesktopChartMenu(activeDesktopChartMenu === 'type' ? null : 'type');
                    }}
                    className={cn(
                      "h-11 flex items-center justify-center border-b border-border-color transition",
                      activeDesktopChartMenu === 'type' ? "bg-bg-tertiary text-white" : "hover:bg-bg-tertiary text-text-secondary/70"
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
                      "h-11 flex items-center justify-center border-b border-border-color transition",
                      isIndicatorSheetOpen ? "bg-bg-tertiary text-white" : "hover:bg-bg-tertiary text-text-secondary/70"
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
                      "h-11 flex items-center justify-center border-b border-border-color transition",
                      isServiceAgreementOpen ? "bg-bg-tertiary text-white" : "hover:bg-bg-tertiary text-text-secondary/70"
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
                      activeDesktopChartMenu === 'tools' ? "bg-bg-tertiary text-white" : "hover:bg-bg-tertiary text-text-secondary/70"
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
                        className="absolute left-[58px] bottom-0 w-[260px] bg-bg-tertiary border border-border-color rounded-2xl shadow-2xl p-6 z-30"
                      >
                        <div className="flex items-center gap-2 mb-6">
                          <span className="text-[15px] font-bold text-text-primary tracking-tight">Candle Time Frame</span>
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-500 flex items-center justify-center text-[9px] text-gray-500 font-bold">?</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {TIME_FRAMES.map((tf) => (
                            <button
                              key={tf}
                              onClick={() => {
                                setChartTimeFrame(tf);
                                setActiveDesktopChartMenu(null);
                              }}
                              className={cn(
                                "flex items-center justify-center h-11 rounded-lg text-[13px] font-bold transition-all",
                                chartTimeFrame === tf 
                                  ? "bg-bg-tertiary text-white shadow-sm" 
                                  : "text-[#969696] hover:text-white hover:bg-bg-secondary"
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
                        className="absolute left-[58px] bottom-12 w-[280px] bg-bg-tertiary border border-border-color rounded-2xl shadow-2xl py-2 z-30"
                      >
                        <div className="px-5 py-4 border-b border-border-color mb-1">
                           <span className="text-[15px] font-bold text-text-primary tracking-wide">Chart Type</span>
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
                                chartType === type.id ? "bg-bg-tertiary" : "hover:bg-bg-secondary",
                                idx !== CHART_TYPES.length - 1 && "border-b border-border-color"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <type.icon 
                                  size={20} 
                                  strokeWidth={1.5}
                                  className={cn(
                                    "transition-colors",
                                    chartType === type.id ? "text-text-primary" : "text-gray-400 group-hover:text-gray-200"
                                  )} 
                                />
                                <span className={cn(
                                  "text-[14px] font-bold transition-colors",
                                  chartType === type.id ? "text-text-primary" : "text-[#969696] group-hover:text-gray-200"
                                )}>
                                  {type.label}
                                </span>
                              </div>
                              {chartType === type.id && <Check size={18} className="text-text-primary" strokeWidth={3} />}
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
                        className="absolute left-[58px] bottom-0 w-[300px] bg-bg-tertiary border border-border-color rounded-2xl shadow-2xl py-2 z-30 overflow-hidden"
                      >
                        <div className="px-5 py-4 border-b border-border-color mb-2">
                           <span className="text-[15px] font-bold text-text-primary tracking-wide">Indicators</span>
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
                                activeIndicators.some(i => i.id === indicator.id) ? "bg-bg-tertiary" : "hover:bg-bg-secondary"
                              )}
                            >
                              <span className={cn(
                                "text-[14px] font-medium transition-colors",
                                activeIndicators.some(i => i.id === indicator.id) ? "text-text-primary" : "text-[#969696] group-hover:text-gray-200"
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
                        className="absolute left-[58px] bottom-0 w-[240px] bg-bg-tertiary border border-border-color rounded-2xl shadow-2xl py-2 z-30"
                      >
                        <div className="px-5 py-4 border-b border-border-color mb-2">
                           <span className="text-[15px] font-bold text-text-primary tracking-wide">Drawing Tools</span>
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
                                  activeIndicators.some(i => i.id === tool.id) ? "bg-bg-tertiary" : "hover:bg-bg-secondary"
                                )}
                              >
                                <span className={cn(
                                  "text-[14px] font-medium transition-colors",
                                  activeIndicators.some(i => i.id === tool.id) ? "text-text-primary" : "text-[#969696] group-hover:text-gray-200"
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
            onViewAsset={() => { navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade'); setIsAssetSelectorOpen(true); }} 
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
        {view === 'REFERRAL' && <ReferralPage user={user} userReferralCode={userReferralCode} referralStats={referralStats} referralSettings={referralSettings} currencySymbol={displayCurrencySymbol} onBack={() => navigate('/profile')} />}
        {view === 'LEADERBOARD' && (
          <LeaderboardPage
            socket={socket}
            onBack={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} 
            currencySymbol={displayCurrencySymbol} 
            currentUser={leaderboardCurrentUser}
          />
        )}
        {view === 'CALENDAR' && <EconomicCalendar onBack={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} />}
        {view === 'PROFILE' && (
          <ProfilePage 
            onBack={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} 
            onSettings={() => navigate('/settings')}
            onAdmin={() => navigate('/admin')}
            user={user!}
            setView={(v) => {
              if (v === 'REWARDS') navigate('/bonuses');
              else if (v === 'REFERRAL') navigate('/affiliate');
              else if (v === 'SETTINGS') navigate('/settings');
              else if (v === 'ADMIN') navigate('/admin');
              else setView(v as any);
            }}
            balance={balance}
            bonusBalance={bonusBalance}
            turnoverRequired={turnoverRequired}
            turnoverAchieved={turnoverAchieved}
            currency={currency}
            notifications={notifications}
            onNotificationsClick={() => setIsNotificationsOpen(true)}
            clientAds={clientAds}
            timezoneOffset={timezoneOffset}
            navigate={navigate}
          />
        )}
        {view === 'HELP' && (
          <HelpPage 
             onSupportClick={() => setIsChatOpen(true)}
             onHelpCenterClick={() => navigate('/info/help')}
             onEducationClick={() => navigate('/info/education')}
             onTradingTutorialsClick={() => navigate('/info/tutorials')}
             supportSettings={supportSettings}
             tutorials={tutorials}
             currencySymbol={currency.symbol}
             onClose={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
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
        <div className="md:hidden bg-bg-primary px-3 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+4px)] z-20 border-t border-border-color flex flex-col gap-2 relative overflow-hidden">
          {(selectedAsset.isFrozen || !platformSettings.isTradingEnabled) && (
            <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
               <div className="w-20 h-20 bg-[var(--color-text-primary)]/[0.03] rounded-[24px] flex items-center justify-center mb-6 border border-[var(--color-text-primary)]/5 relative shadow-2xl">
                  <div className="absolute inset-0 bg-[var(--color-text-primary)]/5 blur-2xl rounded-full" />
                  <Lock size={36} className="text-text-secondary/60 relative z-10" />
               </div>
               <h3 className="text-text-primary font-black text-lg mb-1 tracking-tight uppercase">Trading is closed</h3>
               <p className="text-text-secondary text-[12px] mb-8 max-w-[240px] leading-relaxed font-medium">
                  {new Date().getDay() === 0 || new Date().getDay() === 6 
                    ? "Market is closed for the weekend. Trading will resume on Monday."
                    : "This market is currently closed for maintenance. Explore other open assets."}
                  <br />
                  <span className="text-[var(--color-success)] font-bold">Bitcoin OTC</span> is currently available.
               </p>
               <button 
                 onClick={() => setIsAssetSelectorOpen(true)}
                 className="w-full h-14 bg-bg-secondary border border-border-color shadow-xl rounded-2xl flex items-center justify-between px-6 active:scale-[0.98] transition-transform"
               >
                 <span className="text-text-primary font-extrabold text-[15px]">Enable Orders</span>
                 <div className="w-8 h-8 rounded-full bg-[var(--color-text-primary)]/5 flex items-center justify-center">
                    <Clock size={16} className="text-text-secondary/80" />
                 </div>
               </button>
            </div>
          )}
          {!selectedAsset.isFrozen && (
            <>
              {/* Info & Zoom Overlay View */}
              <div className="flex justify-between items-center text-[11px] text-text-secondary px-1">
                 <div className="flex items-center gap-2">
                    <span className="lowercase font-medium">Fixed Time mode</span>
                 </div>
                 <div className="flex items-center gap-1">
                    <span className="font-medium">Profit:</span>
                    <span className="text-text-primary font-bold">+{displayCurrencySymbol}{potentialProfit}</span>
                    <Info size={12} className="opacity-50" />
                 </div>
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-0.5">
                 {/* Duration Selector */}
                 <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center bg-bg-secondary rounded-xl border border-border-color overflow-hidden h-10">
                       <button 
                         onClick={() => {
                            if (tradeMode === 'CLOCK') setClockOffset(Math.max(1, clockOffset - 1));
                            else {
                               const arr = selectedAsset?.isOTC ? [5, 10, 15, 30, 60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800] : [60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800];
                               const idx = arr.indexOf(timerDuration);
                               if (idx > 0) setTimerDuration(arr[idx - 1]);
                            }
                         }}
                         className="w-9 h-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-[var(--color-text-primary)]/5 transition"
                       >
                          <Minus size={16} />
                       </button>
                       <div 
                         onClick={() => setIsTradeInputSheetOpen(true)}
                         className="flex-1 flex flex-col items-center justify-center leading-tight cursor-pointer"
                       >
                          <span className="text-text-primary font-bold text-[14px] whitespace-nowrap">
                             {tradeMode === 'CLOCK' ? formatWithOffset(getExpirationTime(), 'HH:mm', timezoneOffset) : (timerDuration < 60 ? `${timerDuration} sec` : `${Math.floor(timerDuration / 60)} min`)}
                          </span>
                       </div>
                       <button 
                         onClick={() => {
                            if (tradeMode === 'CLOCK') setClockOffset(clockOffset + 1);
                            else {
                               const arr = selectedAsset?.isOTC ? [5, 10, 15, 30, 60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800] : [60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800];
                               const idx = arr.indexOf(timerDuration);
                               if (idx < arr.length - 1) setTimerDuration(arr[idx === -1 ? 0 : idx + 1]);
                            }
                         }}
                         className="w-9 h-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-[var(--color-text-primary)]/5 transition"
                       >
                          <Plus size={16} />
                       </button>
                    </div>
                 </div>

                 {/* Amount Selector */}
                 <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center bg-bg-secondary rounded-xl border border-border-color overflow-hidden h-10">
                       <button 
                         onClick={() => {
                            const min = currency.code === 'BDT' ? 20 : 1;
                            setInvestment(Math.max(min, Math.floor(investment / 2)));
                         }}
                         className="w-9 h-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-[var(--color-text-primary)]/5 transition border-r border-border-color"
                       >
                          <Minus size={16} />
                       </button>
                       <div className="flex-1 h-full flex items-center justify-center relative">
                          <span className="absolute left-2.5 text-text-secondary/50 font-bold text-[10px] pointer-events-none">{currency.symbol}</span>
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
                            className="w-full h-full bg-transparent text-center font-bold text-[14px] focus:outline-none text-text-primary px-5"
                          />
                       </div>
                       <button 
                         onClick={() => setInvestment(investment * 2 || (currency.code === 'BDT' ? 20 : 1))}
                         className="w-9 h-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-[var(--color-text-primary)]/5 transition border-l border-border-color"
                       >
                          <Plus size={16} />
                       </button>
                    </div>
                 </div>
              </div>

              {/* Trade Actions */}
              <div className="flex items-center gap-2.5">
                 <button 
                   onClick={() => handleTrade('DOWN')}
                   className="flex-1 h-[50px] bg-[#ff4d4d] rounded-xl flex flex-col items-center justify-center gap-0 active:scale-[0.98] transition shadow-lg shadow-red-500/10"
                 >
                    
                    <ArrowDown size={18} strokeWidth={3} className="text-text-primary" />
                 </button>

                 <button 
                   onClick={() => setIsPendingOrderSheetOpen(true)}
                   className="w-11 h-[50px] bg-bg-secondary rounded-xl flex items-center justify-center text-text-secondary/40 hover:text-text-primary active:scale-95 transition border border-border-color"
                 >
                    <Clock size={18} />
                 </button>

                 <button 
                   onClick={() => handleTrade('UP')}
                   className="flex-1 h-[50px] bg-[#22c55e] rounded-xl flex flex-col items-center justify-center gap-0 active:scale-[0.98] transition shadow-lg shadow-emerald-500/10"
                 >
                    
                    <ArrowUp size={18} strokeWidth={3} className="text-text-primary" />
                 </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- Bottom Navigation (Mobile Only) --- */}
      <nav className="md:hidden bg-bg-primary border-t border-border-color px-4 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+2px)] flex justify-between items-center z-50">
        <NavButton 
          icon={<BarChart2 size={22} strokeWidth={view === 'TRADING' && !isActivitiesOpen ? 3 : 2} />} 
          active={view === 'TRADING' && !isActivitiesOpen} 
          onClick={() => { setIsActivitiesOpen(false); navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade'); }}
          label="Trade"
        />
        <NavButton 
          icon={<ArrowUpDown size={22} strokeWidth={view === 'TRADES' && !isActivitiesOpen ? 3 : 2} />} 
          count={activeTrades.length} 
          active={view === 'TRADES' && !isActivitiesOpen}
          onClick={() => { setIsActivitiesOpen(false); navigate('/trades'); }}
          label="Trades"
        />
        <NavButton 
          icon={<Trophy size={22} strokeWidth={isActivitiesOpen ? 3 : 2} />} 
          active={isActivitiesOpen}
          onClick={() => navigate('/tournaments')}
          label="Tournaments"
        />
        <NavButton 
          icon={<ShoppingBag size={22} strokeWidth={view === 'MARKET' && !isActivitiesOpen ? 3 : 2} />} 
          active={view === 'MARKET' && !isActivitiesOpen}
          onClick={() => { setIsActivitiesOpen(false); navigate('/market'); }}
          label="Market"
        />
        <NavButton 
          icon={<HelpCircle size={22} strokeWidth={view === 'HELP' && !isActivitiesOpen ? 3 : 2} />} 
          active={view === 'HELP' && !isActivitiesOpen}
          onClick={() => { setIsActivitiesOpen(false); navigate('/help'); }}
          label="Help"
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
          setTimeout(() => setIsLoading(false), 800); // Faster loading duration
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
        isOTC={!!selectedAsset?.isOTC}
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
              onClick={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm md:hidden"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative h-full w-full md:w-[420px] bg-bg-primary shadow-2xl flex flex-col border-l border-border-color"
            >
              <EconomicCalendar onBack={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} />
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
              onClick={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm md:hidden"
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative h-full w-full md:w-[420px] bg-bg-secondary shadow-2xl flex flex-col border-l border-border-color"
            >
              <LeaderboardPage
                socket={socket}
                onBack={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')} 
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
        onClose={() => navigate(activeAccount === 'DEMO' ? '/trade/demo' : '/trade')}
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

      <TradingPlatformSheet
        isOpen={isTradingPlatformOpen}
        onClose={() => setIsTradingPlatformOpen(false)}
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
            className="fixed bottom-0 left-0 right-0 bg-bg-primary rounded-t-[32px] z-[70] flex flex-col max-h-[85vh] border-t border-border-color"
          >
            <div className="w-12 h-1.5 bg-bg-tertiary rounded-full mx-auto mt-3 mb-4" />
            
            <div className="px-6 flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-black text-text-primary">Notifications</h2>
                <p className="text-xs text-text-secondary font-bold uppercase tracking-widest">
                  {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-text-primary border border-border-color"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10 scrollbar-hide">
              {notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notif, index) => (
                    <div 
                      key={notif.id || `notif-${index}`}
                      onClick={() => handleMarkRead(notif.id)}
                      className={cn(
                        "p-4 rounded-2xl border transition relative overflow-hidden",
                        notif.isRead 
                          ? "bg-bg-secondary border-border-color opacity-60" 
                          : "bg-bg-secondary border-blue-500/30 shadow-lg"
                      )}
                    >
                      {!notif.isRead && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                      )}
                      <div className="flex justify-between items-start mb-1">
                        <h3 className={cn("font-bold text-sm", !notif.isRead ? "text-text-primary" : "text-text-secondary")}>
                          {notif.title}
                        </h3>
                        <span className="text-[10px] text-text-secondary font-bold">
                          {formatWithOffset(notif.timestamp, 'HH:mm', timezoneOffset)}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary leading-relaxed">
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
                        <span className="text-[9px] text-text-secondary font-bold">
                          {formatWithOffset(notif.timestamp, 'MMM dd, yyyy', timezoneOffset)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-20 h-20 bg-bg-secondary rounded-full flex items-center justify-center mb-4 border border-dashed border-border-color">
                    <Bell size={32} className="text-text-secondary opacity-20" />
                  </div>
                  <h3 className="font-bold text-text-primary mb-1">No notifications yet</h3>
                  <p className="text-xs text-text-secondary max-w-[200px]">
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
      active ? "text-text-primary" : "hover:text-text-secondary"
    )}>
      <div className={cn("p-0.5 rounded-md", active && "bg-[var(--color-text-primary)]/10")}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 16 }) : icon}
      </div>
      {count !== undefined && count > 0 && (
        <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border border-[var(--color-bg-primary)]">
          {count}
        </span>
      )}
    </button>
  );
}



function TradeDetailsSheet({ trade, onClose, tickHistory, currentTime, currencySymbol, exchangeRate, timezoneOffset, inSidebar = false }: { trade: Trade, onClose: () => void, tickHistory: TickData[], currentTime: number, currencySymbol: string, exchangeRate: number, timezoneOffset: number, inSidebar?: boolean }) {
  const isWin = trade.status === 'WIN';
  const isLoss = trade.status === 'LOSS';
  const tSymbol = trade.currencySymbol || currencySymbol;
  const tRate = trade.exchangeRate || exchangeRate;
  const profit = (trade.profit !== undefined ? trade.profit : (isWin ? trade.amount * (trade.payout / 100) : -trade.amount)) * tRate;
  
  // Format profit string
  let profitString = `${tSymbol}${Math.round(Math.abs(profit))}`;
  let profitColor = 'text-gray-400';
  
  if (isWin) {
    profitString = `+${tSymbol}${Math.round(profit)}`;
    profitColor = 'text-[#22c55e]';
  } else if (isLoss) {
    profitString = `-${tSymbol}${Math.round(Math.abs(profit))}`;
    profitColor = 'text-[#ff4757]';
  } else {
    profitString = `${tSymbol}0`;
  }

  const [capturedData, setCapturedData] = useState<any[] | null>(null);

  // Generate chart data from history or fallback to simulation
  const derivedChartData = useMemo(() => {
    const isTradeActive = trade.status === 'ACTIVE';
    const endTime = isTradeActive ? currentTime : trade.endTime;
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
    // Use a deterministic seed based on trade ID to prevent "jumping" when re-rendering
    const seed = trade.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seededRandom = (n: number) => {
        const x = Math.sin(seed + n) * 10000;
        return x - Math.floor(x);
    };

    const data = [];
    const points = 40; // More points for smoother static line
    const startPrice = trade.entryPrice;
    const endPrice = trade.closePrice || trade.entryPrice;
    const duration = endTime - trade.startTime;
    
    for (let i = 0; i <= points; i++) {
      const progress = i / points;
      const trend = startPrice + (endPrice - startPrice) * progress;
      // Use seeded random for stable noise
      const noise = (seededRandom(i) - 0.5) * (Math.abs(endPrice - startPrice) * 0.4);
      
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
  }, [trade.id, trade.startTime, trade.endTime, trade.status, trade.entryPrice, trade.closePrice, tickHistory, trade.status === 'ACTIVE' ? Math.floor(currentTime / 1000) : null]);

  // Capture static data for closed trades to prevent jumps when tickHistory is pruned
  useEffect(() => {
    if (trade.status !== 'ACTIVE' && !capturedData && derivedChartData.length > 5) {
      setCapturedData(derivedChartData);
    }
  }, [trade.status, derivedChartData, capturedData]);

  const chartData = (capturedData || derivedChartData).filter(d => d.price !== undefined && d.price !== null && !isNaN(d.price));
  
  if (chartData.length === 0) {
      // Return a minimal valid state if no data available to prevent assertion errors
      return null;
  }

  const prices = chartData.map(d => d.price).concat(trade.entryPrice, trade.closePrice || trade.entryPrice).filter(p => typeof p === 'number' && !isNaN(p));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = (maxPrice - minPrice) || 0.001;
  const padding = range * 0.2 || 0.001;

  const minTime = Math.min(...chartData.map(d => d.time));
  const maxTime = Math.max(...chartData.map(d => d.time));
  const timeRange = (maxTime - minTime) || 1;

  const getCoordY = (price: number) => {
    return 100 - ((price - (minPrice - padding)) / (range + 2 * padding) * 100);
  };

  const getCoordX = (time: number) => {
    return ((time - minTime) / timeRange) * 100;
  };

  if (inSidebar) {
    return (
      <div className="flex flex-col h-full bg-bg-primary">
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
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary"
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
  const { t } = useTranslation();
  const tSymbol = trade.currencySymbol || currencySymbol;
  const tRate = trade.exchangeRate || exchangeRate;
  
  return (
    <>
      {/* Header with Title and Tabs */}
      <div className="pt-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-text-primary">{t('nav.trades')}</h1>
          <button onClick={onClose} className="p-2 text-text-secondary/60 hover:text-text-primary transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex gap-6 border-b border-border-color pb-2 mb-4">
          <span className="text-text-primary font-bold border-b-2 border-white pb-2 px-1">Fixed Time</span>
          <span className="text-text-secondary/40 font-bold px-1">Forex</span>
          <span className="text-text-secondary/40 font-bold px-1">Stocks</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 scrollbar-hide">
        {/* Asset Header Card */}
        <div className="bg-bg-tertiary rounded-3xl p-5 mb-6 border border-border-color shadow-2xl">
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
                  <span className="text-text-secondary/60 font-bold text-sm tracking-tight">{trade.assetShortName} · {trade.payout}%</span>
                </div>
                <div className="flex items-center gap-1.5 text-xl font-black text-text-primary">
                  <span>{trade.currencySymbol || currencySymbol}{Math.round(trade.amount * (trade.exchangeRate || exchangeRate))}</span>
                  {trade.type === 'UP' ? <ArrowUp size={18} className="text-success" strokeWidth={3} /> : <ArrowDown size={18} className="text-danger" strokeWidth={3} />}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-text-secondary/40 uppercase tracking-widest mb-1">1 min</span>
              <span className={cn("text-xl font-black", profitColor)}>{profitString}</span>
            </div>
          </div>

          {/* Professional Trade Path View */}
          <div className="h-48 bg-bg-secondary rounded-2xl relative overflow-hidden border border-border-color p-0 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 30, right: 30, bottom: 10, left: 30 }}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide domain={['auto', 'auto']} />
                <YAxis domain={[minPrice - padding, maxPrice + padding]} hide />
                
                <ReferenceLine x={chartData[0]?.time} stroke="var(--color-border-color)" strokeDasharray="3 3" />
                <ReferenceLine x={chartData[chartData.length - 1]?.time} stroke="var(--color-border-color)" strokeDasharray="3 3" />
                <ReferenceLine y={trade.entryPrice} stroke={trade.type === 'UP' ? 'var(--color-success)' : 'var(--color-danger)'} strokeWidth={1} strokeOpacity={0.6} />

                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="var(--color-success)" 
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
                   trade.type === 'UP' ? "bg-success" : "bg-danger"
                 )}
                 style={{ left: '20px', top: `${getCoordY(trade.entryPrice)}%`, transform: 'translateY(-50%)' }}
               >
                 {trade.type === 'UP' ? <ArrowUp size={12} className="text-text-primary" strokeWidth={4} /> : <ArrowDown size={12} className="text-text-primary" strokeWidth={4} />}
               </div>
               <div className="absolute w-1 h-1 bg-white rounded-full z-30" style={{ left: '30px', top: `${getCoordY(trade.entryPrice)}%`, transform: 'translate(-50%, -50%)' }} />
               <div className="absolute w-1 h-1 bg-white rounded-full z-30" style={{ right: '30px', top: `${getCoordY(trade.entryPrice)}%`, transform: 'translate(50%, -50%)' }} />
            </div>
          </div>
          
          <button className="w-full mt-4 py-3 bg-bg-secondary hover:bg-bg-tertiary text-white font-bold rounded-xl border border-border-color transition active:scale-[0.98] shadow-lg text-sm">
            {t('trade.show_on_chart')}
          </button>
        </div>

        {/* Details List */}
        <div className="space-y-4 mb-8">
          <DetailRow label={t('trade.amount')} value={`${tSymbol}${Math.round(trade.amount * tRate)}`} />
          <DetailRow label={t('trade.pnl')} value={profitString} valueClassName={profitColor} />
          <DetailRow 
            label={t('trade.id')} 
            value={trade.id.slice(0, 11).toUpperCase()} 
            showCopy 
            onCopy={() => navigator.clipboard.writeText(trade.id)}
          />
          <DetailRow label={t('trade.status')} value={isWin ? t('trade.with_profit') : t('trade.with_loss')} />
          <DetailRow label={t('trade.duration')} value="1 min" />
          <DetailRow label={t('trade.opened')} value={formatWithOffset(trade.startTime, 'MMM dd HH:mm:ss.SSS', timezoneOffset)} />
          <DetailRow label={t('trade.closed_time')} value={formatWithOffset(trade.endTime, 'MMM dd HH:mm:ss.SSS', timezoneOffset)} />
          <DetailRow label={t('trade.opening_quote')} value={trade.entryPrice.toFixed(5)} />
          <DetailRow label={t('trade.closing_quote')} value={trade.closePrice?.toFixed(5) || '---'} />
        </div>

        <div className="px-2 mb-8">
          <p className="text-text-secondary/40 text-[11px] leading-relaxed">
            {t('trade.tick_quotes_desc')} <span className="text-[#22c55e] font-bold">{t('trade.quotes_history')}</span>
          </p>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full bg-bg-secondary text-white font-bold py-4 rounded-2xl hover:bg-bg-tertiary transition active:scale-[0.98] shadow-xl text-sm border border-border-color"
        >
          {t('common.close')}
        </button>
      </div>
    </>
  );
}

const DetailRow = ({ label, value, valueClassName, showCopy, onCopy }: { label: string, value: string, valueClassName?: string, showCopy?: boolean, onCopy?: () => void }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-text-secondary/40 text-sm font-medium">{label}</span>
    <div className="flex items-center gap-2">
      <span className={cn("font-medium text-sm text-white", valueClassName)}>{value}</span>
      {showCopy && (
        <button onClick={onCopy} className="text-text-secondary/40 hover:text-text-primary transition">
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
  const { t } = useTranslation();
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
      "bg-bg-primary text-text-primary font-sans flex flex-col h-full",
      !inSidebar && "absolute inset-0 z-50 md:relative md:z-auto"
    )}>
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!inSidebar && (
            <button onClick={onViewAsset} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-text-primary transition">
               <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold">{t('common.trades')}</h1>
        </div>
        {inSidebar && onClose && (
          <button onClick={onClose} className="p-2 text-text-secondary hover:text-text-primary transition">
            <X size={20} />
          </button>
        )}
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-border-color px-4 mb-4">
        <button className="px-4 py-2 border-b-2 border-blue-500 font-bold text-sm text-text-primary">Fixed Time</button>
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
              className="w-full bg-bg-secondary text-text-primary font-bold py-4 rounded-2xl border border-border-color hover:bg-bg-tertiary transition-colors"
            >
              Explore Assets
            </button>
          </div>
        ) : (
          <div className="space-y-3 mb-8">
             <h2 className="text-lg font-bold mb-3 flex items-center justify-between">
                <span>{t('common.open_trades')}</span>
                <span className="text-xs font-normal text-text-secondary">{activeTrades.length} {t('common.active')}</span>
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
          <h2 className="text-lg font-bold">{t('common.closed_trades')}</h2>
          <button 
            onClick={() => setShowHistory(true)}
            className="text-xs text-text-secondary flex items-center gap-1 hover:text-text-primary transition-colors font-medium"
          >
            Show All <ChevronRight size={14}/>
          </button>
        </div>

        <div className="space-y-3">
          {totalToday === 0 ? (
            <div className="bg-bg-secondary p-4 rounded-2xl border border-border-color flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500" />
                <div>
                   <div className="text-xs text-text-secondary font-medium">Today's success</div>
                   <div className="text-sm font-bold">No trades closed today</div>
                </div>
            </div>
          ) : (
             <>
               {/* Daily Summary Box (Real logic for today)*/}
               <div 
                 onClick={() => setShowHistory(true)}
                 className="bg-bg-secondary p-4 rounded-2xl border border-border-color flex items-center gap-4 mb-4 cursor-pointer hover:bg-bg-tertiary transition-colors group"
               >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center relative flex-shrink-0"
                    style={{ 
                      background: `conic-gradient(#22c55e ${winRate * 3.6}deg, rgba(255,255,255,0.08) 0deg)`
                    }}
                  >
                    <div className="absolute inset-[3px] bg-bg-secondary rounded-full flex items-center justify-center">
                       <span className="text-[10px] font-black text-[#22c55e]">{winRate}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                     <div className="text-[10px] text-text-secondary font-black uppercase tracking-widest mb-1">Today's success</div>
                     <div className="text-sm font-bold flex flex-col">
                       <span className="text-[#22c55e]">{winsToday} of {totalToday} trades successful</span>
                       <span className="text-[10px] text-text-secondary font-normal">Success rate: {winRate}%</span>
                     </div>
                  </div>
                  <ChevronRight size={18} className="text-text-secondary group-hover:text-text-primary transition-colors" />
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
  let profitColor = 'text-text-secondary';
  let timeString = '';

  if (isActive && currentPrice !== undefined && currentTime !== undefined) {
    // Active Trade Logic
    const timeLeft = Math.max(0, Math.ceil((trade.endTime - currentTime) / 1000));
    if (timeLeft <= 0) {
      timeString = 'Closing...';
    } else {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    const isWinning = trade.type === 'UP' 
      ? currentPrice > trade.entryPrice 
      : currentPrice < trade.entryPrice;
    
    const tradeSymbol = trade.currencySymbol || currencySymbol;
    const tradeRate = trade.exchangeRate || exchangeRate;
    const payout = trade.payout || 80;

    const potentialProfit = trade.amount * (payout / 100) * tradeRate;
    
    if (isWinning) {
        profitString = `+${tradeSymbol}${potentialProfit.toFixed(2)}`;
        profitColor = 'text-[#22c55e]';
    } else {
        profitString = `-${tradeSymbol}${(trade.amount * tradeRate).toFixed(2)}`;
        profitColor = 'text-[#ff4757]';
    }

  } else {
    // Closed Trade Logic
    const isWin = trade.status === 'WIN';
    const isLoss = trade.status === 'LOSS';
    const tradeSymbol = trade.currencySymbol || currencySymbol;
    const tradeRate = trade.exchangeRate || exchangeRate;

    const profit = (trade.profit !== undefined ? trade.profit : (isWin ? trade.amount * (trade.payout / 100) : -trade.amount)) * tradeRate;

    timeString = Math.floor(trade.duration / 60) > 0 ? `${Math.floor(trade.duration / 60)} min` : `${trade.duration} sec`;

    if (isWin) {
      profitString = `+${tradeSymbol}${Math.round(profit)}`;
      profitColor = 'text-[#22c55e]';
    } else if (isLoss) {
      profitString = `-${tradeSymbol}${Math.round(Math.abs(profit))}`;
      profitColor = 'text-[#ff4757]';
    } else {
      profitString = `${tradeSymbol}0`;
      profitColor = 'text-text-secondary';
    }
  }

  return (
    <div 
      onClick={onClick}
      className="bg-bg-secondary p-4 rounded-xl border border-border-color flex items-center justify-between cursor-pointer active:scale-[0.98] transition hover:bg-bg-tertiary shadow-sm"
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <AssetIcon 
            shortName={trade.assetShortName} 
            category={trade.assetCategory} 
            flag={trade.assetFlag} 
            size="sm"
          />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-bg-secondary flex items-center justify-center border border-[var(--color-bg-secondary)] z-30">
             {trade.type === 'UP' 
               ? <ArrowUp size={10} className="text-[#22c55e]" strokeWidth={3} /> 
               : <ArrowDown size={10} className="text-[#ff4757]" strokeWidth={3} />
             }
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-text-primary font-black text-sm tracking-tight">{trade.assetShortName}</span>
            <span className="text-[10px] font-bold text-text-secondary bg-bg-primary px-1.5 py-0.5 rounded-md">{trade.payout}%</span>
          </div>
          <div className="text-[11px] text-text-secondary font-medium tracking-wide">
            {formatWithOffset(trade.startTime, 'HH:mm', 0)}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end">
        <span className={cn("font-black text-sm", profitColor)}>
          {profitString}
        </span>
        <span className={cn("text-[10px] font-bold mt-0.5", isActive ? "text-[#3b82f6]" : "text-text-secondary/50")}>
            {isActive ? timeString : 'Closed'}
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
  clientAds = [],
  timezoneOffset = 0,
  navigate
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
  clientAds?: any[],
  timezoneOffset?: number,
  navigate: (path: string) => void
}) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-[100dvh] bg-bg-primary text-text-primary font-sans flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-lg pb-10">
        
        {/* Header Icons */}
        <div className="flex justify-end items-center px-6 pt-6 gap-3">
          <button onClick={onNotificationsClick} className="p-2 text-text-primary/90 hover:bg-bg-secondary rounded-full transition relative">
            <Bell size={24} strokeWidth={2} />
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--color-bg-primary)] flex items-center justify-center text-[8px] font-black text-white">
                {unreadCount}
              </div>
            )}
          </button>
          <button onClick={onBack} className="p-2 text-text-primary/90 hover:bg-bg-secondary rounded-full transition">
            <X size={24} strokeWidth={2} />
          </button>
        </div>

        {/* User Info Section */}
        <div className="flex flex-col items-center mt-2 mb-8">
          <div className="w-28 h-28 rounded-full bg-bg-tertiary flex items-center justify-center mb-5 overflow-hidden border border-border-color shadow-xl">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={56} className="text-text-secondary" />
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-text-primary">
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </h1>
          <button 
            onClick={() => {
              const id = user?.uid?.slice(-10).toUpperCase() || '132783071';
              navigator.clipboard.writeText(id);
            }}
            className="flex items-center gap-2 text-text-secondary text-[13px] font-medium tracking-wide hover:text-text-primary transition active:scale-95 px-3 py-1 bg-bg-secondary rounded-full"
          >
            ID {user.uid?.slice(-10).toUpperCase() || '132783071'} <Copy size={14} />
          </button>

          {(user.email?.toLowerCase() === 'tasmeaykhatun565@gmail.com') && (
            <button 
              onClick={onAdmin}
              className="mt-6 bg-red-500/10 text-red-500 border border-red-500/20 px-8 py-2 rounded-full font-black text-xs transition uppercase tracking-widest hover:bg-red-500/20"
            >
              Admin Panel
            </button>
          )}
        </div>

        {/* Promotional Stories */}
        <div className="w-full mb-8">
          <div className="flex overflow-x-auto gap-3 px-4 no-scrollbar pb-2">
            {clientAds && clientAds.length > 0 && clientAds.map((ad, i) => (
                <motion.div 
                  key={ad.id || i}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => ad.linkUrl && window.open(ad.linkUrl, '_blank')}
                  className={`flex-shrink-0 w-[140px] h-[180px] rounded-[24px] bg-bg-secondary overflow-hidden relative cursor-pointer border-2 shadow-lg ${i === 0 ? 'border-[#4ade80]' : 'border-border-color'}`}
                >
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt="" className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/10" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <p className="text-[12px] font-bold leading-tight text-text-primary/95 line-clamp-3">
                      {ad.title}
                    </p>
                  </div>
                </motion.div>
              ))}
          </div>
        </div>

        {/* Menu Grid - Using exact spacing from screenshot */}
        <div className="px-4 space-y-3">
          
          {/* Account Status Block */}
          <div className="bg-bg-secondary rounded-[18px] p-4 flex items-center justify-between border border-border-color group cursor-pointer hover:bg-bg-secondary transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <ChevronsUp size={18} className="text-text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight text-text-primary">Starter</span>
            </div>
          </div>

          {/* List Menu Items */}
          <div className="bg-bg-secondary rounded-[20px] overflow-hidden border border-border-color divide-y divide-[var(--color-border-color)]">
            {[
              { label: 'Boost Cubes', icon: Box, onClick: () => navigate('/bonuses') },
              { label: 'Referral Program', icon: LinkIcon, onClick: () => navigate('/affiliate') },
            ].map((item, i) => (
              <button 
                key={i}
                onClick={item.onClick}
                className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition active:scale-[0.99] group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center text-text-secondary group-hover:text-text-primary transition">
                    <item.icon size={22} />
                  </div>
                  <span className="text-base font-medium text-text-primary transition">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-text-secondary group-hover:text-text-primary transition" />
              </button>
            ))}
          </div>

          <div className="bg-bg-secondary rounded-[20px] overflow-hidden border border-border-color">
            {[
              { label: 'Settings', icon: Settings, onClick: onSettings },
            ].map((item, i) => (
              <button 
                key={i}
                onClick={item.onClick}
                className="w-full p-4 flex items-center justify-between hover:bg-bg-tertiary transition active:scale-[0.99] group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center text-text-secondary group-hover:text-text-primary transition">
                    <item.icon size={22} />
                  </div>
                  <span className="text-base font-medium text-text-primary transition">{item.label}</span>
                </div>
                <ChevronRight size={20} className="text-text-secondary group-hover:text-text-primary transition" />
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>

  );
}

function MarketPage({ hideHeader = false }: { hideHeader?: boolean }) {
  return (
    <div className={cn("h-full overflow-y-auto pb-24 px-6 custom-scrollbar", hideHeader ? "" : "bg-bg-primary pt-10")}>
      {!hideHeader && (
        <div className="flex items-center gap-4 mb-8">
          <h1 className="text-3xl font-black text-text-primary">Market</h1>
        </div>
      )}
      
      {/* My Purchases & Rewards */}
      <button className="w-full bg-bg-secondary rounded-3xl p-6 flex items-center justify-between mb-10 active:scale-[0.98] transition border border-border-color group shadow-2xl">
        <div className="flex items-center gap-5">
           <div className="p-4 bg-bg-tertiary rounded-2xl">
              <ShoppingBag size={28} className="text-blue-500" />
           </div>
           <div>
             <span className="font-black text-text-primary text-xl tracking-tight block">My Purchases & Rewards</span>
             <span className="text-text-secondary text-sm mt-0.5 block font-medium">Manage your active tools</span>
           </div>
        </div>
        <ChevronRight size={28} className="text-text-secondary group-hover:text-text-primary" />
      </button>

      {/* Banners Carousel */}
      <div className="flex gap-6 overflow-x-auto pb-8 mb-4 scrollbar-hide snap-x">
        {/* Crypto Banner */}
        <div className="min-w-[92%] md:min-w-[48%] bg-gradient-to-br from-blue-700 to-blue-900 rounded-3xl p-8 relative overflow-hidden h-56 flex flex-col justify-center snap-center shadow-2xl shadow-blue-900/40">
          <h3 className="font-black text-4xl text-white z-10 mb-2">Crypto</h3>
          <p className="text-base text-blue-100 z-10 max-w-[70%] leading-relaxed font-medium">Strategies, signals, and themes designed for trading on crypto assets</p>
          <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-30">
             <Bitcoin size={130} className="text-white" />
          </div>
        </div>

        {/* Forex Banner */}
        <div className="min-w-[92%] md:min-w-[48%] bg-gradient-to-br from-gray-800 to-gray-950 rounded-3xl p-8 relative overflow-hidden h-56 flex flex-col justify-center snap-center border border-white/[0.1] shadow-2xl">
          <h3 className="font-black text-4xl text-white z-10 mb-2">Forex</h3>
          <p className="text-base text-gray-300 z-10 max-w-[70%] leading-relaxed font-medium">Professional tools to help you predict market trends</p>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
             <TrendingUp size={130} className="text-white" />
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-3 mb-10">
        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
        <div className="w-3 h-3 rounded-full bg-gray-700"></div>
      </div>

      {/* Grid of Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {[
          { icon: <BadgeCheck size={36} />, title: "Trading Conditions", desc: "Features that provide more beneficial trading conditions" },
          { icon: <Target size={36} />, title: "Signals", desc: "Algorithm-based recommendations on when to open trades" },
          { icon: <Shuffle size={36} />, title: "Strategies", desc: "Ready-to-use sets of tools that make it easier to spot entry and exit points" },
          { icon: <Compass size={36} />, title: "Indicators", desc: "Tools that help analyze price movements and identify entry points" },
        ].map((item, idx) => (
          <div key={idx} className="bg-bg-secondary rounded-3xl p-8 flex gap-6 items-center border border-border-color hover:border-accent-color/40 transition-all shadow-lg hover:shadow-accent-color/10">
            <div className="p-6 bg-bg-tertiary rounded-3xl text-accent-color">
                {item.icon}
            </div>
            <div>
                <h4 className="font-black text-text-primary text-xl tracking-tight">{item.title}</h4>
                <p className="text-text-secondary text-sm mt-2 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MarketCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-bg-secondary rounded-2xl p-6 flex flex-col border border-border-color active:scale-[0.98] transition cursor-pointer min-h-[200px] relative overflow-hidden">
      <div className="absolute top-6 right-6">
         <div className="w-24 h-24 rounded-[2rem] bg-bg-primary flex items-center justify-center border border-border-color shadow-inner">
            {icon}
         </div>
      </div>
      <div className="mt-auto max-w-[70%]">
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
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
  onBack,
  hideHeader = false
}: { 
  turnoverRequired: number,
  turnoverAchieved: number,
  userBonuses: any[],
  currencySymbol: string, 
  rewards: any[],
  onApplyReward: (code: string) => void,
  balance: number,
  trades: any[],
  onBack?: () => void,
  hideHeader?: boolean
}) {
  const { t } = useTranslation();
  const bonusProgress = turnoverRequired > 0 ? Math.min(100, (turnoverAchieved / turnoverRequired) * 100) : 0;

  return (
    <div className={cn("h-full w-full overflow-y-auto pb-24 scrollbar-hide text-text-primary", hideHeader ? "px-4 pt-4" : "bg-bg-primary px-5 pt-8")}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center gap-4 mb-10">
          <button onClick={onBack} className="text-text-primary hover:text-text-secondary w-10 h-10 flex items-center justify-center rounded-full bg-bg-secondary/50">
             <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[24px] font-black text-text-primary tracking-tight">Bonuses</h1>
        </div>
      )}

      {/* Bonus History */}
      <div className="mb-12">
        <h2 className="text-[17px] font-black text-text-primary mb-5 px-1 tracking-tight">Bonus History</h2>
        <div className="bg-bg-secondary/40 rounded-[28px] py-12 px-6 border border-border-color/50 text-center backdrop-blur-sm shadow-xl shadow-black/5">
            <p className="text-text-secondary font-bold text-[15px] opacity-60">No bonus history found.</p>
        </div>
      </div>

      {/* Tasks & Rewards */}
      <div className="mb-12 px-1">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[17px] font-black text-text-primary tracking-tight">Tasks & Rewards</h2>
          <div className="flex items-center gap-1 text-[#3b82f6] font-bold text-[13px] cursor-pointer hover:text-blue-400 group">
            <span>2 available</span>
            <ChevronRight size={16} strokeWidth={2.5} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-1 px-1">
          {rewards.length === 0 ? (
            <div className="w-full bg-bg-secondary rounded-[28px] p-8 border border-border-color text-center">
              <p className="text-text-secondary font-medium">No active tasks</p>
            </div>
          ) : (
            rewards.map(reward => (
              <div key={reward.id} className="min-w-[88%] bg-[#121418] rounded-[32px] p-7 border border-white/5 snap-center flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full" />
                
                <div className="relative z-10">
                   <div className="flex justify-between items-start mb-6">
                     <div className="bg-[#3b82f6] text-white text-[9px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/20">
                       {reward.category || 'PROMO CODE'}
                     </div>
                     <div className="text-[#22c55e] font-black text-[13px] bg-[#22c55e]/10 px-3 py-1 rounded-xl">
                       {reward.percentage || '110'}%
                     </div>
                   </div>
                   <h3 className="text-[22px] font-black text-text-primary leading-tight mb-3 tracking-tighter">{reward.title}</h3>
                   <p className="text-[14px] text-text-secondary font-medium leading-relaxed opacity-80 mb-8">{reward.description}</p>
                </div>

                <button 
                  onClick={() => onApplyReward(reward.value)}
                  className="w-full bg-white text-black py-4 rounded-2xl text-[15px] font-black hover:bg-gray-100 active:scale-[0.98] transition-all relative z-10 shadow-lg"
                >
                  Apply Promo Code
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Small detail to match UI density */}
      <div className="opacity-0 pb-10">Bottom spacer</div>
    </div>
  );
}


function HelpPage({ 
  onSupportClick,
  onHelpCenterClick,
  onEducationClick,
  onTradingTutorialsClick,
  onClose,
  hideHeader = false
}: { 
  user?: any; 
  socket?: any;
  supportSettings?: any;
  initialView?: string;
  onSupportClick?: () => void; 
  onHelpCenterClick?: () => void; 
  onEducationClick?: () => void; 
  onTradingTutorialsClick?: () => void; 
  tutorials?: any[];
  currencySymbol?: string;
  onClose?: () => void;
  hideHeader?: boolean;
}) {
  return (
    <div className={cn("h-full w-full flex flex-col custom-scrollbar", !hideHeader ? "bg-bg-primary text-text-primary" : "")}>
      {/* Header */}
      {!hideHeader && (
        <div className="flex justify-between items-center px-6 pt-10 pb-6">
          <h2 className="text-[28px] font-bold text-text-primary tracking-tight">Help</h2>
          <button 
            onClick={onClose} 
            className="text-text-primary hover:text-text-secondary transition"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>
      )}

      <div className={cn("px-6 pb-10", hideHeader ? "pt-6" : "")}>
        <div className="grid grid-cols-2 gap-4">
          
          <button 
            onClick={onSupportClick}
            className="bg-bg-secondary hover:bg-bg-tertiary p-5 rounded-[24px] flex flex-col justify-between transition-colors w-full text-left aspect-square max-h-[170px] border border-border-color shadow-sm"
          >
            <div className="text-text-secondary">
              <HelpCircle size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-text-primary font-bold text-[17px] mb-1.5 leading-none">Support</h3>
              <p className="text-text-secondary text-[13px] leading-[1.3] font-medium pr-2">We're here for you<br/>24/7</p>
            </div>
          </button>

          <button 
            onClick={onHelpCenterClick}
            className="bg-bg-secondary hover:bg-bg-tertiary p-5 rounded-[24px] flex flex-col justify-between transition-colors w-full text-left aspect-square max-h-[170px] border border-border-color shadow-sm"
          >
            <div className="text-text-secondary">
              <Info size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-text-primary font-bold text-[17px] mb-1.5 leading-none">Help Center</h3>
              <p className="text-text-secondary text-[13px] leading-[1.3] font-medium pr-2">Get to know<br/>the platform</p>
            </div>
          </button>

          <button 
            onClick={onEducationClick}
            className="bg-bg-secondary hover:bg-bg-tertiary p-5 rounded-[24px] flex flex-col justify-between transition-colors w-full text-left aspect-square max-h-[170px] border border-border-color shadow-sm"
          >
            <div className="text-text-secondary">
              <GraduationCap size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-text-primary font-bold text-[17px] mb-1.5 leading-none">Education</h3>
              <p className="text-text-secondary text-[13px] leading-[1.3] font-medium pr-2">Expand your<br/>knowledge</p>
            </div>
          </button>

          <button 
            onClick={onTradingTutorialsClick}
            className="bg-bg-secondary hover:bg-bg-tertiary p-5 rounded-[24px] flex flex-col justify-between transition-colors w-full text-left aspect-square max-h-[170px] border border-border-color shadow-sm"
          >
            <div className="text-text-secondary">
              <BarChart2 size={22} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-text-primary font-bold text-[17px] mb-1.5 leading-none">Trading<br/>Tutorials</h3>
              <p className="text-text-secondary text-[13px] leading-[1.3] font-medium pr-2 mt-1.5">Learn how to open<br/>a trade</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

const DesktopSidebar = ({ 
  currentView, 
  navigate,
  activeAccount,
  activeTradesCount,
  isHistoryOpen,
  isMarketOpen,
  isRewardsOpen,
  isActivitiesOpen,
  isLeaderboardOpen,
  isHelpOpen,
  isAssetSelectorOpen,
  setActiveSidePanel,
  setIsProfileOpen,
  setIsPaymentsOpen,
  setIsAccountsSheetOpen
}: { 
  currentView: string, 
  navigate: (path: string) => void,
  activeAccount: string,
  activeTradesCount: number,
  isHistoryOpen: boolean,
  isMarketOpen: boolean,
  isRewardsOpen: boolean,
  isActivitiesOpen: boolean,
  isLeaderboardOpen: boolean,
  isHelpOpen: boolean,
  isAssetSelectorOpen: boolean,
  setActiveSidePanel: (p: any) => void,
  setIsProfileOpen: (v: boolean) => void,
  setIsPaymentsOpen: (v: boolean) => void,
  setIsAccountsSheetOpen: (v: boolean) => void
}) => {
  const { t } = useTranslation();
  const tradePath = activeAccount === 'DEMO' ? '/trade/demo' : '/trade';
  
  const handleNavClick = (panelKey: string) => {
    switch (panelKey) {
      case 'TRADES': navigate('/trades'); break;
      case 'MARKET': navigate('/market'); break;
      case 'ACTIVITIES': navigate('/tournaments'); break;
      case 'REWARDS': navigate('/rewards'); break;
      case 'HELP': navigate('/help'); break;
      default: setActiveSidePanel(panelKey as any); break;
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-20 border-r border-border-color bg-bg-secondary z-30 transition-all duration-300 items-center py-4">
      <div className="mb-6 w-12 h-12 flex items-center justify-center cursor-pointer active:scale-95 transition overflow-hidden rounded-full border border-border-color shadow-lg shadow-black/80 ring-1 ring-white/5">
        <img 
          src="https://i.imghippo.com/files/Gtw3911Dmk.jpg" 
          alt="Onyx Elite Logo" 
          className="w-[120%] h-[120%] object-cover contrast-110 brightness-110"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="flex flex-col gap-2 flex-1 w-full px-2">
        <SidebarNavButton 
          icon={<BarChart2 size={20} />} 
          label={t('nav.trade')} 
          onClick={() => navigate(tradePath)} 
        />
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
          active={isMarketOpen} 
          onClick={() => handleNavClick('MARKET')} 
        />
        <SidebarNavButton 
          icon={<Trophy size={20} />} 
          label="Tournaments" 
          active={isActivitiesOpen} 
          onClick={() => handleNavClick('ACTIVITIES')} 
        />
        <SidebarNavButton 
          icon={<Gift size={20} />} 
          label="Rewards" 
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
      
      <div className="mt-auto pt-4 w-full flex flex-col items-center gap-1 text-[10px] text-text-secondary/40 font-mono">
        <span className="font-bold text-text-primary">3788</span>
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
        active ? "text-text-primary" : "text-text-secondary/40 hover:text-text-primary/80 hover:bg-bg-secondary"
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
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
      )}
    </button>
  );
};

// ... existing DesktopTradePanel ...
const PaymentsSidePanel = ({ onClose, ...props }: any) => {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-primary p-4 overflow-y-auto z-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold">Payments</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          <X size={20} />
        </button>
      </div>
      <PaymentsSheet {...props} onClose={onClose} />
    </aside>
  );
};

const HistorySidePanel = ({ onClose, trades, pendingOrders, currencySymbol, exchangeRate, onCancelPendingOrder, timezoneOffset, ...props }: any) => {
  return (
    <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-primary overflow-y-auto z-20 scrollbar-hide">
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
    <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-primary z-20 overflow-hidden">
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
    <aside className="hidden md:flex flex-col w-80 border-r border-border-color bg-bg-primary p-4 overflow-y-auto z-20 scrollbar-hide">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Market</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          <X size={20} />
        </button>
      </div>
      <MarketPage />
    </aside>
  );
};

const AccountsSidePanel = ({ accounts, activeAccount, onSelectAccount, onClose, onAddAccount, onSetDemoBalance }: any) => {
  const [showOptions, setShowOptions] = useState<string | null>(null);

  const handleSetBalance = (id: string, currentBalance: number) => {
    const newBalance = prompt("Enter new balance:", currentBalance.toString());
    if (newBalance && !isNaN(Number(newBalance))) {
      onSetDemoBalance(Number(newBalance));
    }
    setShowOptions(null);
  };

  return (
    <aside className="hidden md:flex flex-col w-[400px] border-r border-border-color bg-bg-primary overflow-hidden z-20">
      <div className="flex justify-between items-center px-6 pt-10 pb-6">
        <h2 className="text-[32px] font-bold text-text-primary tracking-tight">Accounts</h2>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition p-2">
          <X size={32} strokeWidth={2} />
        </button>
      </div>

       <div className="flex-1 overflow-y-auto px-4 space-y-4 custom-scrollbar">
          {accounts.map((account: any) => {
              const isActive = activeAccount === account.id;
              return (
                  <div 
                    key={account.id} 
                    className={cn(
                        "rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer group active:scale-[0.98]",
                        isActive ? "bg-bg-secondary border border-border-color" : "hover:bg-white/[0.03]"
                    )}
                    onClick={() => !isActive && onSelectAccount(account.id)}
                  >
                     <div className="flex items-center gap-4">
                        {/* Icon based on account type */}
                        <div className="relative">
                          {account.id === 'DEMO' ? (
                            <div className="w-10 h-10 rounded-xl bg-[#f59e0b] flex items-center justify-center border-2 border-white/20 shadow-lg">
                              <span className="text-text-primary font-black text-lg">Đ</span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-color flex items-center justify-center shadow-lg relative overflow-hidden">
                               {/* BDT flag-like icon */}
                               <div className="w-6 h-[18px] bg-[#006a4e] rounded-sm flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#f42a41]" />
                               </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col">
                           <span className="text-text-secondary font-bold text-sm leading-tight mb-1">
                              {account.id === 'DEMO' ? 'Demo account' : account.name}
                           </span>
                           <span className="text-text-primary font-bold text-[18px] tracking-tight">
                               {account.symbol}{account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                           </span>
                        </div>
                     </div>
                     
                     <div className="flex items-center gap-2 relative">
                        <MoreVertical 
                          size={24} 
                          className="text-text-secondary group-hover:text-text-primary transition cursor-pointer" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowOptions(showOptions === account.id ? null : account.id);
                          }}
                        />
                        {showOptions === account.id && account.id === 'DEMO' && (
                            <div className="absolute right-0 top-full bg-bg-secondary border border-border-color rounded-xl p-2 z-50">
                                <button 
                                  onClick={() => handleSetBalance(account.id, account.balance)}
                                  className="text-sm font-bold text-text-primary hover:text-white whitespace-nowrap"
                                >
                                    Set balance
                                </button>
                            </div>
                        )}
                     </div>
                  </div>
              );
          })}

          {/* Add Account Button */}
          <button 
            onClick={() => onAddAccount()}
            className="w-full mt-2 group flex items-center gap-4 px-6 py-5 rounded-2xl transition hover:bg-white/[0.03] active:scale-[0.98]"
          >
            <div className="w-10 h-10 flex items-center justify-center text-text-secondary group-hover:text-text-primary transition">
               <Plus size={32} strokeWidth={2} />
            </div>
            <span className="text-[17px] font-bold text-text-primary transition">Add Account</span>
          </button>
       </div>
    </aside>
  );
};

const ProfileSidePanel = ({ user, balance, bonusBalance, currency, onSettings, onAdmin, notifications, onNotificationsClick, turnoverRequired, turnoverAchieved, onClose, setView, onDeposit }: any) => {
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  return (
    <aside className="hidden md:flex flex-col w-[360px] border-r border-border-color bg-bg-primary p-6 overflow-y-auto z-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold tracking-tight text-text-primary">Profile</h2>
        <div className="flex items-center gap-3">
          <button onClick={onNotificationsClick} className="p-2 -mr-2 text-text-secondary relative hover:text-text-primary transition">
             <Bell size={20} />
             {unreadCount > 0 && (
               <div className="absolute top-1 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-[var(--color-bg-primary)] flex items-center justify-center text-[9px] font-black text-white">
                 {unreadCount}
               </div>
             )}
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-bg-secondary hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition">
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Profile Info */}
      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center border border-border-color overflow-hidden shadow-xl">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={24} className="text-text-secondary" />
            )}
          </div>
        </div>
        <div className="flex flex-col">
           <h1 className="text-[17px] font-bold mb-0.5 tracking-tight text-text-primary">{user?.displayName || user?.email?.split('@')[0]}</h1>
           <div className="flex items-center gap-2 text-text-secondary text-[13px] font-medium tracking-wide">
             <span>{user?.email}</span>
           </div>
           {(user?.email?.toLowerCase() === 'tasmeaykhatun565@gmail.com') && (
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
      <div className="bg-bg-secondary rounded-2xl p-5 mb-5 border border-border-color relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <span className="text-text-secondary text-[11px] font-bold uppercase tracking-widest">Live Balance</span>
          <div className="bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded font-bold text-[10px] uppercase tracking-wider border border-emerald-500/20">
            Real Account
          </div>
        </div>
        <div className="text-3xl font-black text-text-primary mb-6 tabular-nums tracking-tight">
          {currency.symbol}{(balance + bonusBalance).toFixed(2)}
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-primary rounded-xl p-3 border border-border-color">
            <div className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1.5">Real</div>
            <div className="text-text-primary font-bold text-sm tracking-wide">{currency.symbol}{balance.toFixed(2)}</div>
          </div>
          <div className="bg-bg-primary rounded-xl p-3 border border-border-color">
            <div className="text-text-secondary text-[10px] font-bold uppercase tracking-widest mb-1.5">Bonus</div>
            <div className="text-text-primary font-bold text-sm tracking-wide">{currency.symbol}{bonusBalance.toFixed(2)}</div>
          </div>
        </div>

        {turnoverRequired > 0 && (
          <div className="mt-5 pt-5 border-t border-border-color relative z-10">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Turnover Progress</span>
              <span className="text-emerald-400 text-[11px] font-bold tracking-wide">
                {((turnoverAchieved / Math.max(1, turnoverRequired)) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-bg-primary rounded-full overflow-hidden mb-2.5 shadow-inner">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (turnoverAchieved / Math.max(1, turnoverRequired)) * 100)}%` }}
                className="h-full bg-emerald-500"
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold tracking-wide">
              <span className="text-emerald-500/80">{currency.symbol}{turnoverAchieved.toFixed(2)} done</span>
              <span className="text-text-secondary">Target: {currency.symbol}{turnoverRequired.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
      
      <button 
        onClick={onDeposit}
        className="w-full bg-[#00ff5f] hover:bg-[#00e655] transition-all rounded-2xl py-4 flex items-center justify-center gap-3 text-black font-black text-lg shadow-[0_10px_30px_rgba(0,255,95,0.25)] active:scale-[0.98] mt-6 mb-2 group shrink-0"
      >
        <div className="w-10 h-10 bg-black/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <Wallet size={22} strokeWidth={2.5} />
        </div>
        <span className="uppercase tracking-widest text-[16px]">Deposit Now</span>
      </button>

      {/* Action Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5 mt-auto">
        <button 
          onClick={() => { onClose(); if (setView) setView('REWARDS'); }}
          className="bg-bg-secondary rounded-2xl p-4 flex flex-col items-start gap-4 border border-border-color hover:bg-bg-tertiary transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-transform group-hover:scale-105 bg-emerald-500/10 text-emerald-500">
            <Gift size={18} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Bonuses</span>
        </button>
        <button 
          onClick={() => { onClose(); if (setView) setView('REFERRAL'); }}
          className="bg-bg-secondary rounded-2xl p-4 flex flex-col items-start gap-4 border border-border-color hover:bg-bg-tertiary transition group shadow-sm"
        >
          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center transition-transform group-hover:scale-105 bg-indigo-500/10 text-indigo-500">
            <Users size={18} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">Referrals</span>
        </button>
      </div>

      <button onClick={onSettings} className="w-full bg-bg-secondary rounded-xl p-3.5 flex items-center justify-center gap-2.5 font-bold border border-border-color hover:bg-bg-tertiary transition text-sm tracking-wide shadow-sm text-text-primary">
        <Settings size={16} className="text-text-secondary" />
        <span>Settings</span>
      </button>
    </aside>
  );
};

const DesktopTradePanel = ({ 
  investment, setInvestment, currency, tradeMode, setTradeMode, timerDuration, setTimerDuration, clockOffset, setClockOffset, getExpirationTime, timezoneOffset, handleTrade, potentialProfit, displayCurrencySymbol, setIsPendingOrderSheetOpen, selectedAsset, isFrozen, isAssetSelectorOpen, setIsAssetSelectorOpen, closeAllPanels, isTradingEnabled
}: any) => {
  return (
    <aside className="hidden md:flex flex-col w-72 border-l border-border-color bg-bg-primary p-4 overflow-y-auto scrollbar-hide z-20 relative">
      {(!isTradingEnabled || isFrozen) && (
        <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
           <div className="w-24 h-24 bg-white/[0.03] rounded-[32px] flex items-center justify-center mb-8 border border-border-color relative shadow-2xl">
              <div className="absolute inset-0 bg-bg-secondary blur-2xl rounded-full" />
              <Lock size={42} className="text-text-secondary relative z-10" />
           </div>
           <h3 className="text-text-primary font-black text-xl mb-2 tracking-tight uppercase">Trading is closed</h3>
           <p className="text-text-secondary text-[13px] mb-10 leading-relaxed font-medium">
             {new Date().getDay() === 0 || new Date().getDay() === 6 
               ? "Market is closed for the weekend. Trading will resume on Monday."
               : "This market is currently closed for maintenance or scheduled break."}
             <br />
             You can explore other assets that are still open for trading.
           </p>
           <button 
             onClick={() => setIsAssetSelectorOpen(true)}
             className="w-full h-14 bg-bg-secondary border border-border-color shadow-xl rounded-2xl flex items-center justify-between px-6 active:scale-[0.98] transition-transform"
           >
             <span className="text-text-primary font-extrabold text-[15px]">Enable Orders</span>
             <div className="w-8 h-8 rounded-full bg-bg-secondary flex items-center justify-center">
                <Clock size={16} className="text-text-secondary" />
             </div>
           </button>
        </div>
      )}
      <div className="space-y-4">
        {/* Amount Section */}
        <div className="space-y-2">
           <div className="bg-bg-secondary border border-border-color rounded-xl p-3 flex flex-col group focus-within:border-emerald-500/50 transition-colors">
             <div className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Investment Amount</div>
             <div className="flex items-center gap-2">
               <span className="text-text-secondary/30 font-bold text-lg">{displayCurrencySymbol}</span>
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
                 className="w-full bg-transparent text-left font-black text-xl focus:outline-none min-w-0 text-text-primary placeholder:text-text-secondary/10"
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
               className="flex-1 h-10 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary/50 hover:text-white rounded-xl flex items-center justify-center transition border border-border-color active:scale-95 shadow-sm"
             >
               <Minus size={18} strokeWidth={2.5} />
             </button>
             <button 
               onClick={() => setInvestment((investment || 0) + 10)}
               className="flex-1 h-10 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary/50 hover:text-white rounded-xl flex items-center justify-center transition border border-border-color active:scale-95 shadow-sm"
             >
               <Plus size={18} strokeWidth={2.5} />
             </button>
           </div>
        </div>

        {/* Duration Section */}
        <div className="space-y-2">
           <div className="bg-bg-secondary rounded-lg p-3 cursor-pointer">
             <div className="text-[11px] text-gray-400 font-medium tracking-wide mb-1">Duration</div>
             <div className="flex items-baseline gap-3 text-text-primary">
                <span className="font-bold text-lg whitespace-nowrap">
                  {tradeMode === 'CLOCK' ? formatWithOffset(getExpirationTime(), 'HH:mm', timezoneOffset) : (timerDuration < 60 ? `${timerDuration} sec` : `${Math.floor(timerDuration / 60)} min`)}
                </span>
                {tradeMode === 'CLOCK' && (
                  <span className="text-[11px] text-gray-500 font-medium">{formatWithOffset(getExpirationTime(), 'MM/dd', timezoneOffset)}</span>
                )}
             </div>
           </div>
           <div className="flex items-center gap-2">
             <button 
               onClick={() => {
                  if (tradeMode === 'CLOCK') setClockOffset(Math.max(1, clockOffset - 1));
                  else {
                     const arr = selectedAsset?.isOTC ? [5, 10, 15, 30, 60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800] : [60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800];
                     const idx = arr.indexOf(timerDuration);
                     if (idx > 0) setTimerDuration(arr[idx - 1]);
                  }
               }}
               className="flex-1 h-8 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary/60 hover:text-white rounded-lg flex items-center justify-center transition"
             >
               <Minus size={16} />
             </button>
             <button 
               onClick={() => {
                  if (tradeMode === 'CLOCK') setClockOffset(clockOffset + 1);
                  else {
                     const arr = selectedAsset?.isOTC ? [5, 10, 15, 30, 60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800] : [60, 120, 180, 240, 300, 600, 900, 1800, 3600, 7200, 14400, 28800];
                     const idx = arr.indexOf(timerDuration);
                     if (idx < arr.length - 1) setTimerDuration(arr[idx === -1 ? 0 : idx + 1]);
                  }
               }}
               className="flex-1 h-8 bg-bg-secondary hover:bg-bg-tertiary text-text-secondary/60 hover:text-white rounded-lg flex items-center justify-center transition"
             >
               <Plus size={16} />
             </button>
           </div>
        </div>

        {/* Pending Order / Mode Switch */}
        <div className="pt-2">
          <button 
            onClick={() => setIsPendingOrderSheetOpen(true)}
            className="w-full h-12 bg-bg-secondary hover:bg-bg-tertiary rounded-lg flex items-center justify-between px-4 transition active:scale-[0.98]"
          >
            <span className="text-[13px] font-bold text-text-primary">Enable Orders</span>
            <Clock size={16} className="text-text-secondary/60" />
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


