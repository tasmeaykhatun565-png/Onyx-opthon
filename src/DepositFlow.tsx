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
  ShieldCheck,
  Menu,
  QrCode,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from './i18n';
import { cn } from './utils';
import { useToast } from './Toast';

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

type Step = 'SUMMARY' | 'PAYMENT_METHOD' | 'AMOUNT_SELECTION' | 'PROMO_SELECTION' | 'CONFIRM_PAYMENT' | 'PAYMENT_DETAILS' | 'CONFIRMATION';

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'POPULAR' | 'E-PAY' | 'CRYPTO';
  minAmount: string;
  isPopular?: boolean;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  { 
    id: 'bkash_p2c', 
    name: 'bKash', 
    icon: <div className="w-full h-full bg-[#E2136E] flex items-center justify-center rounded-lg p-1.5"><img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/bkash.png" alt="bKash" className="w-full h-full object-contain invert brightness-0" referrerPolicy="no-referrer" /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00', 
    isPopular: true 
  },
  { 
    id: 'nagad_p2c', 
    name: 'Nagad', 
    icon: <div className="w-full h-full bg-[#EA1D25] flex items-center justify-center rounded-lg p-1.5"><img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/nagad.png" alt="Nagad" className="w-full h-full object-contain invert brightness-0" referrerPolicy="no-referrer" /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00',
    isPopular: true
  },
  { 
    id: 'binance_pay', 
    name: 'BinancePay', 
    icon: <div className="w-full h-full bg-[#F3BA2F] flex items-center justify-center rounded-lg p-1.5"><img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/binance.png" alt="Binance Pay" className="w-full h-full object-contain" referrerPolicy="no-referrer" /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00', 
    isPopular: true 
  },
  { 
    id: 'usdt_bep20', 
    name: 'USDT (BSC BEP-20)', 
    icon: <div className="w-full h-full bg-[#26A17B] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">₮</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00', 
    isPopular: true 
  },
  { 
    id: 'bank_card', 
    name: 'Bank card', 
    icon: <div className="w-full h-full bg-[#00529B] flex items-center justify-center rounded-lg p-1.5 text-white"><CreditCard size={20} /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00', 
    isPopular: true 
  },
  { 
    id: 'usdt_trc20', 
    name: 'USDT (TRC20)', 
    icon: <div className="w-full h-full bg-[#26A17B] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">₮</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'skrill', 
    name: 'Skrill', 
    icon: <div className="w-full h-full bg-[#8C1515] flex items-center justify-center rounded-lg p-1 text-white font-black text-xl">S</div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'bitcoin', 
    name: 'Bitcoin', 
    icon: <div className="w-full h-full bg-[#F7931A] flex items-center justify-center rounded-lg p-1.5"><Bitcoin size={20} color="white" /></div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00',
    isPopular: true
  },
  { 
    id: 'ethereum', 
    name: 'Ethereum', 
    icon: <div className="w-full h-full bg-[#627EEA] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">Ξ</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'neteller', 
    name: 'Neteller', 
    icon: <div className="w-full h-full bg-[#83BB26] flex items-center justify-center rounded-lg p-1 text-white font-black text-xl">N</div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'usdc_bep20', 
    name: 'USD Coin (BSC BEP-20)', 
    icon: <div className="w-full h-full bg-[#2775CA] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">U</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'trx', 
    name: 'TRX', 
    icon: <div className="w-full h-full bg-[#FF0013] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">T</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'dogecoin', 
    name: 'Dogecoin (BSC BEP-20)', 
    icon: <div className="w-full h-full bg-[#C2A633] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">Ð</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'solana', 
    name: 'Solana', 
    icon: <div className="w-full h-full bg-[#14F195] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">S</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'binance_coin', 
    name: 'Binance Coin (BSC BEP-20)', 
    icon: <div className="w-full h-full bg-[#F3BA2F] flex items-center justify-center rounded-lg p-1.5"><img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/binance.png" alt="Binance Coin" className="w-full h-full object-contain" referrerPolicy="no-referrer" /></div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'bybit_pay', 
    name: 'Bybit Pay', 
    icon: <div className="w-full h-full bg-[#FBBC05] flex items-center justify-center rounded-lg p-1.5"><img src="https://cryptologos.cc/logos/bybit-logo.png" alt="Bybit" className="w-full h-full object-contain" referrerPolicy="no-referrer" /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'usdt_ton', 
    name: 'USDT (TON)', 
    icon: <div className="w-full h-full bg-[#0088CC] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">₮</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'usdc_erc20', 
    name: 'USD Coin (ERC20)', 
    icon: <div className="w-full h-full bg-[#2775CA] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">U</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'usdc_polygon', 
    name: 'USD Coin (Polygon)', 
    icon: <div className="w-full h-full bg-[#8247E5] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">U</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'shiba_inu', 
    name: 'Shiba Inu', 
    icon: <div className="w-full h-full bg-[#FFA500] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg text-center">SHIB</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'volet', 
    name: 'Volet (ex. AdvCash)', 
    icon: <div className="w-full h-full bg-[#79B928] flex items-center justify-center rounded-lg p-1 text-white font-bold text-xs">V</div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'xrp', 
    name: 'XRP', 
    icon: <div className="w-full h-full bg-bg-primary flex items-center justify-center rounded-lg p-1.5 text-text-primary font-bold text-lg">X</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'china_unionpay', 
    name: 'China UnionPay', 
    icon: <div className="w-full h-full bg-[#005489] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-[10px]">UP</div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'perfect_money', 
    name: 'Perfect Money', 
    icon: <div className="w-full h-full bg-[#D4AF37] flex items-center justify-center rounded-lg p-1 text-white font-bold text-[10px]">PM</div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'webmoney', 
    name: 'WebMoney', 
    icon: <div className="w-full h-full bg-[#0072BC] flex items-center justify-center rounded-lg p-1 text-white font-bold text-[10px]">WM</div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'rocket_p2c', 
    name: 'Rocket', 
    icon: <div className="w-full h-full bg-[#8C3494] flex items-center justify-center rounded-lg p-1.5"><img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/rocket.png" alt="Rocket" className="w-full h-full object-contain invert brightness-0" referrerPolicy="no-referrer" /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'upay_p2c', 
    name: 'Upay', 
    icon: <div className="w-full h-full bg-[#FFCC00] flex items-center justify-center rounded-lg p-1.5"><img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/upay.png" alt="Upay" className="w-full h-full object-contain" referrerPolicy="no-referrer" /></div>, 
    category: 'E-PAY', 
    minAmount: '$10.00' 
  },
  { 
    id: 'litecoin', 
    name: 'Litecoin', 
    icon: <div className="w-full h-full bg-[#345D9D] flex items-center justify-center rounded-lg p-1.5 text-white font-bold text-lg">Ł</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
  { 
    id: 'stellar', 
    name: 'Stellar', 
    icon: <div className="w-full h-full bg-bg-primary flex items-center justify-center rounded-lg p-1.5 text-text-primary font-bold text-lg">S</div>, 
    category: 'CRYPTO', 
    minAmount: '$10.00' 
  },
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

const ConfirmPaymentView = ({ handleBack, onConfirm, selectedMethod, amount, currencyCode, currencySymbol, promoInput, selectedPromo, promoCodes, userId, depositSettings }: any) => {
  const { t } = useTranslation();
  
  // Calculate bonus: use promo code if active, otherwise use global default if amount meets min requirement
  let effectiveBonusPercentage = 0;
  const currentExchangeRates = { ...EXCHANGE_RATES, BDT: depositSettings?.exchangeRate || 120 };
  
  if (selectedPromo === 'ACTIVE') {
    effectiveBonusPercentage = promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0;
  } else {
    // Check if amount in USD is above minDepositForBonus
    const rate = currentExchangeRates[currencyCode] || 1;
    const amountUSD = amount / rate;
    if (amountUSD >= (depositSettings?.minDepositForBonus || 50)) {
      effectiveBonusPercentage = depositSettings?.bonusPercentage || 0;
    }
  }

  const bonusAmount = Math.round(amount * (effectiveBonusPercentage / 100));
  const totalDeposit = amount + bonusAmount;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-bg-secondary text-text-primary">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0 border-b border-border-color">
        <button onClick={handleBack} className="p-1.5 -ml-1 hover:bg-bg-tertiary rounded-full transition cursor-pointer">
          <ChevronLeft size={24} className="text-text-primary" />
        </button>
        <h2 className="text-xl font-bold text-text-primary">{t('deposit.confirm_payment')}</h2>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-8 space-y-8 scrollbar-hide pb-20">
        {/* Large Amount Display */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 flex items-center justify-center bg-bg-secondary rounded-2xl border border-border-color shadow-2xl relative">
            <div className="p-2 w-full h-full flex items-center justify-center">
              {selectedMethod.icon}
            </div>
            {/* Glow */}
            <div className="absolute inset-0 bg-bg-secondary blur-xl -z-10 rounded-full" />
          </div>
          <div className="text-center">
            <p className="text-[#7E7E7E] text-xs font-bold uppercase tracking-widest mb-1">{t('deposit.amount')}</p>
            <p className="text-4xl font-black text-text-primary">
              {currencySymbol}{amount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Details Table */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center py-3 border-b border-border-color">
            <span className="text-[#7E7E7E] text-sm font-medium">{t('deposit.payment_method')}</span>
            <span className="text-text-primary font-bold">{selectedMethod.name}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border-color">
            <span className="text-[#7E7E7E] text-sm font-medium">{t('deposit.receiving_account')}</span>
            <span className="text-text-secondary/60 font-medium text-sm">{currencyCode} {t('common.account')} #{userId?.slice(-10).toUpperCase() || '2923648399'}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border-color">
            <span className="text-[#7E7E7E] text-sm font-medium">{t('deposit.currency')}</span>
            <span className="text-text-primary font-bold">{currencyCode}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border-color">
            <span className="text-[#7E7E7E] text-sm font-medium">{t('deposit.status')}</span>
            <span className="text-[#00ff00] font-black text-xs tracking-widest">EXPERT</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-border-color">
            <span className="text-[#7E7E7E] text-sm font-medium">{t('deposit.real_funds')}</span>
            <span className="text-text-primary font-bold">{currencySymbol}{amount.toLocaleString()}</span>
          </div>
          
          {bonusAmount > 0 && (
            <>
              <div className="flex justify-between items-center py-3 border-b border-border-color">
                <span className={cn("text-sm font-medium", selectedPromo === 'ACTIVE' ? "text-blue-400" : "text-[#00ff00]")}>
                  {selectedPromo === 'ACTIVE' ? `${t('deposit.promo_code')}: ${promoInput}` : t('deposit.deposit_bonus')}
                </span>
                <span className={cn("font-bold text-sm", selectedPromo === 'ACTIVE' ? "text-blue-400" : "text-[#00ff00]")}>
                  {selectedPromo === 'ACTIVE' ? t('deposit.applied') : `${effectiveBonusPercentage}%`}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border-color">
                <span className="text-[#7E7E7E] text-sm font-medium">{t('deposit.bonus_amount')}</span>
                <span className="text-[#00ff00] font-bold">+{currencySymbol}{bonusAmount.toLocaleString()}</span>
              </div>
            </>
          )}

          <div className="flex justify-between items-center py-4 bg-bg-secondary rounded-xl px-4 mt-2 border border-border-color">
            <span className="text-text-secondary/70 text-sm font-bold">{t('deposit.total_deposit')}</span>
            <span className="text-xl font-black text-text-primary">{currencySymbol}{totalDeposit.toLocaleString()}</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="pt-4 space-y-6">
          <button 
            onClick={onConfirm}
            className="w-full bg-[#00ff00] hover:bg-[#00e600] text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] text-lg cursor-pointer shadow-[0_8px_25px_rgba(0,255,0,0.2)] uppercase tracking-widest"
          >
            Confirm
          </button>
          
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-[10px] text-[#7E7E7E] font-medium max-w-[220px]">
              You will be redirected to the payment system page afterwards
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryView = ({ onClose, selectedMethod, amount, currencyCode, currencySymbol, promoInput, selectedPromo, setStep, userId, rawBalance, promoCodes, handleNextToDetails }: any) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col flex-1 min-h-0 bg-bg-secondary text-text-primary">
      {/* Header */}
      <div className="p-4 flex items-center justify-between shrink-0 border-b border-border-color">
        <h2 className="text-xl font-bold text-text-primary">{t('common.deposit')}</h2>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }} 
          className="p-1.5 hover:bg-bg-tertiary rounded-full transition cursor-pointer"
        >
          <X size={20} className="text-text-primary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-4 pb-12 scrollbar-hide">
        {/* Account Info */}
        <div className="pt-2">
          <p className="text-[12px] text-[#7E7E7E] font-bold uppercase tracking-wider">
  {currencyCode} {t('common.account').toUpperCase()}
</p>
          <p className="text-sm font-medium text-text-secondary/60">
            #{userId?.slice(-10).toUpperCase() || '2914496110'}
          </p>
        </div>

        <div className="space-y-3">
          {/* Payment Method Selector */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setStep('PAYMENT_METHOD');
            }}
            className="w-full bg-bg-tertiary rounded-xl p-4 flex items-center justify-between hover:bg-[#222328] transition-all cursor-pointer border border-border-color shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center bg-bg-tertiary rounded-lg overflow-hidden shrink-0">
                {selectedMethod.icon}
              </div>
              <div className="text-left">
                <p className="text-[11px] text-[#7E7E7E] font-bold uppercase tracking-tight">{t('deposit.payment_method')}</p>
                <p className="text-base font-bold text-text-primary">{selectedMethod.name}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-[#555]" />
          </button>

          {/* Amount Selector */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setStep('AMOUNT_SELECTION');
            }}
            className="w-full bg-bg-tertiary rounded-xl p-4 flex items-center justify-between hover:bg-[#222328] transition-all cursor-pointer border border-border-color shadow-xl"
          >
            <div className="text-left">
              <p className="text-[11px] text-[#7E7E7E] font-bold uppercase tracking-tight">{t('deposit.amount')}</p>
              <p className="text-2xl font-black text-text-primary">{currencySymbol}{amount.toLocaleString()}</p>
            </div>
            <ChevronRight size={20} className="text-[#555]" />
          </button>

          {/* Promo Code Selector */}
          <div className="space-y-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setStep('PROMO_SELECTION');
              }}
              className="w-full bg-bg-tertiary rounded-xl p-4 flex items-center justify-between hover:bg-[#222328] transition-all cursor-pointer border border-border-color shadow-xl"
            >
              <div className="text-left">
                <p className="text-[11px] text-[#7E7E7E] font-bold uppercase tracking-tight">{t('deposit.promo_code')}</p>
                <p className={cn(
                  "text-base font-bold",
                  selectedPromo === 'ACTIVE' ? "text-[#00ff00]" : "text-text-secondary/40"
                )}>
                  {selectedPromo === 'ACTIVE' ? promoInput : t('deposit.enter_or_choose_code')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedPromo === 'ACTIVE' && (
                  <div className="bg-[#00ff00]/10 text-[#00ff00] text-[10px] font-black px-2 py-1 rounded-md border border-[#00ff00]/20">
                    {promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0}% BONUS
                  </div>
                )}
                <ChevronRight size={20} className="text-[#555]" />
              </div>
            </button>

            {selectedPromo === 'ACTIVE' && (
              <div className="bg-bg-tertiary border border-[#00ff00]/10 rounded-xl p-4 space-y-2 shadow-inner">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#7E7E7E]">{t('deposit.bonus_amount')}</span>
                  <span className="text-[#00ff00] font-black">
                    +{currencySymbol}{Math.round(amount * ((promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0) / 100)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border-color">
                  <span className="text-xs text-[#7E7E7E]">{t('deposit.total_to_receive')}</span>
                  <span className="text-lg font-black text-text-primary">
                    {currencySymbol} {(amount + Math.round(amount * ((promoCodes.find((p: any) => p.code === promoInput)?.bonusPercentage || 0) / 100))).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 space-y-6">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleNextToDetails();
            }}
            className="w-full bg-[#00ff00] hover:bg-[#00e600] text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] text-lg cursor-pointer shadow-[0_8px_20px_rgba(0,255,0,0.15)] uppercase tracking-wider"
          >
            {t('common.next')}
          </button>

          <div className="flex flex-col items-center text-center space-y-3 pb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-secondary rounded-full border border-border-color">
              <ShieldCheck size={14} className="text-[#00ff00]" />
              <span className="text-[10px] font-bold text-text-secondary/50 uppercase tracking-widest">{t('deposit.safe_payment')}</span>
            </div>
            <p className="text-[10px] text-[#7E7E7E] max-w-[240px] leading-relaxed font-medium">
              Your transaction is protected by industry-standard 256-bit SSL encryption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const PaymentMethodSelection = ({ handleBack, selectedMethod, setSelectedMethod, setStep, depositSettings, setHasManuallySelected }: any) => {
    const { t } = useTranslation();
    const [activeCategory, setActiveCategory] = useState<'ALL' | 'RECOMMENDED' | 'E-PAY' | 'CRYPTO'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const allMethods = [
      ...PAYMENT_METHODS,
      ...(depositSettings?.customMethods || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        icon: m.logo ? <img src={m.logo} alt={m.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" /> : <div className="w-10 h-10 flex items-center justify-center bg-gray-600 text-text-primary rounded-md font-bold text-xs">{m.name.slice(0, 2)}</div>,
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
      <div className="flex flex-col flex-1 min-h-0 bg-bg-secondary text-text-primary">
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-border-color bg-bg-secondary sticky top-0 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }} 
            className="p-1.5 -ml-1 hover:bg-bg-secondary rounded-full transition cursor-pointer"
          >
            <ChevronLeft size={22} className="text-text-primary" />
          </button>
          <h2 className="text-base font-bold text-text-primary">{t('deposit.payment_method')}</h2>
          <button onClick={handleBack} className="p-1.5 hover:bg-bg-secondary rounded-full transition cursor-pointer">
            <X size={20} className="text-text-primary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
          {/* Categories */}
          <div className="p-3 pb-0 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
            {['ALL', 'RECOMMENDED', 'E-PAY', 'CRYPTO'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as any)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                  activeCategory === cat 
                    ? "bg-bg-tertiary border-white/20 text-white" 
                    : "bg-bg-tertiary border-transparent text-[#7E7E7E] hover:border-border-color"
                )}
              >
                {cat === 'ALL' ? t('deposit.category_all') : cat === 'RECOMMENDED' ? t('deposit.category_recommended') : cat === 'E-PAY' ? t('deposit.category_epay') : t('deposit.category_crypto')}
              </button>
            ))}
          </div>

          <div className="p-3 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-[#555]" />
              </div>
              <input 
                type="text"
                placeholder={t('deposit.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-tertiary border border-border-color rounded-xl py-2.5 pl-10 pr-3 text-text-primary text-sm focus:outline-none focus:border-blue-500/20 transition-all placeholder-[#555]"
              />
            </div>

            {/* Methods List */}
            <div className="space-y-1">
              {filteredMethods
                .filter(m => activeCategory === 'ALL' || (activeCategory === 'RECOMMENDED' ? m.isPopular : m.category === activeCategory))
                .map(method => {
                  const isSelected = method.id === selectedMethod.id;
                  return (
                    <button
                      key={method.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMethod(method);
                        if (setHasManuallySelected) setHasManuallySelected(true);
                        setStep('SUMMARY');
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 py-3 px-4 transition-all text-left cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.05] border-b border-border-color",
                        isSelected && "bg-white/[0.03]"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-lg shadow-black/20">
                        {method.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-base font-medium text-text-primary/90 truncate block">
                          {method.name}
                        </span>
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />}
                    </button>
                  );
              })}
            </div>
          </div>
        </div>
      </div>
    );
};

const AmountSelection = ({ handleBack, amount, setAmount, amountError, setAmountError, currencyCode, currencySymbol, minDeposit, setStep }: any) => {
    const { t } = useTranslation();
    const rate = EXCHANGE_RATES[currencyCode] || 1;
    const presets = currencyCode === 'BDT' 
      ? [10000, 5000, 2000, 1000, 500] 
      : [Math.round(500 * rate), Math.round(250 * rate), Math.round(100 * rate), Math.round(50 * rate), Math.round(20 * rate), Math.round(10 * rate)];

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-bg-secondary text-text-primary">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-border-color">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }} 
            className="p-1.5 -ml-1 hover:bg-bg-secondary rounded-full transition cursor-pointer"
          >
            <ChevronLeft size={22} className="text-text-primary" />
          </button>
          <h2 className="text-lg font-bold text-text-primary">{t('deposit.amount')}</h2>
          <div className="w-8" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-12 scrollbar-hide pt-4">
          {/* Input Field */}
          <div className="space-y-3">
            <label className="text-[11px] text-[#7E7E7E] font-black uppercase tracking-[0.1em] ml-1">{t('withdraw.enter_amount')}</label>
            <div className={cn(
              "bg-bg-tertiary rounded-2xl p-6 border-2 transition-all shadow-inner flex flex-col items-center gap-1",
              amountError ? "border-red-500" : "border-border-color focus-within:border-[#00ff00]"
            )}>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#555]">{currencySymbol}</span>
                <input 
                  type="number" 
                  value={isNaN(amount) || !amount ? '' : amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    let num = Number(val);
                    setAmount(num);
                    setAmountError(null);
                  }}
                  className="w-auto max-w-[200px] bg-transparent text-5xl font-black text-text-primary focus:outline-none placeholder-[#222] text-center"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <p className="text-[12px] font-bold text-[#7E7E7E] uppercase tracking-widest">{currencyCode} {t('common.balance')}</p>
            </div>
            {amountError && <p className="text-[11px] text-red-500 font-bold text-center mt-2">{amountError}</p>}
          </div>

          {/* Preset Grid */}
          <div className="space-y-3">
            <label className="text-[11px] text-[#7E7E7E] font-black uppercase tracking-[0.1em] ml-1">{t('common.quick_select')}</label>
            <div className="grid grid-cols-3 gap-2">
              {presets.map(val => (
                <button
                  key={val}
                  onClick={(e) => {
                    e.stopPropagation();
                    setAmount(val);
                    setAmountError(null);
                  }}
                  className={cn(
                    "py-4 rounded-xl bg-bg-tertiary transition-all font-black text-sm border-2 active:scale-95 shadow-lg",
                    amount === val ? "border-[#00ff00] text-[#00ff00] bg-[#00ff00]/5" : "border-transparent text-text-primary/80 hover:border-border-color"
                  )}
                >
                  <span className="opacity-40 text-[10px] mr-1">{currencySymbol}</span>
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="pt-2 sticky bottom-0 bg-bg-secondary pb-6">
            <button 
              disabled={!!amountError || !amount || amount < minDeposit}
              onClick={(e) => {
                e.stopPropagation();
                setStep('SUMMARY');
              }}
              className={cn(
                "w-full font-black py-4 rounded-xl transition-all active:scale-[0.98] text-lg shadow-[0_10px_25px_rgba(0,0,0,0.3)] cursor-pointer uppercase tracking-widest",
                (!amountError && amount >= minDeposit) 
                  ? "bg-[#00ff00] text-black hover:bg-[#00e600]" 
                  : "bg-bg-secondary text-[#333] cursor-not-allowed opacity-50"
              )}
            >
              Confirm
            </button>
            <p className="text-center text-[10px] text-[#7E7E7E] mt-4 font-bold uppercase tracking-widest opacity-60">
              Minimum deposit is {currencySymbol}{minDeposit} {currencyCode}
            </p>
          </div>
        </div>
      </div>
    );
};

const PromoSelection = ({ handleBack, amount, currencyCode, currencySymbol, depositSettings, selectedPromo, setSelectedPromo, promoInput, setPromoInput, setStep, promoCodes }: any) => {
    const { t } = useTranslation();
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validateFormat = (code: string) => {
      if (!code) return null;
      if (code.length < 4) return t('deposit.promo_min_chars');
      if (code.length > 20) return t('deposit.promo_too_long');
      if (!/^[A-Z0-9_-]+$/.test(code)) return t('deposit.promo_invalid_chars');
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
        setError(t('deposit.invalid_code'));
        return;
      }

      const now = Date.now();
      if (promo.expiresAt && now > promo.expiresAt) {
        setError(t('deposit.expired_code'));
        return;
      }

      const rate = EXCHANGE_RATES[currencyCode] || 1;
      const amountUSD = amount / rate;
      if (amountUSD < promo.minDeposit) {
        setError(t('deposit.min_deposit_error', { amount: `${currencySymbol}${Math.round(promo.minDeposit * rate).toLocaleString()}` }));
        return;
      }

      setPromoInput(promo.code);
      setSelectedPromo('ACTIVE');
      setStep('SUMMARY');
    };

    return (
      <div className="flex flex-col flex-1 min-h-0 bg-bg-primary text-text-primary">
        {/* Header */}
        <div className="p-2 flex items-center justify-between border-b border-border-color">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleBack();
            }} 
            className="p-1.5 -ml-1 hover:bg-bg-secondary rounded-full transition cursor-pointer"
          >
            <ChevronLeft size={20} className="text-text-primary" />
          </button>
          <h2 className="text-sm font-bold text-text-primary">Deposit</h2>
          <div className="w-8" />
        </div>

        <div className="px-3 pb-1 pt-2">
          <h1 className="text-lg font-bold text-text-primary mb-2">{t('deposit.choose_promo')}</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-12 scrollbar-hide">
          {/* Manual Entry */}
          <div className="bg-bg-tertiary rounded-lg p-3 shadow-sm border border-border-color">
            <label className="block text-[10px] text-[#7E7E7E] uppercase font-bold mb-1.5">{t('deposit.enter_manual_code')}</label>
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
                  "flex-1 bg-bg-tertiary border rounded-lg px-3 py-2 text-xs text-white focus:outline-none transition",
                  error ? "border-red-500/50 focus:border-red-500" : "border-border-color focus:border-[#00ff00]"
                )}
              />
              <button 
                onClick={() => validateAndApply(manualCode)}
                disabled={!manualCode}
                className="bg-[#00ff00] text-black font-bold px-4 rounded-lg hover:bg-[#00dd00] transition disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {t('common.apply')}
              </button>
            </div>
            {error && <p className="text-red-500 text-[10px] mt-1.5">{error}</p>}
          </div>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-color"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-bg-primary px-2 text-[#7E7E7E]">{t('deposit.or_choose_active')}</span>
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
                <div key={promo.id} className={`bg-bg-tertiary rounded-lg overflow-hidden shadow-sm border border-border-color ${isExpired ? 'opacity-50 grayscale' : ''}`}>
                  <div className="p-3 relative">
                    <div className="text-[10px] text-[#7E7E7E] mb-0.5">
                      {isExpired ? t('common.expired') : `${t('deposit.expires_on')} ${new Date(promo.expiresAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </div>
                    <h3 className="text-base font-bold text-text-primary mb-2">{promo.title || t('deposit.bonus_title')}</h3>
                    <p className="text-[12px] text-[#7E7E7E] max-w-[200px] leading-tight">
  {t('deposit.use_code_notice', { code: promo.code, amount: `${currencyCode} ${Math.round(promo.minDeposit * rate).toLocaleString()}` })}
</p>
                    
                    {/* Badge */}
                    <div className="absolute top-3 right-3">
                      <div className="relative w-11 h-11 flex items-center justify-center">
                        <div className={`absolute inset-0 bg-[#00ff00] rounded-full opacity-20 ${!isExpired ? 'animate-pulse' : ''}`} />
                        <div className="bg-[#00ff00] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-md rotate-[-15deg] shadow-sm z-10 text-center leading-tight">
                          {t('deposit.up_to')}<br/>{promo.bonusPercentage}%
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
                    className={`w-full py-2.5 border-t border-border-color font-bold transition cursor-pointer text-xs ${isExpired || isMinNotMet ? 'text-[#7E7E7E] cursor-not-allowed' : 'text-[#00ff00] hover:bg-bg-secondary'}`}
                  >
                    {isExpired ? t('common.expired') : isMinNotMet ? t('deposit.min_deposit_not_met') : t('deposit.apply_promo_code')}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-[#7E7E7E] text-xs">
              {t('deposit.no_active_codes')}
            </div>
          )}
        </div>
      </div>
    );
};

