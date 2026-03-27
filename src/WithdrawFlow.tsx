import React, { useState, useEffect } from 'react';
import BottomSheet from './BottomSheet';
import { cn } from './utils';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Wallet, 
  ArrowUpRight, 
  ShieldCheck, 
  Info,
  ChevronRight,
  Smartphone,
  CreditCard,
  Bitcoin
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
  currencySymbol: string;
  currencyCode: string;
  socket: any;
  userEmail: string;
  balance: number;
  activeAccount: string;
  turnoverRequired?: number;
  turnoverAchieved?: number;
}

const WITHDRAW_METHODS = [
  { id: 'bkash', name: 'bKash', icon: <Smartphone size={20} />, color: '#E2136E' },
  { id: 'nagad', name: 'Nagad', icon: <Smartphone size={20} />, color: '#F7941D' },
  { id: 'rocket', name: 'Rocket', icon: <Smartphone size={20} />, color: '#8C3494' },
  { id: 'usdt', name: 'USDT (TRC20)', icon: <Bitcoin size={20} />, color: '#26A17B' },
];

export default function WithdrawFlow({ 
  isOpen, 
  onClose, 
  currencySymbol, 
  currencyCode, 
  socket, 
  userEmail, 
  balance, 
  activeAccount, 
  turnoverRequired = 0, 
  turnoverAchieved = 0 
}: WithdrawFlowProps) {
  const [step, setStep] = useState<'AMOUNT' | 'METHOD' | 'DETAILS' | 'SUCCESS' | 'ERROR'>('AMOUNT');
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
  const minWithdraw = currencyCode === 'BDT' ? 1200 : Math.round(10 * rate);
  const presets = currencyCode === 'BDT' ? [1200, 5000, 10000] : [Math.round(10 * rate), Math.round(50 * rate), Math.round(100 * rate)];

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
      setErrorMsg('You can only withdraw from your Real Account balance.');
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
    setStep('AMOUNT');
    setIsProcessing(false);
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'AMOUNT':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-6">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-[var(--text-primary)]">Withdraw Funds</h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Available Balance: <span className="text-[#00ff00]">{currencySymbol}{balance.toFixed(2)}</span></p>
            </div>

            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-3xl font-black text-[var(--text-secondary)] group-focus-within:text-[#00ff00] transition-colors">
                {currencySymbol}
              </div>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-[var(--bg-secondary)] py-8 pl-12 pr-6 rounded-3xl text-[var(--text-primary)] font-black text-4xl focus:outline-none border-2 border-transparent focus:border-[#00ff00]/30 transition-all shadow-inner"
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {presets.map(val => (
                <button 
                  key={val}
                  onClick={() => setAmount(val)}
                  className={cn(
                    "py-4 rounded-2xl bg-[var(--bg-secondary)] border-2 transition-all font-black text-sm active:scale-95",
                    amount === val ? "border-[#00ff00] text-[#00ff00]" : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]/30"
                  )}
                >
                  {currencySymbol}{val}
                </button>
              ))}
            </div>

            {turnoverRequired > 0 && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-blue-500" />
                    <span className="text-[11px] font-black text-blue-500 uppercase tracking-widest">Withdrawal Progress</span>
                  </div>
                  <span className="text-[11px] font-black text-blue-500">{Math.min(100, (turnoverAchieved / turnoverRequired) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-blue-500/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-700 ease-out" 
                    style={{ width: `${Math.min(100, (turnoverAchieved / turnoverRequired) * 100)}%` }} 
                  />
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium">
                  {isTurnoverMet 
                    ? "✓ Requirement met! You can withdraw your full balance now." 
                    : `You need to complete ${currencySymbol}${turnoverRemaining.toLocaleString()} more turnover before you can withdraw.`}
                </p>
              </div>
            )}

            <button 
              disabled={!amount || amount < minWithdraw || amount > balance || !isTurnoverMet}
              onClick={() => setStep('METHOD')}
              className="w-full bg-[#00ff00] text-black font-black py-5 rounded-2xl disabled:opacity-30 shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all text-lg mt-4"
            >
              Continue to Methods
            </button>
            {amount && amount < minWithdraw && (
              <p className="text-center text-[10px] text-red-500 mt-2 font-medium">
                Minimum withdrawal is {currencySymbol}{minWithdraw}
              </p>
            )}
          </div>
        );

      case 'METHOD':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Select Method</h3>
              <p className="text-xs text-[var(--text-secondary)]">Secure withdrawal gateway</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {isLoadingMethods ? (
                <div className="flex flex-col items-center py-8 space-y-3">
                  <Loader2 className="animate-spin text-[#00ff00]" size={32} />
                  <p className="text-xs text-[var(--text-secondary)] font-medium">Verifying payment gateways...</p>
                </div>
              ) : filteredMethods.length > 0 ? (
                filteredMethods.map(m => (
                  <button 
                    key={m.id}
                    onClick={() => {
                      setSelectedMethod(m);
                      setStep('DETAILS');
                    }}
                    className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[#22c55e]/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: m.color }}>
                        {m.icon}
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-[var(--text-primary)]">{m.name}</div>
                        <div className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">Instant Processing</div>
                      </div>
                    </div>
                    <ChevronRight size={20} className="text-[var(--text-secondary)] group-hover:text-[#22c55e] transition-colors" />
                  </button>
                ))
              ) : (
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 text-center space-y-3">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                    <XCircle size={24} className="text-red-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-[var(--text-primary)]">No Available Gateways</p>
                    <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                      To ensure security, you can only withdraw using the same payment gateway you used for deposits. Please make a deposit first.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setStep('AMOUNT')}
              className="w-full py-4 text-[var(--text-secondary)] font-bold text-sm hover:text-[var(--text-primary)] transition-colors"
            >
              Back to Amount
            </button>
          </div>
        );

      case 'DETAILS':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Account Details</h3>
              <p className="text-xs text-[var(--text-secondary)]">Withdrawal to {selectedMethod?.name}</p>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-color)] space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-[var(--border-color)]">
                <span className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-widest">Amount</span>
                <span className="text-lg font-black text-[var(--text-primary)]">{currencySymbol}{amount}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] text-[var(--text-secondary)] font-black uppercase tracking-widest">
                  {selectedMethod?.id === 'usdt' ? 'TRC20 Wallet Address' : `${selectedMethod?.name} Number`}
                </label>
                <input 
                  type="text" 
                  value={accountDetails} 
                  onChange={(e) => setAccountDetails(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] p-4 rounded-xl text-[var(--text-primary)] font-bold focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 transition-all"
                  placeholder={selectedMethod?.id === 'usdt' ? "Enter TRC20 Address" : "01XXXXXXXXX"}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
              <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
              <p className="text-[10px] text-emerald-500 font-medium leading-tight">
                Your withdrawal will be processed through our secure gateway. 
                Estimated time: 5-30 minutes.
              </p>
            </div>

            <div className="space-y-3">
              <button 
                disabled={!accountDetails || isProcessing}
                onClick={handleSubmit}
                className="w-full bg-[#22c55e] text-black font-black py-4 rounded-2xl disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Confirm Withdrawal'}
              </button>
              <button 
                disabled={isProcessing}
                onClick={() => setStep('METHOD')}
                className="w-full py-2 text-[var(--text-secondary)] font-bold text-sm hover:text-[var(--text-primary)] transition-colors"
              >
                Change Method
              </button>
            </div>
          </div>
        );

      case 'SUCCESS':
        return (
          <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/20">
              <CheckCircle2 size={48} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[var(--text-primary)]">Request Received</h3>
              <p className="text-sm text-[var(--text-secondary)] px-8">
                Your withdrawal of {currencySymbol}{amount} is being processed. 
                You will receive a notification once it's completed.
              </p>
            </div>
            <button 
              onClick={resetAndClose}
              className="w-full bg-[#22c55e] text-black font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20"
            >
              Done
            </button>
          </div>
        );

      case 'ERROR':
        return (
          <div className="py-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-red-500/20">
              <XCircle size={48} className="text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[var(--text-primary)]">Submission Failed</h3>
              <p className="text-sm text-red-500 px-8 font-medium">{errorMsg}</p>
            </div>
            <button 
              onClick={() => setStep('AMOUNT')}
              className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] font-black py-4 rounded-2xl border border-[var(--border-color)]"
            >
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={resetAndClose} className="bg-[var(--bg-primary)]">
      <div className="p-4 min-h-[400px]">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
        
        <div className="mt-8 pt-6 border-t border-[var(--border-color)] flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 text-[var(--text-secondary)] font-black text-[9px] uppercase tracking-[0.2em]">
            <ShieldCheck size={12} />
            Secure Withdrawal Gateway
          </div>
          <p className="text-[8px] text-[var(--text-secondary)]/50 font-medium">
            Powered by Hamproo Pay Secure
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}

