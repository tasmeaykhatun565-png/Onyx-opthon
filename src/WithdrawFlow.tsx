import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { cn } from './utils';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Wallet, 
  ArrowUpRight, 
  ArrowRight,
  ShieldCheck, 
  Info,
  ChevronRight,
  Smartphone,
  CreditCard,
  Bitcoin,
  ChevronLeft,
  X,
  CreditCard as BankIcon,
  CircleOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  BDT: 110,
  EUR: 0.92,
  INR: 83,
  PKR: 278,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.53,
  BRL: 4.95,
  NGN: 1150,
  IDR: 15600,
  MYR: 4.75,
  PHP: 56,
  THB: 35.8,
  VND: 24600
};

interface WithdrawFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onDepositClick?: () => void;
  currencySymbol: string;
  currencyCode: string;
  socket: any;
  userEmail: string;
  balance: number;
  activeAccount: string;
  turnoverRequired?: number;
  turnoverAchieved?: number;
  platformSettings?: any;
}

const WITHDRAW_METHODS = [
  { 
    id: 'bkash', 
    name: 'bKash', 
    logo: 'https://raw.githubusercontent.com/t-asif/trading-assets/main/bkash.png', 
    color: '#E2136E', 
    category: 'Local (BDT)' 
  },
  { 
    id: 'nagad', 
    name: 'Nagad', 
    logo: 'https://raw.githubusercontent.com/t-asif/trading-assets/main/nagad.png', 
    color: '#F7941D', 
    category: 'Local (BDT)' 
  },
  { 
    id: 'rocket', 
    name: 'Rocket', 
    logo: 'https://raw.githubusercontent.com/t-asif/trading-assets/main/rocket.png', 
    color: '#8C3494', 
    category: 'Local (BDT)' 
  },
  { 
    id: 'upay', 
    name: 'Upay', 
    logo: 'https://raw.githubusercontent.com/t-asif/trading-assets/main/upay.png', 
    color: '#FFBE00', 
    category: 'Local (BDT)' 
  },
  { 
    id: 'binance', 
    name: 'Binance Pay', 
    logo: 'https://raw.githubusercontent.com/t-asif/trading-assets/main/binance.png', 
    color: '#f3ba2f', 
    category: 'International (USD/USDT)' 
  },
  { 
    id: 'usdt', 
    name: 'USDT (TRC20)', 
    logo: 'https://cryptologos.cc/logos/tether-usdt-logo.png', 
    color: '#26A17B', 
    category: 'International (USD/USDT)' 
  },
  { 
    id: 'bank', 
    name: 'Bank Transfer', 
    logo: 'https://raw.githubusercontent.com/t-asif/trading-assets/main/bank.png', 
    color: '#3b82f6', 
    category: 'International (USD/USDT)' 
  },
];