const PaymentDetails = ({ handleBack, selectedMethod, amount, currencyCode, currencySymbol, depositSettings, transactionId, setTransactionId, handleSubmitDeposit, isProcessing }: any) => {
    const { t } = useTranslation();
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
        const timer = setTimeout(() => setLoading(false), 300);
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
    const cryptoQrCode = depositSettings.cryptoQrCodes?.[selectedMethod.id] || (selectedMethod.id === 'binance_pay' ? depositSettings.binancePayQrCode : '');
    const isEPay = selectedMethod.category === 'E-PAY' && !isLocalMethod;

    const needsConversion = isLocalMethod && currencyCode !== 'BDT' && !selectedMethod.id.includes('upi');
    const exchangeRate = depositSettings.exchangeRate || 120;
    const localAmount = needsConversion ? amount * exchangeRate : amount;
    const displayCurrency = needsConversion ? 'BDT' : currencyCode;
    const displaySymbol = needsConversion ? 'BDT ' : currencySymbol;

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
      if (selectedMethod.id === 'usdt_ton') return { label: 'USDT (TON) Address', value: depositSettings.usdtTonAddress || 'Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'ADDRESS', paymentType: 'Transfer' };
      
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

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isCrypto && selectedMethod.id !== 'binance_pay') {
      return (
        <div className="flex flex-col flex-1 min-h-0 bg-bg-primary text-text-primary font-sans overflow-y-auto pb-20">
          {/* Header */}
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 bg-bg-secondary rounded-2xl flex items-center justify-center border border-border-color mb-2">
                {selectedMethod.icon}
              </div>
              <h2 className="text-xl font-black tracking-tight">{t('deposit.deposit_title', { name: selectedMethod.name })}</h2>
<p className="text-sm text-gray-400 font-medium">{t('deposit.send_only_notice', { name: selectedMethod.name })}</p>
            </div>

            {/* QR Code Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-3 rounded-3xl shadow-2xl shadow-blue-500/10">
                {cryptoQrCode ? (
                  <img src={cryptoQrCode} alt="QR Code" className="w-44 h-44 object-contain" />
                ) : (
                  <div className="w-44 h-44 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                    <QrCode size={40} strokeWidth={1.5} />
                    <span className="text-[10px] font-bold mt-2 uppercase tracking-widest">{t('common.qr_not_available')}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-bg-secondary rounded-full border border-border-color">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-bold text-gray-300">{t('deposit.waiting_payment')}</span>
              </div>
            </div>

            {/* Details Card */}
            <div className="space-y-4">
              <div className="bg-bg-tertiary rounded-3xl p-5 border border-border-color space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('deposit.amount_to_pay')}</span>
<button onClick={() => handleCopy(amount.toString())} className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-blue-400 transition">{copied ? t('common.copied') : t('common.copy')}</button>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-text-primary">{amount.toFixed(2)}</span>
                    <span className="text-sm font-bold text-gray-400">USDT</span>
                  </div>
                </div>

                <div className="h-px bg-bg-secondary w-full"></div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('deposit.deposit_address')}</span>
<button onClick={() => handleCopy(target.value)} className="text-blue-500 text-[10px] font-black uppercase tracking-widest hover:text-blue-400 transition">{copied ? t('common.copied') : t('common.copy')}</button>
                  </div>
                  <div className="bg-bg-secondary p-3 rounded-xl border border-border-color break-all">
                    <span className="text-sm font-mono text-gray-300 leading-relaxed">{target.value}</span>
                  </div>
                </div>
              </div>

              {/* Transaction ID Input */}
              <div className="bg-bg-tertiary rounded-3xl p-5 border border-border-color space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('deposit.transaction_id')}</label>
                  <input 
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={t('deposit.enter_hash_placeholder')}
                    className="w-full bg-bg-secondary border border-border-color rounded-xl px-4 py-3 text-sm font-bold text-text-primary focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('deposit.expires_in', { time: formatTime(timeLeft) })}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-500">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t('deposit.secure_payment')}</span>
                </div>
              </div>

              <button 
                disabled={!transactionId || isProcessing}
                onClick={() => handleSubmitDeposit()}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-base transition-all shadow-xl mt-2 uppercase tracking-widest",
                  transactionId && !isProcessing ? "bg-blue-600 text-white active:scale-95 shadow-blue-500/20" : "bg-bg-secondary text-gray-600 cursor-not-allowed"
                )}
              >
                {isProcessing ? (
  <div className="flex items-center justify-center gap-2">
    <Loader2 className="animate-spin size-5" />
    <span>{t('common.processing')}</span>
  </div>
) : t('deposit.confirm_deposit')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (selectedMethod.id === 'binance_pay') {
      return (
        <div className="flex flex-col flex-1 min-h-0 bg-bg-secondary text-text-primary font-sans overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#f3ba2f] rounded-sm flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-black"><path d="M16.624 13.9202l2.7175 2.7154-7.353 7.353-7.353-7.352 2.7175-2.7164 4.6355 4.6595 4.6356-4.6595zm4.6366-4.6366L24 12l-2.7394 2.7154-2.7384-2.7154 2.7384-2.7154zM7.376 10.0798L4.6585 7.3644 12 0l7.353 7.352-2.7175 2.7164-4.6355-4.6595-4.6356 4.6595zM2.7384 9.2846L0 12l2.7394 2.7154 2.7384-2.7154L2.7384 9.2846zm9.2616-2.7154l2.7175 2.7164-2.7175 2.7154-2.7175-2.7154 2.7175-2.7164z"/></svg>
              </div>
              <span className="text-[#f3ba2f] font-bold text-lg">BINANCE</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-[#f3ba2f] text-black px-3 py-1 rounded text-sm font-medium">{t('auth.sign_up')}</button>
              <button className="text-text-primary"><Menu size={20} /></button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Warning Banner */}
            <div className="bg-[#2b3139] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-gray-300">
                <AlertCircle size={14} />
                <span>{t('deposit.binance_warning')}</span>
              </div>
              <div className="text-gray-400">
                {t('deposit.time_left')} <span className="text-[#f3ba2f] font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Main Card */}
            <div className="bg-[#1e2329] rounded-xl border border-gray-800 p-6 flex flex-col items-center">
              <p className="text-gray-400 text-sm mb-2">{t('deposit.payment_amount')}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-bold">{amount.toFixed(2)}</span>
                <span className="text-sm text-gray-400">USDT</span>
              </div>

              <div className="bg-white p-2 rounded-xl mb-4">
                {depositSettings.binancePayQrCode ? (
                  <img src={depositSettings.binancePayQrCode} alt="Binance Pay QR" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <span className="text-gray-400 text-sm">{t('common.qr_not_available')}</span>
                  </div>
                )}
              </div>

              <p className="font-medium mb-6">{t('deposit.scan_to_pay_binance')}</p>

              <div className="w-full flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-800"></div>
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-gray-800"></div>
              </div>

              <button 
                onClick={() => {
                  setTransactionId('BINANCE_PAY_' + Date.now());
                  handleSubmitDeposit();
                }}
                disabled={isProcessing}
                className="w-full bg-[#f3ba2f] hover:bg-[#fcd535] text-black font-bold py-3 rounded-lg transition-colors mb-4"
              >
                {isProcessing ? t('common.processing') : t('deposit.continue_browser')}
              </button>

              <p className="text-xs text-gray-500 text-center mb-8">
  {t('deposit.binance_user_notice')}
</p>

              <div className="w-full space-y-3 text-sm">
                <div className="flex justify-between">
  <span className="text-gray-500">{t('deposit.merchant_name')}</span>
  <span className="font-medium">AOLLIKUS LIMITED</span>
</div>
<div className="flex justify-between">
  <span className="text-gray-500">{t('deposit.product_name')}</span>
  <span className="font-medium">{t('deposit.deposit_product')}</span>
</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

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
<p className="text-xl font-black">{localAmount.toFixed(2).toLocaleString()}</p>
</div>
<div className="text-right">
<p className="text-[11px] font-medium">{t('deposit.time_left')} <span className="text-sm font-bold ml-1">{formatTime(timeLeft)}</span></p>
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
                  {isLocalMethod ? target.paymentType : isCrypto ? t('deposit.crypto_transfer') : t('deposit.ewallet_payment')}
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
    {t('deposit.send_only_local_notice', { type: target.paymentType === 'Cash Out' ? t('deposit.cashout') : t('deposit.send_money') })}
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
    {t('deposit.enter_info_notice')}
</p>
          </div>

          {/* Step 2 - Compact */}
          <div className="relative bg-[#4DD8F5] rounded-[20px] p-4 overflow-hidden shadow-sm">
            <div className="absolute -left-3 -bottom-6 text-[80px] font-black text-text-secondary/30 -z-0 leading-none select-none">2</div>
            <div className="relative z-10 space-y-3">
                <p className="text-base font-bold text-[#1a1b1e]">{t('deposit.transaction_id')}</p>
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
            onClick={() => handleSubmitDeposit()}
            className={cn(
                "w-full py-3 rounded-full font-bold text-base transition-all shadow-lg mt-2",
                transactionId && !isProcessing ? "bg-[#D12053] text-white active:scale-95 shadow-pink-500/20" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {isProcessing ? (
  <div className="flex items-center justify-center gap-2">
    <Loader2 className="animate-spin size-4" />
    <span className="text-sm">{t('common.processing')}</span>
  </div>
) : t('deposit.confirm_payment')}
          </button>
        </div>
      </div>
    );
};

const Confirmation = ({ onClose, transactionId, selectedMethod, amount, currencyCode, currencySymbol, localAmount, depositStatus }: any) => {
    const { t } = useTranslation();
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-bg-primary text-text-primary p-4 items-center justify-center text-center overflow-y-auto pb-16">
        {depositStatus === 'SUCCESS' ? (
          <>
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-[#00ff00]/10 rounded-full flex items-center justify-center mb-4 border border-[#00ff00]/20"
            >
              <CheckCircle2 size={48} className="text-[#00ff00]" />
            </motion.div>
            
            <h2 className="text-2xl font-black text-text-primary mb-2">{t('deposit.success_title')}</h2>
<p className="text-[#7E7E7E] mb-8 max-w-[280px]">
  {t('deposit.success_message', { amount: `${currencySymbol}${localAmount.toLocaleString()}` })}
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
            
            <h2 className="text-2xl font-black text-text-primary mb-2">{t('deposit.pending_title')}</h2>
<p className="text-[#7E7E7E] mb-8 max-w-[280px]">
  {t('deposit.pending_message', { amount: `${currencySymbol}${localAmount.toLocaleString()}` })}
</p>
          </>
        )}

        <div className="w-full bg-bg-tertiary rounded-2xl p-4 border border-border-color space-y-4 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-[#7E7E7E] text-sm">{t('deposit.transaction_id')}</span>
            <span className="text-text-primary font-mono text-sm">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#7E7E7E] text-sm">{t('common.method')}</span>
            <span className="text-text-primary font-bold text-sm">{selectedMethod.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#7E7E7E] text-sm">{t('common.status')}</span>
            <span className="bg-[#00ff00]/10 text-[#00ff00] text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">
              {depositStatus === 'SUCCESS' ? t('common.completed') : t('deposit.verifying')}
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
          {t('deposit.back_to_trading')}
        </button>
      </div>
    );
  };


export default function DepositFlow({ isOpen, onClose, currencySymbol, currencyCode, initialPromoCode, socket, userEmail, rawBalance, userId }: DepositFlowProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('SUMMARY');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [hasManuallySelected, setHasManuallySelected] = useState(false);

  const isBdtMethod = ['bkash_p2c', 'nagad_p2c', 'rocket_p2c', 'upay_p2c'].includes(selectedMethod.id);
  const isCryptoOrBinance = selectedMethod.category === 'CRYPTO' || selectedMethod.id === 'binance_pay';
  
  const displayCurrencyCode = isBdtMethod ? 'BDT' : (isCryptoOrBinance ? 'USDT' : currencyCode);
  const displayCurrencySymbol = isBdtMethod ? '৳' : (isCryptoOrBinance ? '₮' : currencySymbol);

  const rate = EXCHANGE_RATES[displayCurrencyCode] || 1;
  const minDeposit = displayCurrencyCode === 'BDT' ? 500 : (isCryptoOrBinance ? 5 : Math.round(10 * rate));
  const [amount, setAmount] = useState<number>(minDeposit);

  useEffect(() => {
    setAmount(minDeposit);
  }, [displayCurrencyCode, minDeposit]);
  const [selectedPromo, setSelectedPromo] = useState<string | null>(initialPromoCode ? 'ACTIVE' : null);
  const [promoInput, setPromoInput] = useState<string>(initialPromoCode || '');

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Simulate secure connection load time between 5 and 7 seconds
      const loadTime = Math.floor(Math.random() * (7000 - 5000 + 1) + 5000);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, loadTime);
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
    customMethods: [] as any[],
    binancePayId: '123456789',
    binancePayQrCode: '',
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
    methodLogos: {} as Record<string, string>,
    cryptoQrCodes: {} as Record<string, string>
  });

  useEffect(() => {
    if (hasManuallySelected) return;

    const allMethods = [
      ...PAYMENT_METHODS,
      ...(depositSettings?.customMethods || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        icon: m.logo ? <img src={m.logo} alt={m.name} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" /> : <div className="w-10 h-10 flex items-center justify-center bg-gray-600 text-text-primary rounded-md font-bold text-xs">{m.name.slice(0, 2)}</div>,
        category: m.category === 'MOBILE' ? 'E-PAY' : m.category,
        minAmount: '$10.00'
      }))
    ];

    const filteredMethods = allMethods.filter(m => {
      const isEnabled = depositSettings?.enabledMethods ? depositSettings.enabledMethods.includes(m.id) : true;
      return isEnabled;
    });

    if (filteredMethods.length > 0) {
      let defaultMethod = filteredMethods[0];
      
      if (currencyCode === 'BDT') {
         const bdtMethod = filteredMethods.find(m => ['bkash_p2c', 'nagad_p2c', 'rocket_p2c', 'upay_p2c'].includes(m.id));
         if (bdtMethod) defaultMethod = bdtMethod;
      } else if (currencyCode === 'INR') {
         const inrMethod = filteredMethods.find(m => m.id === 'upi');
         if (inrMethod) defaultMethod = inrMethod;
      } else {
         const usdMethod = filteredMethods.find(m => ['binance_pay', 'usdt_bep20', 'usdt_trc20'].includes(m.id));
         if (usdMethod) defaultMethod = usdMethod;
      }
      
      if (selectedMethod.id !== defaultMethod.id) {
        setSelectedMethod(defaultMethod);
      }
    }
  }, [currencyCode, depositSettings?.enabledMethods, depositSettings?.customMethods, hasManuallySelected, selectedMethod.id]);

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
        showToast(error, "error");
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

  const handleConfirmPaymentTransition = () => {
    setIsStepLoading(true);
    setTimeout(() => {
      setIsStepLoading(false);
      setStep('PAYMENT_DETAILS');
    }, 1500);
  };

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
    setStep('CONFIRM_PAYMENT');
  };

  if (!isOpen) return null;

  const handleBack = () => {
    if (step === 'SUMMARY') onClose();
    else if (step === 'PAYMENT_METHOD') setStep('SUMMARY');
    else if (step === 'AMOUNT_SELECTION') setStep('SUMMARY');
    else if (step === 'PROMO_SELECTION') setStep('SUMMARY');
    else if (step === 'CONFIRM_PAYMENT') setStep('SUMMARY');
    else if (step === 'CONFIRMATION') onClose();
    else if (step === 'PAYMENT_DETAILS') setStep('CONFIRM_PAYMENT');
    else setStep('SUMMARY');
  };

  const handleSubmitDeposit = () => {
    if (!transactionId) return;
    
    if (displayCurrencyCode === 'BDT' && amount < 500) {
      setAmountError(t('deposit.min_deposit_error', { amount: 500, currency: 'BDT' }));
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate professional processing
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
        showToast(t('common.auth_error'), "error");
      }
    }, 1500);
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
    { id: 0, name: t('common.method') },
    { id: 1, name: t('deposit.amount') },
    { id: 2, name: t('auth.promo_code_label') },
    { id: 3, name: t('deposit.summary') },
    { id: 4, name: t('common.pay') },
    { id: 5, name: t('common.done') }
  ];

  return (
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col pointer-events-auto"
    >
      <AnimatePresence mode="wait">
        {isLoading || isStepLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center bg-bg-primary"
          >
            <div className="flex flex-col items-center space-y-6">
              <div className="w-10 h-10 border-4 border-border-color border-t-accent-color rounded-full animate-spin" />
              <p className="text-text-primary/70 font-medium text-sm animate-pulse">
                {isStepLoading ? t('deposit.preparing_payment') : t('deposit.securing_connection')}
              </p>
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
            setHasManuallySelected={setHasManuallySelected}
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
          {step === 'CONFIRM_PAYMENT' && <ConfirmPaymentView 
            handleBack={handleBack}
            onConfirm={handleConfirmPaymentTransition}
            selectedMethod={selectedMethod}
            amount={amount}
            currencyCode={displayCurrencyCode}
            currencySymbol={displayCurrencySymbol}
            promoInput={promoInput}
            selectedPromo={selectedPromo}
            promoCodes={promoCodes}
            userId={userId}
            depositSettings={depositSettings}
          />}
          {step === 'PAYMENT_DETAILS' && <PaymentDetails 
            handleBack={() => setStep('CONFIRM_PAYMENT')} 
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
            <div className="bg-bg-tertiary p-6 rounded-2xl border border-border-color flex flex-col items-center space-y-6 w-72">
              <div className="relative">
                <Loader2 size={40} className="text-[#00ff00] animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-text-primary font-bold text-base">Processing Deposit</p>
                <p className="text-text-secondary/50 text-sm">Please wait while we verify your transaction...</p>
              </div>
              <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.5, ease: "linear" }}
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
