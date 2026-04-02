import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Wallet, 
  Lock, 
  Check, 
  Search,
  CreditCard,
  Bitcoin,
  Smartphone,
  Banknote,
  Percent,
  Info,
  Copy,
  AlertCircle,
  Clock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils';

import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

interface DepositFlowProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  currencyCode: string;
  initialPromoCode?: string | null;
  socket?: any;
  userEmail?: string;
  rawBalance?: number;
  userId?: string;
}

type Step = 'SUMMARY' | 'PAYMENT_METHOD' | 'AMOUNT_SELECTION' | 'PROMO_SELECTION' | 'PAYMENT_DETAILS' | 'CONFIRMATION';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'POPULAR' | 'E-PAY' | 'CRYPTO';
  minAmount: string;
  isPopular?: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bkash_p2c', name: 'bKash', icon: <div className="w-10 h-10 flex items-center justify-center bg-pink-600 text-white rounded-md font-bold text-xs">bKash</div>, category: 'E-PAY', minAmount: '$10.00', isPopular: true },
  { id: 'binance_pay', name: 'BinancePay', icon: <div className="w-8 h-8 bg-[#f3ba2f] rounded-lg flex items-center justify-center text-[14px] font-bold text-black shadow-sm">B</div>, category: 'E-PAY', minAmount: '$10.00', isPopular: true },
  { id: 'usdt_bep20', name: 'USDT (BSC BEP-20)', icon: <div className="w-8 h-8 bg-[#26a17b] rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">T</div>, category: 'CRYPTO', minAmount: '$10.00', isPopular: true },
  { id: 'bank_card', name: 'Bank card', icon: <div className="w-8 h-8 bg-[#00529b] rounded-lg flex items-center justify-center text-white shadow-sm"><CreditCard size={18} /></div>, category: 'E-PAY', minAmount: '$10.00', isPopular: true },
  { id: 'usdt_trc20', name: 'USDT (TRC20)', icon: <div className="w-8 h-8 bg-[#26a17b] rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">T</div>, category: 'CRYPTO', minAmount: '$10.00', isPopular: true },
  { id: 'skrill', name: 'Skrill', icon: <div className="w-8 h-8 bg-[#8c1515] rounded-lg flex items-center justify-center text-[14px] font-bold text-white shadow-sm">S</div>, category: 'E-PAY', minAmount: '$10.00', isPopular: true },
  { id: 'xrp', name: 'XRP', icon: <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">X</div>, category: 'CRYPTO', minAmount: '$15.00', isPopular: true },
  { id: 'usdt_ton', name: 'USDT (TON)', icon: <div className="w-8 h-8 bg-[#0088cc] rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">T</div>, category: 'CRYPTO', minAmount: '$15.00', isPopular: true },
  { id: 'bitcoin', name: 'Bitcoin', icon: <div className="w-8 h-8 bg-[#f7931a] rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">B</div>, category: 'CRYPTO', minAmount: '$10.00', isPopular: true },
  { id: 'usdc_erc20', name: 'USD Coin (ERC20)', icon: <div className="w-8 h-8 bg-[#2775ca] rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">U</div>, category: 'CRYPTO', minAmount: '$10.00', isPopular: true },
  { id: 'usdc_bep20', name: 'USD Coin (BSC BEP-20)', icon: <div className="w-8 h-8 bg-[#2775ca] rounded-full flex items-center justify-center text-[14px] font-bold text-white shadow-sm">U</div>, category: 'CRYPTO', minAmount: '$10.00', isPopular: true },
  
  { id: 'nagad_p2c', name: 'Nagad', icon: <img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/nagad.png" alt="Nagad" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'rocket_p2c', name: 'Rocket', icon: <img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/rocket.png" alt="Rocket" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'upay_p2c', name: 'Upay', icon: <img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/upay.png" alt="Upay" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'upi', name: 'UPI', icon: <div className="w-8 h-8 bg-[#ff5c00] rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm">UPI</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'perfect_money', name: 'Perfect Money', icon: <div className="w-8 h-8 bg-[#d4af37] rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm">PM</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'advcash', name: 'AdvCash', icon: <div className="w-8 h-8 bg-[#79b928] rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm">ADV</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'payeer', name: 'Payeer', icon: <div className="w-8 h-8 bg-[#00adef] rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm">P</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'webmoney', name: 'WebMoney', icon: <div className="w-8 h-8 bg-[#0072bc] rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm">WM</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'ethereum', name: 'Ethereum (ETH)', icon: <div className="w-8 h-8 bg-[#627eea] rounded-full flex items-center justify-center text-[12px] font-bold text-white">E</div>, category: 'CRYPTO', minAmount: '$10.00' },
  { id: 'litecoin', name: 'Litecoin (LTC)', icon: <div className="w-8 h-8 bg-[#345d9d] rounded-full flex items-center justify-center text-[12px] font-bold text-white">L</div>, category: 'CRYPTO', minAmount: '$10.00' },
  { id: 'stellar', name: 'Stellar (XLM)', icon: <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">S</div>, category: 'CRYPTO', minAmount: '$10.00' },
  { id: 'dogecoin', name: 'Dogecoin (DOGE)', icon: <div className="w-8 h-8 bg-[#ba9f33] rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm">D</div>, category: 'CRYPTO', minAmount: '$10.00' },
  { id: 'paypal', name: 'PayPal', icon: <div className="w-8 h-8 bg-[#003087] rounded-lg flex items-center justify-center text-[14px] font-bold text-white shadow-sm">P</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'neteller', name: 'Neteller', icon: <div className="w-8 h-8 bg-[#83bb26] rounded-lg flex items-center justify-center text-[14px] font-bold text-white shadow-sm">N</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'onyx_option_pay', name: 'Onyx Option Pay', icon: <div className="w-8 h-8 bg-[#000000] rounded-lg flex items-center justify-center text-[14px] font-bold text-white shadow-sm">O</div>, category: 'E-PAY', minAmount: '$10.00' },
  { id: 'hamproo_pay', name: 'Hamproo Pay', icon: <div className="w-8 h-8 bg-[#E2136E] rounded-lg flex items-center justify-center text-[14px] font-bold text-white shadow-sm">H</div>, category: 'E-PAY', minAmount: '$10.00', isPopular: true },
];

const PRESET_AMOUNTS = [10, 20, 50, 100, 250, 500];

const PROMO_CODES = [
  { code: 'LUNAR2026', description: 'Use LUNAR2026 when depositing $10+', bonus: '110%', expires: 'Mar 9' },
  { code: 'UE5QMQZ0E8', description: 'Use UE5QMQZ0E8 when depositing $250+', bonus: 'UP TO 100%', expires: 'Mar 9', title: 'Advanced Status' },
  { code: 'ONPAY', description: 'Use ONPAY when depositing $15+', bonus: 'UP TO 100%', expires: 'Mar 13', title: 'Deposit Bonus' },
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

const SummaryView = ({ onClose, selectedMethod, amount, currencyCode, currencySymbol, promoInput, selectedPromo, setStep, userId, rawBalance, promoCodes, handleNextToDetails }: any) => {
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="p-3 flex items-center justify-between shrink-0 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">Deposit</h2>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} 
          className="p-1.5 hover:bg-white/10 rounded-full transition cursor-pointer"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-3 pb-12 scrollbar-hide">
        {/* Account Info */}
        <div className="px-1 pt-2">
          <p className="text-[12px] text-[#7E7E7E] font-medium">
            {currencyCode} Account #{userId?.slice(-10).toUpperCase() || '2914496110'}
          </p>
        </div>

        <div className="space-y-2">
          {/* Payment Method Selector */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setStep('PAYMENT_METHOD');
            }}
            className="w-full bg-[#1a1b1e] rounded-lg p-3 flex items-center justify-between hover:bg-[#25262b] transition-all cursor-pointer group border border-white/5"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-[#25262b] rounded-md">
                {selectedMethod.icon}
              </div>
              <div className="text-left">
                <p className="text-[11px] text-[#7E7E7E] font-medium">Payment method</p>
                <p className="text-sm font-bold text-white">{selectedMethod.name}</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#7E7E7E]" />
          </button>

          {/* Amount Selector */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setStep('AMOUNT_SELECTION');
            }}
            className="w-full bg-[#1a1b1e] rounded-lg p-3 flex items-center justify-between hover:bg-[#25262b] transition-all cursor-pointer group border border-white/5"
          >
            <div className="text-left">
              <p className="text-[11px] text-[#7E7E7E] font-medium">Amount</p>
              <p className="text-sm font-bold text-white">{currencyCode} {amount.toLocaleString()}</p>
            </div>
            <ChevronRight size={18} className="text-[#7E7E7E]" />
          </button>

          {/* Promo Code Selector */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setStep('PROMO_SELECTION');
            }}
            className="w-full bg-[#1a1b1e] rounded-lg p-3 flex items-center justify-between hover:bg-[#25262b] transition-all cursor-pointer group border border-white/5"
          >
            <div className="text-left">
              <p className="text-[11px] text-[#7E7E7E] font-medium">Promo Code</p>
              <p className="text-sm font-bold text-white">
                {selectedPromo === 'ACTIVE' ? promoInput : 'Choose Promo Code'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedPromo === 'ACTIVE' ? (
                <div className="bg-[#00ff00]/10 text-[#00ff00] text-[10px] font-bold px-1.5 py-0.5 rounded">
                  {promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0}% BONUS
                </div>
              ) : (
                <span className="text-sm font-bold text-white">{promoCodes?.length || 0}</span>
              )}
              <ChevronRight size={18} className="text-[#7E7E7E]" />
            </div>
          </button>

          {selectedPromo === 'ACTIVE' && (
            <div className="bg-[#00ff00]/5 border border-[#00ff00]/10 rounded-lg p-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#7E7E7E]">Bonus Amount</span>
                <span className="text-[#00ff00] font-bold">
                  +{currencyCode} {Math.round(amount * ((promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0) / 100)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-white/5 text-xs">
                <span className="text-[#7E7E7E]">Total to Receive</span>
                <span className="text-white font-bold">
                  {currencyCode} {(amount + Math.round(amount * ((promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0) / 100))).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="pt-1 space-y-4">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleNextToDetails();
            }}
            className="w-full bg-[#00ff00] hover:bg-[#00e600] text-black font-bold py-3 rounded-lg transition-all active:scale-[0.98] text-base cursor-pointer shadow-lg shadow-green-500/10"
          >
            Next
          </button>

          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7E7E7E] border border-white/5">
              <Lock size={18} />
            </div>
            <p className="text-[11px] text-[#7E7E7E] max-w-[260px] leading-tight">
              Your data is encrypted using 256-bit SSL certificates, providing you with the strongest security available
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentMethodSelection = ({ handleBack, selectedMethod, setSelectedMethod, setStep, depositSettings }: any) => {
    const [activeCategory, setActiveCategory] = useState<'ALL' | 'RECOMMENDED' | 'E-PAY' | 'CRYPTO'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const allMethods = [
      ...PAYMENT_METHODS,
      ...(depositSettings?.customMethods || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        icon: m.logo ? <img src={m.logo} alt={m.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" /> : <div className="w-10 h-10 flex items-center justify-center bg-gray-600 text-white rounded-md font-bold text-xs">{m.name.slice(0, 2)}</div>,
        category: m.category === 'MOBILE' ? 'E-PAY' : m.category,
        minAmount: '$10.00'
      }))
    ];

    const filteredMethods = allMethods.map(m => {
      const logo = depositSettings?.methodLogos?.[m.id];
      return {
        ...m,
        icon: logo ? <img src={logo} alt={m.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" /> : m.icon
      };
    }).filter(m => {
      const isEnabled = depositSettings?.enabledMethods ? depositSettings.enabledMethods.includes(m.id) : true;
      if (!isEnabled) return false;

      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="p-2 flex items-center justify-between border-b border-white/5">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }} 
            className="p-1.5 -ml-1 hover:bg-white/5 rounded-full transition cursor-pointer"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <h2 className="text-sm font-bold text-white">Deposit</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide pb-8">
          {/* Selected Method Box (Matches Image Header) */}
          <div className="w-full bg-[#1a1b1e] rounded-lg border border-blue-500/30 p-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center bg-[#25262b] rounded-md">
                {selectedMethod.icon}
              </div>
              <span className="text-base font-bold text-white">{selectedMethod.name}</span>
            </div>
            <ChevronRight size={18} className="text-white rotate-[-90deg]" />
          </div>

          {/* Search Bar (Matches Image) */}
          <div className="relative">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search size={16} className="text-[#7E7E7E]" />
            </div>
            <input 
              type="text"
              placeholder="Search by deposit method"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1b1e] border border-white/5 rounded-lg py-2.5 pl-10 pr-3 text-white text-xs focus:outline-none focus:border-blue-500/20 transition-all placeholder-[#7E7E7E]"
            />
          </div>

          {/* Methods List (Matches Image) */}
          <div className="bg-[#1a1b1e] rounded-lg overflow-hidden border border-white/5">
            {filteredMethods.map(method => {
              const isSelected = method.id === selectedMethod.id;
              return (
                <button
                  key={method.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMethod(method);
                    setStep('SUMMARY');
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 transition-all text-left cursor-pointer group",
                    isSelected ? "bg-[#3b82f6] text-white" : "hover:bg-white/5 text-[#7E7E7E]"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border transition-colors",
                    isSelected ? "bg-white/20 border-white/20" : "bg-[#25262b] border-white/10"
                  )}>
                    {method.icon}
                  </div>
                  <span className={cn(
                    "text-sm font-bold flex-1",
                    isSelected ? "text-white" : "text-white/90"
                  )}>
                    {method.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
};

const AmountSelection = ({ handleBack, amount, setAmount, amountError, setAmountError, currencyCode, currencySymbol, minDeposit, setStep }: any) => {
    const rate = EXCHANGE_RATES[currencyCode] || 1;
    const presets = currencyCode === 'BDT' 
      ? [10000, 5000, 2000, 1000, 500] 
      : [Math.round(500 * rate), Math.round(250 * rate), Math.round(100 * rate), Math.round(50 * rate), Math.round(20 * rate), Math.round(10 * rate)];

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="p-2 flex items-center justify-between border-b border-white/5">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }} 
            className="p-1.5 -ml-1 hover:bg-white/5 rounded-full transition cursor-pointer"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <h2 className="text-sm font-bold text-white">Deposit</h2>
          <div className="w-8" />
        </div>

        <div className="px-3 pb-1 pt-2">
          <h1 className="text-lg font-bold text-white mb-2">Deposit Amount</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-4 pb-12 scrollbar-hide">
          {/* Input Field */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-[#7E7E7E] font-black uppercase tracking-[0.15em] ml-1">Enter Amount</label>
            <div className={cn(
              "bg-[#1a1b1e] rounded-xl p-3 border-2 transition-all shadow-inner flex items-center gap-3",
              amountError ? "border-red-500" : "border-transparent focus-within:border-[#00ff00]/20"
            )}>
              <span className="text-xl font-black text-[#7E7E7E]">{currencySymbol}</span>
              <input 
                type="number" 
                value={isNaN(amount) || !amount ? '' : amount}
                onChange={(e) => {
                  const val = e.target.value;
                  let num = Number(val);
                  setAmount(num);
                  setAmountError(null);
                }}
                className="w-full bg-transparent text-2xl font-black text-white focus:outline-none placeholder-[#7E7E7E]/20"
                placeholder="0.00"
                autoFocus
              />
            </div>
            {amountError && <p className="text-[10px] text-red-500 font-bold ml-1">{amountError}</p>}
          </div>

          {/* Preset Grid */}
          <div className="space-y-2">
            <label className="text-[10px] text-[#7E7E7E] font-black uppercase tracking-[0.15em] ml-1">Quick Select</label>
            <div className="grid grid-cols-3 gap-1.5">
              {presets.map(val => (
                <button
                  key={val}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAmount(val);
                    setAmountError(null);
                  }}
                  className={cn(
                    "py-2.5 rounded-lg bg-[#1a1b1e] transition-all font-black text-xs border-2 active:scale-95",
                    amount === val ? "border-[#00ff00] text-[#00ff00] bg-[#00ff00]/5" : "border-transparent text-white hover:border-white/10"
                  )}
                >
                  {currencySymbol}{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="pt-2">
            <button 
              disabled={!!amountError || !amount || amount < minDeposit}
              onClick={(e) => {
                e.stopPropagation();
                setStep('SUMMARY');
              }}
              className={cn(
                "w-full font-black py-3 rounded-lg transition-all active:scale-[0.98] text-base shadow-lg cursor-pointer",
                (!amountError && amount >= minDeposit) 
                  ? "bg-[#00ff00] text-black shadow-green-500/10" 
                  : "bg-[#1a1b1e] text-[#7E7E7E] cursor-not-allowed opacity-50"
              )}
            >
              Confirm Amount
            </button>
            <p className="text-center text-[9px] text-[#7E7E7E] mt-3 font-medium">
              Minimum deposit for {currencyCode} is {currencySymbol}{minDeposit}
            </p>
          </div>
        </div>
      </div>
    );
};

const PromoSelection = ({ handleBack, amount, currencyCode, currencySymbol, depositSettings, selectedPromo, setSelectedPromo, promoInput, setPromoInput, setStep, promoCodes }: any) => {
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validateFormat = (code: string) => {
      if (!code) return null;
      if (code.length < 4) return 'Code must be at least 4 characters';
      if (code.length > 20) return 'Code is too long (max 20 characters)';
      if (!/^[A-Z0-9_-]+$/.test(code)) return 'Only letters, numbers, underscores and hyphens allowed';
      return null;
    };

    const validateAndApply = (code: string) => {
      setError(null);
      
      const formatError = validateFormat(code);
      if (formatError) {
        setError(formatError);
        return;
      }

      const promo = promoCodes.find((p: any) => p.code.toUpperCase() === code.toUpperCase());
      
      if (!promo) {
        setError('Invalid promo code');
        return;
      }

      const now = Date.now();
      if (promo.expiresAt && now > promo.expiresAt) {
        setError('This promo code has expired');
        return;
      }

      const rate = EXCHANGE_RATES[currencyCode] || 1;
      const amountUSD = amount / rate;
      if (amountUSD < promo.minDeposit) {
        setError(`Minimum deposit for this code is ${currencySymbol}${Math.round(promo.minDeposit * rate).toLocaleString()}`);
        return;
      }

      setPromoInput(promo.code);
      setSelectedPromo('ACTIVE');
      setStep('SUMMARY');
    };

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="p-2 flex items-center justify-between border-b border-white/5">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }} 
            className="p-1.5 -ml-1 hover:bg-white/5 rounded-full transition cursor-pointer"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <h2 className="text-sm font-bold text-white">Deposit</h2>
          <div className="w-8" />
        </div>

        <div className="px-3 pb-1 pt-2">
          <h1 className="text-lg font-bold text-white mb-2">Choose Promo Code</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-12 scrollbar-hide">
          {/* Manual Entry */}
          <div className="bg-[#1a1b1e] rounded-lg p-3 shadow-sm border border-white/5">
            <label className="block text-[10px] text-[#7E7E7E] uppercase font-bold mb-1.5">Enter Manual Code</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={manualCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setManualCode(val);
                  setError(validateFormat(val));
                }}
                placeholder="PROMO123"
                className={cn(
                  "flex-1 bg-black/20 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition",
                  error ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#00ff00]"
                )}
              />
              <button 
                onClick={() => validateAndApply(manualCode)}
                disabled={!manualCode}
                className="bg-[#00ff00] text-black font-bold px-4 rounded-lg hover:bg-[#00dd00] transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Apply
              </button>
            </div>
            {error && <p className="text-red-500 text-[10px] mt-1.5">{error}</p>}
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#0a0a0a] px-2 text-[#7E7E7E]">Or choose from active</span>
            </div>
          </div>

          {/* Active Promos from Admin */}
          {promoCodes.length > 0 ? (
            promoCodes.map((promo: any) => {
              const now = Date.now();
              const isExpired = promo.expiresAt && now > promo.expiresAt;
              const rate = EXCHANGE_RATES[currencyCode] || 1;
              const isMinNotMet = (amount / rate) < promo.minDeposit;

              return (
                <div key={promo.id} className={`bg-[#1a1b1e] rounded-lg overflow-hidden shadow-sm border border-white/5 ${isExpired ? 'opacity-50 grayscale' : ''}`}>
                  <div className="p-3 relative">
                    <div className="text-[10px] text-[#7E7E7E] mb-0.5">
                      {isExpired ? 'Expired' : `Expires on ${new Date(promo.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{promo.title || 'Deposit Bonus'}</h3>
                    <p className="text-[12px] text-[#7E7E7E] max-w-[200px] leading-tight">
                      Use {promo.code} when depositing {currencyCode} {Math.round(promo.minDeposit * rate).toLocaleString()}+
                    </p>
                    
                    {/* Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="relative w-11 h-11 flex items-center justify-center">
                        <div className={`absolute inset-0 bg-[#00ff00] rounded-full opacity-20 ${!isExpired ? 'animate-pulse' : ''}`} />
                        <div className="bg-[#00ff00] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md rotate-[-15deg] shadow-sm z-10 text-center leading-tight">
                          UP TO<br/>{promo.bonusPercentage}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    disabled={isExpired || isMinNotMet}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPromoInput(promo.code);
                      setSelectedPromo('ACTIVE');
                      setStep('SUMMARY');
                    }}
                    className={`w-full py-2.5 border-t border-white/5 font-bold transition cursor-pointer text-xs ${isExpired || isMinNotMet ? 'text-[#7E7E7E] cursor-not-allowed' : 'text-[#00ff00] hover:bg-white/5'}`}
                  >
                    {isExpired ? 'Expired' : isMinNotMet ? 'Min. Deposit Not Met' : 'Apply Promo Code'}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-[#7E7E7E] text-xs">
              No active promo codes available.
            </div>
          )}
        </div>
      </div>
    );
};

const PaymentDetails = ({ handleBack, selectedMethod, amount, currencyCode, currencySymbol, depositSettings, transactionId, setTransactionId, handleSubmitDeposit, isProcessing }: any) => {
    const [copied, setCopied] = useState(false);
    const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes as per image
    const [loading, setLoading] = useState(true);
    const [numberIndex, setNumberIndex] = useState(0);

    const getNumbersArray = () => {
      if (selectedMethod.id.includes('bkash')) return depositSettings.bkashNumbers || [];
      if (selectedMethod.id.includes('nagad')) return depositSettings.nagadNumbers || [];
      if (selectedMethod.id.includes('rocket')) return depositSettings.rocketNumbers || [];
      if (selectedMethod.id.includes('upay')) return depositSettings.upayNumbers || [];
      if (selectedMethod.id.includes('onyx_option_pay')) return depositSettings.onyxOptionPayNumbers || [];
      if (selectedMethod.id.includes('hamproo_pay')) return depositSettings.hamprooPayNumbers || [];
      
      if (selectedMethod.id.startsWith('custom_')) {
        const custom = (depositSettings.customMethods || []).find((m: any) => m.id === selectedMethod.id);
        return custom?.accounts || [];
      }
      
      return [];
    };

    const numbers = getNumbersArray();

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 10000);
        return () => clearTimeout(timer);
    }, []);

    // Select a rotated number index when the component mounts or method changes
    useEffect(() => {
      if (numbers.length > 1) {
        // Get the last used index for this method from localStorage to ensure rotation
        const storageKey = `deposit_index_${selectedMethod.id}`;
        const lastIndex = parseInt(localStorage.getItem(storageKey) || '-1');
        const nextIndex = (lastIndex + 1) % numbers.length;
        
        setNumberIndex(nextIndex);
        localStorage.setItem(storageKey, nextIndex.toString());
      } else {
        setNumberIndex(0);
      }
    }, [selectedMethod.id, numbers.length]);

    const isLocalMethod = ['bkash', 'nagad', 'rocket', 'upay', 'upi'].some(m => selectedMethod.id.includes(m)) || selectedMethod.id.startsWith('custom_');
    const isCrypto = selectedMethod.category === 'CRYPTO';
    const isEPay = selectedMethod.category === 'E-PAY' && !isLocalMethod;

    const needsConversion = isLocalMethod && currencyCode !== 'BDT' && !selectedMethod.id.includes('upi');
    const exchangeRate = depositSettings.exchangeRate || 120;
    const localAmount = needsConversion ? amount * exchangeRate : amount;
    const displayCurrency = needsConversion ? 'BDT' : currencyCode;
    const displaySymbol = needsConversion ? '৳' : currencySymbol;

    const getPaymentTarget = () => {
      const currentAccount = numbers[numberIndex] || numbers[0] || { number: '01810761498', type: 'Cash Out', label: 'Agent' };
      const value = typeof currentAccount === 'string' ? currentAccount : currentAccount.number;
      const label = typeof currentAccount === 'string' ? `${selectedMethod.name} Agent No` : `${selectedMethod.name} ${currentAccount.label || 'Agent'} No`;
      const paymentType = typeof currentAccount === 'string' ? 'Cash Out' : currentAccount.type || 'Cash Out';
      
      if (selectedMethod.id.includes('bkash')) return { label, value, type: 'PHONE', paymentType };
      if (selectedMethod.id.includes('nagad')) return { label, value, type: 'PHONE', paymentType };
      if (selectedMethod.id.includes('rocket')) return { label, value, type: 'PHONE', paymentType };
      if (selectedMethod.id.includes('upay')) return { label, value, type: 'PHONE', paymentType };
      if (selectedMethod.id.startsWith('custom_')) return { label, value, type: 'PHONE', paymentType };
      if (selectedMethod.id === 'upi') return { label: 'UPI ID (VPA)', value: depositSettings.upiId || 'onyxtrade@upi', type: 'ID', paymentType: 'Transfer' };
      
      if (selectedMethod.id === 'paypal') return { label: 'PayPal Email', value: depositSettings.paypalEmail || 'payments@onyxtrade.com', type: 'EMAIL', paymentType: 'Transfer' };
      if (selectedMethod.id === 'neteller') return { label: 'Neteller Email', value: depositSettings.netellerEmail || 'payments@onyxtrade.com', type: 'EMAIL', paymentType: 'Transfer' };
      if (selectedMethod.id === 'skrill') return { label: 'Skrill Email', value: depositSettings.skrillEmail || 'payments@onyxtrade.com', type: 'EMAIL', paymentType: 'Transfer' };
      if (selectedMethod.id === 'perfect_money') return { label: 'Perfect Money Account', value: depositSettings.perfectMoneyAccount || 'U12345678', type: 'ID', paymentType: 'Transfer' };
      if (selectedMethod.id === 'advcash') return { label: 'AdvCash Email', value: depositSettings.advcashEmail || 'payments@onyxtrade.com', type: 'EMAIL', paymentType: 'Transfer' };
      if (selectedMethod.id === 'payeer') return { label: 'Payeer Account', value: depositSettings.payeerAccount || 'P12345678', type: 'ID', paymentType: 'Transfer' };
      if (selectedMethod.id === 'webmoney') return { label: 'WebMoney WMZ', value: depositSettings.webmoneyWmz || 'Z123456789012', type: 'ID', paymentType: 'Transfer' };
      
      if (selectedMethod.id === 'binance_pay') return { label: 'Binance Pay ID', value: depositSettings.binancePayId || '123456789', type: 'ID', paymentType: 'Transfer' };
      if (selectedMethod.id === 'usdt_trc20') return { label: 'USDT (TRC20) Address', value: depositSettings.usdtTrc20Address || 'Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'usdt_bep20') return { label: 'USDT (BEP20) Address', value: depositSettings.usdtBep20Address || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'bitcoin') return { label: 'BTC Address', value: depositSettings.btcAddress || '1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'ethereum') return { label: 'ETH (ERC20) Address', value: depositSettings.ethErc20Address || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'litecoin') return { label: 'LTC Address', value: depositSettings.ltcAddress || 'Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'xrp') return { label: 'XRP Address', value: depositSettings.xrpAddress || 'rxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'stellar') return { label: 'XLM Address', value: depositSettings.xlmAddress || 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'dogecoin') return { label: 'DOGE Address', value: depositSettings.dogeAddress || 'Dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'usdc_erc20') return { label: 'USDC (ERC20) Address', value: depositSettings.usdcErc20Address || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      if (selectedMethod.id === 'usdc_bep20') return { label: 'USDC (BEP20) Address', value: depositSettings.usdcBep20Address || '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      
      return { label: 'Payment Address', value: 'Contact Support', type: 'OTHER', paymentType: 'Transfer' };
    };

    const target = getPaymentTarget();

    useEffect(() => {
      if (loading) return;
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }, [loading]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-white space-y-6">
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[#D12053] rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-xl font-bold text-[#D12053] animate-pulse">Verifying Payment Gateway...</p>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCopy = (text: string) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(err => {
              console.error('Failed to copy using clipboard API: ', err);
              fallbackCopyTextToClipboard(text);
            });
        } else {
          fallbackCopyTextToClipboard(text);
        }
      };
    
      const fallbackCopyTextToClipboard = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }
        } catch (err) {
          console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
      };

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-white text-black font-sans">
        {/* Header (Cyan) - Compact */}
        <div className="bg-[#4DD8F5] p-3 rounded-b-[20px] flex justify-between items-center text-[#1a1b1e] shadow-md">
          <div>
            <p className="text-xs font-bold opacity-80">{displayCurrency}</p>
            <p className="text-xl font-black">{localAmount.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium">Time left <span className="text-sm font-bold ml-1">{formatTime(timeLeft)}</span></p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-16 scrollbar-hide">
          {/* Method Logo Section - Compact */}
          <div className="flex items-center gap-2.5 py-1">
             <div className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-lg p-1.5 border border-gray-100">
                {selectedMethod.icon}
             </div>
             <div className="flex flex-col">
                <span className="text-base font-bold text-[#1a1b1e]">{selectedMethod.name}</span>
                <span className="text-xs font-medium text-gray-500">
                  {isLocalMethod ? target.paymentType : isCrypto ? 'Crypto Transfer' : 'E-Wallet Payment'}
                </span>
             </div>
          </div>

          {/* Step 1 - Compact */}
          <div className="relative">
            <div className="absolute -left-3 top-0 text-[60px] font-black text-gray-100 -z-0 leading-none select-none">1</div>
            <div className="pl-10 space-y-1 relative z-10">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-bold text-gray-700">{target.label}</p>
                </div>
                {isLocalMethod && (
                  <p className="text-[11px] font-bold text-gray-500">
                    এই নাম্বারে শুধুমাত্র {target.paymentType === 'Cash Out' ? 'ক্যাশআউট' : 'সেন্ড মানি'} গ্রহণ করা হয়
                  </p>
                )}
                <div className="flex items-center justify-between border-b border-gray-200 pb-1.5 pt-2">
                    <span className={cn(
                      "font-bold tracking-wider break-all pr-3",
                      target.value.length > 20 ? "text-base" : "text-lg"
                    )}>{target.value}</span>
                    <button onClick={() => handleCopy(target.value)} className="p-1.5 hover:bg-gray-100 rounded-full transition active:scale-90 shrink-0">
                        <Copy size={20} className="text-cyan-500" />
                    </button>
                </div>
            </div>
          </div>

          {/* Warning - Compact */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg">
            <div className="w-8 h-8 flex items-center justify-center text-pink-500 shrink-0">
                <AlertCircle size={24} />
            </div>
            <p className="text-sm font-bold text-pink-500 leading-tight">
                {isLocalMethod ? 'এই নীচে তথ্য প্রবেশ করুন প্রদানের পরে' : 'Please enter the transaction details below after payment'}
            </p>
          </div>

          {/* Step 2 - Compact */}
          <div className="relative bg-[#4DD8F5] rounded-[20px] p-4 overflow-hidden shadow-sm">
            <div className="absolute -left-3 -bottom-6 text-[80px] font-black text-white/30 -z-0 leading-none select-none">2</div>
            <div className="relative z-10 space-y-3">
                <p className="text-base font-bold text-[#1a1b1e]">Transaction ID / Hash</p>
                <p className="text-[12px] font-bold text-[#1a1b1e] opacity-80 leading-tight">
                    {isLocalMethod 
                      ? 'bKash/Nagad অ্যাপ থেকে লেনদেন (TrxID) আইডি কপি করুন এবং পেমেন্ট পৃষ্ঠার লেনদেন বাক্সে পেস্ট করুন।'
                      : 'Copy the transaction ID or hash from your wallet and paste it into the box below.'}
                </p>
                <div className="relative">
                    <input 
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="ex. BBSDA3GH23"
                        className="w-full bg-white rounded-full py-2.5 px-5 text-base font-bold text-gray-800 focus:outline-none shadow-inner"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center">
                        <span className="font-bold text-gray-400 text-sm">!</span>
                    </div>
                </div>
            </div>
          </div>

          {/* Submit Button - Compact */}
          <button 
            disabled={!transactionId || isProcessing}
            onClick={handleSubmitDeposit}
            className={cn(
                "w-full py-3 rounded-full font-bold text-base transition-all shadow-lg mt-2",
                transactionId && !isProcessing ? "bg-[#D12053] text-white active:scale-95 shadow-pink-500/20" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin size-4" />
                <span className="text-sm">Processing...</span>
              </div>
            ) : "Confirm Payment"}
          </button>
        </div>
      </div>
    );
};

const Confirmation = ({ onClose, transactionId, selectedMethod, amount, currencyCode, currencySymbol, localAmount, depositStatus }: any) => {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[#0a0a0a] text-white p-4 items-center justify-center text-center overflow-y-auto pb-16">
        {depositStatus === 'SUCCESS' ? (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-[#00ff00]/10 rounded-full flex items-center justify-center mb-4 border border-[#00ff00]/20"
            >
              <CheckCircle2 size={48} className="text-[#00ff00]" />
            </motion.div>
            
            <h2 className="text-2xl font-black text-white mb-2">Success!</h2>
            <p className="text-[#7E7E7E] mb-8 max-w-[280px]">
              Your deposit of <span className="text-white font-bold">{currencySymbol}{localAmount.toLocaleString()}</span> has been added to your balance.
            </p>
          </>
        ) : (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-[#00ff00]/10 rounded-full flex items-center justify-center mb-4 border border-[#00ff00]/20"
            >
              <Clock size={48} className="text-[#00ff00] animate-pulse" />
            </motion.div>
            
            <h2 className="text-2xl font-black text-white mb-2">Pending</h2>
            <p className="text-[#7E7E7E] mb-8 max-w-[280px]">
              Your deposit of <span className="text-white font-bold">{currencySymbol}{localAmount.toLocaleString()}</span> is being verified.
            </p>
          </>
        )}

        <div className="w-full bg-[#1a1b1e] rounded-2xl p-4 border border-white/10 space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-[#7E7E7E] text-sm">Transaction ID</span>
            <span className="text-white font-mono text-sm">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#7E7E7E] text-sm">Method</span>
            <span className="text-white font-bold text-sm">{selectedMethod.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#7E7E7E] text-sm">Status</span>
            <span className="bg-[#00ff00]/10 text-[#00ff00] text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
              {depositStatus === 'SUCCESS' ? 'Completed' : 'Verifying'}
            </span>
          </div>
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="w-full bg-[#00ff00] text-black font-black py-4 rounded-xl text-lg shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all cursor-pointer"
        >
          Back to Trading
        </button>
      </div>
    );
  };


export default function DepositFlow({ isOpen, onClose, currencySymbol, currencyCode, initialPromoCode, socket, userEmail, rawBalance, userId }: DepositFlowProps) {
  const [step, setStep] = useState<Step>('SUMMARY');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const isBdtMethod = ['bkash_p2c', 'nagad_p2c', 'rocket_p2c', 'upay_p2c'].includes(selectedMethod.id);
  const displayCurrencyCode = isBdtMethod ? 'BDT' : currencyCode;
  const displayCurrencySymbol = isBdtMethod ? '৳' : currencySymbol;

  const rate = EXCHANGE_RATES[displayCurrencyCode] || 1;
  const minDeposit = displayCurrencyCode === 'BDT' ? 500 : Math.round(10 * rate);
  const [amount, setAmount] = useState<number>(minDeposit);

  useEffect(() => {
    setAmount(minDeposit);
  }, [displayCurrencyCode, minDeposit]);
  const [selectedPromo, setSelectedPromo] = useState<string | null>(initialPromoCode ? 'ACTIVE' : null);
  const [promoInput, setPromoInput] = useState<string>(initialPromoCode || '');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const [depositSettings, setDepositSettings] = useState({
    bkashNumbers: ['01712-345678'],
    nagadNumbers: ['01712-345678'],
    rocketNumbers: ['01712-345678'],
    upayNumbers: ['01712-345678'],
    onyxOptionPayNumbers: ['01712-345678'],
    hamprooPayNumbers: ['01712-345678'],
    binancePayId: '123456789',
    paypalEmail: 'payments@onyxtrade.com',
    netellerEmail: 'payments@onyxtrade.com',
    skrillEmail: 'payments@onyxtrade.com',
    usdtTrc20Address: 'Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdtBep20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    ethErc20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdcErc20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdcBep20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    btcAddress: '1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    ltcAddress: 'Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    xrpAddress: 'rxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    xlmAddress: 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    dogeAddress: 'Dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    upiId: 'onyxtrade@upi',
    perfectMoneyAccount: 'U12345678',
    advcashEmail: 'payments@onyxtrade.com',
    payeerAccount: 'P12345678',
    webmoneyWmz: 'Z123456789012',
    enabledMethods: [
      'bkash_p2c', 'nagad_p2c', 'rocket_p2c', 'upay_p2c', 'onyx_option_pay', 'hamproo_pay',
      'binance_pay', 'usdt_trc20', 'usdt_bep20', 'bitcoin',
      'bank_card', 'skrill', 'xrp', 'usdt_ton', 'usdc_erc20', 'usdc_bep20', 'ethereum', 'litecoin',
      'paypal', 'neteller', 'upi', 'perfect_money', 'advcash', 'payeer', 'webmoney', 'stellar', 'dogecoin'
    ],
    exchangeRate: 120,
    depositNote: 'Ensure you include your account ID in the reference if required. Deposits usually reflect within 5-15 minutes.',
    minDepositForBonus: 50,
    bonusPercentage: 10,
    methodLogos: {} as Record<string, string>
  });
  const [amountError, setAmountError] = useState<string | null>(null);


  useEffect(() => {
    if (initialPromoCode) {
      setSelectedPromo('ACTIVE');
      setPromoInput(initialPromoCode);
    }
  }, [initialPromoCode]);
  const [activeCategory, setActiveCategory] = useState<'POPULAR' | 'E-PAY' | 'CRYPTO'>('POPULAR');
  const [transactionId, setTransactionId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [depositStatus, setDepositStatus] = useState<'PENDING' | 'SUCCESS' | 'ERROR'>('PENDING');

  useEffect(() => {
    if (socket) {
      socket.emit('get-deposit-settings');
      socket.on('deposit-settings', (settings: any) => {
        if (settings) setDepositSettings(prev => ({ ...prev, ...settings }));
      });
      
      socket.emit('get-promo-codes');
      socket.on('promo-codes', (codes: any[]) => {
        setPromoCodes(codes);
      });
      
      socket.on('balance-updated', () => {
        // If balance updated while in confirmation, it might be the deposit being approved
        setDepositStatus('SUCCESS');
      });

      socket.on('deposit-submitted', (response: any) => {
        setDepositStatus('PENDING');
        setStep('CONFIRMATION');
        setIsProcessing(false);
      });

      socket.on('deposit-error', (error: string) => {
        alert(error);
        setIsProcessing(false);
      });
    }
    return () => {
      if (socket) {
        socket.off('deposit-settings');
        socket.off('promo-codes');
        socket.off('deposit-submitted');
        socket.off('deposit-error');
        socket.off('balance-updated');
      }
    };
  }, [socket]);

  const [isStepLoading, setIsStepLoading] = useState(false);

  // Auto-validate active promo code when amount or currency changes
  useEffect(() => {
    if (selectedPromo === 'ACTIVE' && promoInput && promoCodes.length > 0) {
      const promo = promoCodes.find(p => p.code.toUpperCase() === promoInput.toUpperCase());
      if (promo) {
        const rate = EXCHANGE_RATES[displayCurrencyCode] || 1;
        const amountUSD = amount / rate;
        const now = Date.now();
        const isExpired = promo.expiresAt && now > promo.expiresAt;
        const isMinNotMet = amountUSD < promo.minDeposit;
        
        if (isExpired || isMinNotMet) {
          setSelectedPromo(null);
          setPromoInput('');
        }
      }
    }
  }, [amount, promoInput, promoCodes, displayCurrencyCode, selectedPromo]);

  const handleNextToDetails = () => {
    setIsStepLoading(true);
    setTimeout(() => {
      setIsStepLoading(false);
      setStep('PAYMENT_DETAILS');
    }, 10000);
  };

  if (!isOpen) return null;

  const handleBack = () => {
    if (step === 'SUMMARY') onClose();
    else if (step === 'PAYMENT_METHOD') setStep('SUMMARY');
    else if (step === 'AMOUNT_SELECTION') setStep('SUMMARY');
    else if (step === 'PROMO_SELECTION') setStep('SUMMARY');
    else if (step === 'CONFIRMATION') onClose();
    else if (step === 'PAYMENT_DETAILS') setStep('SUMMARY');
    else setStep('SUMMARY');
  };

  const handleSubmitDeposit = () => {
    if (!transactionId) return;
    
    if (displayCurrencyCode === 'BDT' && amount < 500) {
      setAmountError("Minimum deposit is 500 BDT");
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate professional 10-second processing
    setTimeout(() => {
      if (socket && userEmail) {
        socket.emit('submit-deposit', {
          email: userEmail,
          amount: amount,
          currency: displayCurrencyCode,
          method: selectedMethod.id,
          transactionId,
          promoCode: selectedPromo ? promoInput : null
        });
      } else {
        setIsProcessing(false);
        setDepositStatus('ERROR');
        alert("Connection lost or user not authenticated. Please try again.");
      }
    }, 10000);
  };

  const getStepIndex = () => {
    switch (step) {
      case 'PAYMENT_METHOD': return 0;
      case 'AMOUNT_SELECTION': return 1;
      case 'PROMO_SELECTION': return 2;
      case 'SUMMARY': return 3;
      case 'PAYMENT_DETAILS': return 4;
      case 'CONFIRMATION': return 5;
      default: return 0;
    }
  };

  const steps = [
    { id: 0, name: 'Method' },
    { id: 1, name: 'Amount' },
    { id: 2, name: 'Promo' },
    { id: 3, name: 'Summary' },
    { id: 4, name: 'Pay' },
    { id: 5, name: 'Done' }
  ];

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col pointer-events-auto"
    >
      <AnimatePresence mode="wait">
        {isLoading || isStepLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] space-y-6"
          >
            <div className="relative">
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-[#00ff00] rounded-full blur-2xl"
              />
              <div className="relative w-20 h-20 bg-[#1a1b1e] rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl">
                <Wallet size={40} className="text-[#00ff00]" />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 size={18} className="text-[#00ff00] animate-spin" />
                  <span className="text-white font-bold tracking-wider uppercase text-xs">
                    {isStepLoading ? "Preparing Secure Payment Page" : "Securing Connection"}
                  </span>
                </div>
                <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-[#00ff00] to-transparent"
                  />
                </div>
              </div>
              {isStepLoading && (
                <p className="text-[#7E7E7E] text-[10px] font-medium uppercase tracking-widest animate-pulse">
                  Verifying gateway security...
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col min-h-0"
          >
          {step === 'SUMMARY' && <SummaryView 
            onClose={onClose} 
            selectedMethod={selectedMethod} 
            amount={amount} 
            currencyCode={displayCurrencyCode} 
            currencySymbol={displayCurrencySymbol} 
            promoInput={promoInput} 
            selectedPromo={selectedPromo}
            setStep={setStep}
            userId={userId}
            rawBalance={rawBalance}
            promoCodes={promoCodes}
            handleNextToDetails={handleNextToDetails}
          />}
          {step === 'PAYMENT_METHOD' && <PaymentMethodSelection 
            handleBack={handleBack} 
            selectedMethod={selectedMethod} 
            setSelectedMethod={setSelectedMethod} 
            setStep={setStep}
            depositSettings={depositSettings}
          />}
          {step === 'AMOUNT_SELECTION' && <AmountSelection 
            handleBack={handleBack} 
            amount={amount} 
            setAmount={setAmount} 
            amountError={amountError} 
            setAmountError={setAmountError} 
            currencyCode={displayCurrencyCode} 
            currencySymbol={displayCurrencySymbol} 
            minDeposit={minDeposit} 
            setStep={setStep}
          />}
          {step === 'PROMO_SELECTION' && <PromoSelection 
            handleBack={handleBack} 
            amount={amount} 
            currencyCode={displayCurrencyCode}
            currencySymbol={displayCurrencySymbol} 
            depositSettings={depositSettings} 
            selectedPromo={selectedPromo} 
            setSelectedPromo={setSelectedPromo} 
            promoInput={promoInput} 
            setPromoInput={setPromoInput} 
            setStep={setStep}
            promoCodes={promoCodes}
          />}
          {step === 'PAYMENT_DETAILS' && <PaymentDetails 
            handleBack={() => setStep('SUMMARY')} 
            selectedMethod={selectedMethod} 
            amount={amount} 
            currencyCode={displayCurrencyCode} 
            currencySymbol={displayCurrencySymbol} 
            depositSettings={depositSettings} 
            transactionId={transactionId} 
            setTransactionId={setTransactionId} 
            handleSubmitDeposit={handleSubmitDeposit} 
            isProcessing={isProcessing} 
          />}
          {step === 'CONFIRMATION' && <Confirmation 
            onClose={onClose} 
            transactionId={transactionId} 
            selectedMethod={selectedMethod} 
            amount={amount} 
            currencyCode={displayCurrencyCode} 
            currencySymbol={displayCurrencySymbol} 
            localAmount={['bkash', 'nagad', 'rocket', 'upay'].some(m => selectedMethod.id.includes(m)) && displayCurrencyCode !== 'BDT' ? amount * (depositSettings.exchangeRate || 120) : amount}
            depositStatus={depositStatus}
          />}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Processing Overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center"
          >
            <div className="bg-[#1a1b1e] p-6 rounded-2xl border border-white/10 flex flex-col items-center space-y-6 w-72">
              <div className="relative">
                <Loader2 size={40} className="text-[#00ff00] animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-white font-bold text-base">Processing Deposit</p>
                <p className="text-white/50 text-sm">Please wait while we verify your transaction...</p>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 10, ease: "linear" }}
                  className="h-full bg-[#00ff00]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