export default function WithdrawFlow({ 
  isOpen, 
  onClose, 
  onDepositClick,
  currencySymbol, 
  currencyCode, 
  socket, 
  userEmail, 
  balance, 
  activeAccount, 
  turnoverRequired = 0, 
  turnoverAchieved = 0,
  platformSettings = {}
}: WithdrawFlowProps) {
  const [step, setStep] = useState<'LOADING' | 'OVERVIEW' | 'AMOUNT' | 'METHOD' | 'DETAILS' | 'SUCCESS' | 'ERROR'>('LOADING');
  const [amount, setAmount] = useState<number | ''>('');
  const [selectedMethod, setSelectedMethod] = useState<typeof WITHDRAW_METHODS[0] | null>(null);
  const [accountDetails, setAccountDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [allowedMethods, setAllowedMethods] = useState<string[]>([]);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);

  const turnoverRemaining = Math.max(0, turnoverRequired - turnoverAchieved);
  const isTurnoverMet = turnoverAchieved >= turnoverRequired;
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  const minBaseAmount = platformSettings.minWithdrawalAmount || 10;
  const minWithdraw = currencyCode === 'BDT' ? Math.round(minBaseAmount * 120) : Math.round(minBaseAmount * rate);
  const presets = currencyCode === 'BDT' 
    ? [Math.round(minBaseAmount * 120), Math.round(minBaseAmount * 120 * 3), Math.round(minBaseAmount * 120 * 5)] 
    : [Math.round(minBaseAmount * rate), Math.round(minBaseAmount * rate * 5), Math.round(minBaseAmount * rate * 10)];

  useEffect(() => {
    if (isOpen) {
      setStep('LOADING');
      // Force real account context for withdrawal UI if user is on demo
      const timer = setTimeout(() => {
        setStep('OVERVIEW');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!socket) return;
    
    const handleSuccess = () => {
      setIsProcessing(false);
      setStep('SUCCESS');
    };
    const handleError = (msg: string) => {
      setIsProcessing(false);
      setErrorMsg(msg);
      setStep('ERROR');
    };

    socket.on('withdraw-submitted', handleSuccess);
    socket.on('withdraw-error', handleError);

    socket.on('allowed-withdraw-methods', (methods: string) => {
      setAllowedMethods(methods ? methods.split(',') : []);
      setIsLoadingMethods(false);
    });

    socket.on('allowed-withdraw-methods-updated', (methods: string) => {
      setAllowedMethods(methods ? methods.split(',') : []);
    });

    if (userEmail) {
      socket.emit('get-allowed-withdraw-methods', userEmail);
    }

    return () => {
      socket.off('withdraw-submitted', handleSuccess);
      socket.off('withdraw-error', handleError);
      socket.off('allowed-withdraw-methods');
      socket.off('allowed-withdraw-methods-updated');
    };
  }, [socket, userEmail]);

  const filteredMethods = WITHDRAW_METHODS.filter(m => allowedMethods.includes(m.id));

  const handleSubmit = () => {
    if (activeAccount === 'DEMO') {
      setErrorMsg('Withdrawals are not available for Demo accounts. Please switch to your Real Account.');
      setStep('ERROR');
      return;
    }
    if (!isTurnoverMet) {
      setErrorMsg(`Turnover requirement not met. Remaining: ${currencySymbol}${turnoverRemaining.toLocaleString()}`);
      setStep('ERROR');
      return;
    }
    if (!amount || amount < minWithdraw || !selectedMethod || !accountDetails || !socket || !userEmail) return;
    if (amount > balance) {
      setErrorMsg('Insufficient balance.');
      setStep('ERROR');
      return;
    }
    
    setIsProcessing(true);
    socket.emit('submit-withdraw', {
      email: userEmail,
      amount: Number(amount),
      currency: currencyCode,
      method: selectedMethod.name,
      accountDetails
    });
  };

  const resetAndClose = () => {
    setAmount('');
    setSelectedMethod(null);
    setAccountDetails('');
    setStep('LOADING');
    setIsProcessing(false);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'LOADING':
        return (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 size={40} className="text-[#00ff5f] animate-spin" />
            <p className="text-white/40 font-bold text-xs uppercase tracking-widest">Securing Connection...</p>
          </div>
        );

      case 'OVERVIEW':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 px-6">
             <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <button onClick={resetAndClose} className="p-2 -ml-2 text-white/40 hover:text-white transition">
                      <ChevronLeft size={28} />
                   </button>
                   <h2 className="text-3xl font-black text-white tracking-tight">Withdraw</h2>
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-2 text-white/20 hover:text-white">
                      <Info size={24} />
                   </button>
                   <button onClick={resetAndClose} className="p-2 text-white/20 hover:text-white">
                      <X size={24} />
                   </button>
                </div>
             </div>

             {/* Account Card */}
             <div 
               className="bg-[#1c1c1e] rounded-[1.5rem] p-6 flex items-center justify-between border border-white/5 active:bg-[#252527] transition group cursor-pointer shadow-lg"
               onClick={() => activeAccount === 'REAL' && balance > 0 && setStep('AMOUNT')}
             >
                <div className="flex items-center gap-5">
                   <div className="flex flex-col">
                      <span className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] mb-1">From {activeAccount === 'REAL' ? 'Real' : 'Demo'} Account</span>
                      <span className="text-xl font-black text-white">
                        {activeAccount === 'REAL' ? `${currencyCode} ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${currencyCode} 0.00`}
                      </span>
                   </div>
                </div>
                <ChevronRight size={24} className="text-white/10 group-hover:text-[#00ff5f] transition-all" />
             </div>

             {/* Guidance Card */}
             <div className="bg-[#1c1c1e] rounded-[1.5rem] p-8 border border-white/5 flex flex-col gap-6 shadow-xl">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                    <Info size={24} className="text-white/40" />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-white/60 leading-relaxed font-bold">
                        {activeAccount === 'DEMO' 
                          ? "Withdrawals are only available for Real Account balances. Switch to your Real Account to proceed."
                          : balance < minWithdraw 
                          ? "You have insufficient funds to make a withdrawal from this account." 
                          : "To ensure security, withdrawals are processed back to the original funding source."}
                    </p>
                  </div>
                </div>

                {allowedMethods.length > 0 && activeAccount === 'REAL' && balance >= minWithdraw && (
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mb-4">Supported Gateways</p>
                    <div className="flex flex-wrap gap-3">
                      {allowedMethods.map(methodId => {
                        const method = WITHDRAW_METHODS.find(m => m.id === methodId);
                        if (!method) return null;
                        return (
                          <div key={methodId} className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/5">
                            <img src={method.logo} alt={method.name} className="w-5 h-5 object-contain" />
                            <span className="text-[11px] font-bold text-white/60">{method.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(activeAccount === 'DEMO' || balance < minWithdraw) && (
                  <button 
                    onClick={() => {
                      resetAndClose();
                      if (onDepositClick) onDepositClick();
                    }}
                    className="text-[#00ff5f] font-black text-sm flex items-center gap-2 hover:opacity-80 transition"
                  >
                      Make Deposit <ChevronRight size={18} strokeWidth={3} />
                  </button>
                )}
             </div>

             <div className="mt-auto pt-6">
                <button 
                  disabled={activeAccount !== 'REAL' || balance < minWithdraw}
                  onClick={() => setStep('AMOUNT')}
                  className="w-full bg-[#3d3d3f] text-white/30 font-black py-6 rounded-[2rem] disabled:opacity-40 transition-all text-xl shadow-2xl active:scale-[0.98]"
                >
                  Next Step
                </button>
             </div>
          </div>
        );

      case 'AMOUNT':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 px-6">
            <div className="flex items-center gap-4">
               <button onClick={() => setStep('OVERVIEW')} className="p-2 -ml-2 text-white/40 hover:text-white transition">
                  <ChevronLeft size={28} />
               </button>
               <h3 className="text-2xl font-black text-white tracking-tight">Withdraw Amount</h3>
            </div>

            <div className="relative group">
              <div className="absolute left-8 top-1/2 -translate-y-1/2 text-2xl font-black text-white/20 group-focus-within:text-[#00ff5f] transition-colors">
                {currencyCode === 'BDT' ? 'BDT' : currencySymbol}
              </div>
              <input 
                type="number" 
                inputMode="numeric"
                value={amount} 
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[#1c1c1e] py-12 pl-24 pr-8 rounded-[3rem] text-white font-black text-6xl focus:outline-none border-2 border-transparent focus:border-[#00ff5f]/30 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] placeholder:text-white/5"
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {presets.map(val => (
                <button 
                  key={val}
                  onClick={() => setAmount(val)}
                  className={cn(
                    "py-6 rounded-2xl bg-[#1c1c1e] border border-white/5 transition-all font-black text-base active:scale-95 shadow-lg",
                    amount === val ? "bg-[#00ff5f]/10 border-[#00ff5f] text-[#00ff5f] shadow-[#00ff5f]/10" : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                >
                  {currencyCode === 'BDT' ? 'BDT ' : currencySymbol}{val.toLocaleString()}
                </button>
              ))}
            </div>

            {turnoverRequired > 0 && (
              <div className="bg-[#1c1c1e] rounded-[2.5rem] p-8 border border-white/5 space-y-6 shadow-2xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={20} className="text-[#00ff5f]" />
                    <span className="text-[11px] font-black text-[#00ff5f] uppercase tracking-[0.2em]">Compliance Check</span>
                  </div>
                  <span className="text-xs font-black text-white/40">{Math.min(100, (turnoverAchieved / turnoverRequired) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
                  <div 
                    className="h-full bg-[#00ff5f] rounded-full shadow-[0_0_15px_rgba(0,255,95,0.4)] transition-all duration-1000 ease-out" 
                    style={{ width: `${Math.min(100, (turnoverAchieved / turnoverRequired) * 100)}%` }} 
                  />
                </div>
                <p className="text-[11px] text-white/40 leading-relaxed font-bold uppercase tracking-widest text-center">
                  {isTurnoverMet 
                    ? "✓ Trading volume satisfied. Verified." 
                    : `Complete ${currencyCode} ${turnoverRemaining.toLocaleString()} volume to unlock.`}
                </p>
              </div>
            )}

            <button 
              disabled={!amount || amount < minWithdraw || amount > balance || !isTurnoverMet}
              onClick={() => setStep('METHOD')}
              className="w-full bg-[#00ff5f] text-black font-extrabold py-7 rounded-[2.5rem] disabled:opacity-30 shadow-[0_15px_40px_rgba(0,255,95,0.2)] active:scale-[0.98] transition-all text-2xl mt-4"
            >
              Select Method
            </button>

            {amount && amount < minWithdraw && (
              <p className="text-center text-xs text-red-500 font-black uppercase tracking-widest animate-pulse">
                Min. Withdrawal: {currencyCode} {minWithdraw}
              </p>
            )}
          </div>
        );

      case 'METHOD':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 px-6">
            <div className="flex items-center gap-4">
               <button onClick={() => setStep('AMOUNT')} className="p-2 -ml-2 text-white/40 hover:text-white transition">
                  <ChevronLeft size={28} />
               </button>
               <h3 className="text-2xl font-black text-white tracking-tight">Withdraw Method</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {isLoadingMethods ? (
                <div className="flex flex-col items-center py-20 space-y-6">
                  <Loader2 className="animate-spin text-[#00ff5f]" size={48} />
                  <p className="text-xs text-white/40 font-black uppercase tracking-[0.2em]">Negotiating Protocols...</p>
                </div>
              ) : filteredMethods.length > 0 ? (
                filteredMethods.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => {
                      setSelectedMethod(m);
                      setStep('DETAILS');
                    }}
                    className="flex items-center justify-between p-6 rounded-[2.5rem] bg-[#1c1c1e] border border-white/5 hover:border-[#00ff5f]/40 transition-all group active:scale-[0.98] shadow-lg"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 overflow-hidden p-2 border border-white/10 group-hover:border-[#00ff5f]/20 transition-all">
                        <img 
                          src={m.logo} 
                          alt={m.name} 
                          className="w-full h-full object-contain" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-left">
                        <div className="font-black text-white text-xl">{m.name}</div>
                        <div className="text-[11px] text-white/40 uppercase font-black tracking-widest">Verified Payment Gateway</div>
                      </div>
                    </div>
                    <ChevronRight size={28} className="text-white/10 group-hover:text-[#00ff5f] transition-all" />
                  </button>
                ))
              ) : (
                <div className="bg-[#1c1c1e] rounded-[3rem] p-12 text-center flex flex-col items-center space-y-10 border border-white/5 shadow-2xl">
                  <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/10">
                    <CircleOff size={56} className="text-red-500 border-red-500/20" />
                  </div>
                  <div className="space-y-4">
                    <p className="text-3xl font-black text-white leading-tight">No Active Gateways</p>
                    <p className="text-sm text-white/40 leading-relaxed max-w-[300px] mx-auto font-bold uppercase tracking-wide">
                      A prior deposit must be established to whitelist a disbursement node.
                    </p>
                  </div>
                  <button 
                    onClick={() => { resetAndClose(); onDepositClick?.(); }}
                    className="bg-[#00ff5f] text-black font-black px-12 py-5 rounded-[2rem] shadow-[0_10px_40px_rgba(0,255,95,0.3)] active:scale-95 transition text-xl"
                  >
                    Deposit Now
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'DETAILS':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10 px-6">
            <div className="flex items-center gap-4">
               <button onClick={() => setStep('METHOD')} className="p-2 -ml-2 text-white/40 hover:text-white transition">
                  <ChevronLeft size={28} />
               </button>
               <h3 className="text-2xl font-black text-white tracking-tight">Payout Details</h3>
            </div>

            <div className="bg-[#1c1c1e] rounded-[3rem] p-10 border border-white/5 space-y-10 shadow-2xl">
              <div className="flex justify-between items-center pb-10 border-b border-white/5">
                <span className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em]">Target Disbursement</span>
                <span className="text-4xl font-black text-[#00ff5f]">{currencyCode} {amount?.toLocaleString()}</span>
              </div>
              
              <div className="space-y-5">
                <label className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em] ml-1">
                  Recipient {selectedMethod?.name} Address
                </label>
                <div className="relative group">
                   <input 
                     type="text" 
                     value={accountDetails} 
                     onChange={(e) => setAccountDetails(e.target.value)}
                     className="w-full bg-white/5 p-8 rounded-[2rem] text-white font-bold text-2xl focus:outline-none focus:ring-2 focus:ring-[#00ff5f]/30 transition-all border border-white/5 shadow-inner"
                     placeholder={selectedMethod?.id === 'usdt' ? "Txxx..." : "01XXXXXXXXX"}
                     autoFocus
                   />
                   <div className="absolute right-8 top-1/2 -translate-y-1/2 w-10 h-10 overflow-hidden flex items-center justify-center opacity-40">
                      <img src={selectedMethod?.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-6 p-7 bg-[#00ff5f]/5 border border-[#00ff5f]/10 rounded-[2rem]">
                <ShieldCheck size={32} className="text-[#00ff5f] shrink-0" />
                <p className="text-[11px] text-[#00ff5f] font-black leading-relaxed uppercase tracking-[0.15em]">
                  Security Protocol: Transmission is encrypted using 256-bit AES layers.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button 
                disabled={!accountDetails || isProcessing}
                onClick={handleSubmit}
                className="w-full bg-[#00ff5f] text-black font-black py-7 rounded-[2.5rem] disabled:opacity-50 shadow-[0_15px_40px_rgba(0,255,95,0.2)] active:scale-[0.98] transition-all flex justify-center items-center gap-4 text-2xl"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={32} /> : (
                   <>
                      Complete Payout <ArrowRight size={28} strokeWidth={3} />
                   </>
                )}
              </button>
            </div>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="py-24 text-center space-y-12 animate-in zoom-in-95 duration-700 px-6">
            <div className="relative">
               <div className="w-48 h-48 bg-[#00ff5f]/10 rounded-full flex items-center justify-center mx-auto border-2 border-[#00ff5f]/20 shadow-[0_0_80px_rgba(0,255,95,0.1)]">
                 <CheckCircle2 size={96} className="text-[#00ff5f]" />
               </div>
               <div className="absolute inset-0 bg-[#00ff5f]/15 blur-3xl -z-10 animate-pulse"></div>
            </div>
            <div className="space-y-6 px-4">
              <h3 className="text-5xl font-black text-white leading-tight tracking-tight">Request Transmitted</h3>
              <p className="text-xl text-white/30 font-bold max-w-[320px] mx-auto leading-relaxed">
                The disbursement of <span className="text-white font-black">{currencyCode} {amount}</span> has been broadcast to the nodes and is now in processing queue.
              </p>
            </div>
            <div className="pt-8">
               <button 
                 onClick={resetAndClose}
                 className="w-full bg-[#00ff5f] text-black font-black py-7 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,255,95,0.3)] text-2xl active:scale-95 transition-transform"
               >
                 Close Terminal
               </button>
            </div>
          </div>
        );

      case 'ERROR':
        return (
          <div className="py-24 text-center space-y-12 animate-in zoom-in-95 duration-700 px-6">
            <div className="w-48 h-48 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20 shadow-[0_0_80px_rgba(239,68,68,0.1)]">
              <XCircle size={96} className="text-red-500" />
            </div>
            <div className="space-y-6 px-6">
              <h3 className="text-4xl font-black text-white tracking-tight">Protocol Violation</h3>
              <p className="text-sm text-red-500/80 font-black uppercase tracking-[0.3em] leading-relaxed">{errorMsg}</p>
            </div>
            <div className="pt-8">
               <button 
                 onClick={() => setStep('OVERVIEW')}
                 className="w-full bg-white/5 text-white font-black py-7 rounded-[2.5rem] border border-white/10 active:scale-95 transition-transform text-2xl"
               >
                 Re-Initiate Protocol
               </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 35, stiffness: 300, mass: 0.7 }}
          className="fixed inset-0 z-[150] bg-[#121214] flex flex-col no-scrollbar overflow-y-auto"
        >
          <div className="flex-1 w-full max-w-xl mx-auto py-12 flex flex-col">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
          </div>

          {(step !== 'LOADING' && step !== 'SUCCESS' && step !== 'ERROR') && (
             <div className="w-full max-w-xl mx-auto pb-12 px-8 border-t border-white/5 pt-10 flex flex-col items-center space-y-4 opacity-30 mt-auto">
               <div className="flex items-center gap-3 text-white font-black text-[11px] uppercase tracking-[0.4em]">
                 <ShieldCheck size={16} className="text-[#00ff5f]" />
                 Quantum-Safe disbursement protocol v2.9
               </div>
               <p className="text-[10px] text-white font-bold opacity-50 uppercase tracking-[0.3em]">
                 End-to-End verified encryption active
               </p>
             </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}


