import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils';
import { 
  X, 
  XCircle,
  Loader2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  History, 
  Wallet, 
  Copy,
  Clock,
  ArrowRight,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import { useToast } from './Toast';

interface Transaction {
  id: number | string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  currency: string;
  method: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'SUCCESS';
  submittedAt: number;
  bonusAmount?: number;
  transactionId?: string;
  accountNumber?: string;
}

interface TransactionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  socket?: any;
  userEmail?: string;
}

const getMethodLogo = (method: string) => {
  const m = method.toLowerCase();
  if (m.includes('binance')) return 'https://raw.githubusercontent.com/t-asif/trading-assets/main/binance.png';
  if (m.includes('bkash')) return 'https://raw.githubusercontent.com/t-asif/trading-assets/main/bkash.png';
  if (m.includes('nagad')) return 'https://raw.githubusercontent.com/t-asif/trading-assets/main/nagad.png';
  if (m.includes('rocket')) return 'https://raw.githubusercontent.com/t-asif/trading-assets/main/rocket.png';
  if (m.includes('upay')) return 'https://raw.githubusercontent.com/t-asif/trading-assets/main/upay.png';
  if (m.includes('usdt')) return 'https://cryptologos.cc/logos/tether-usdt-logo.png';
  if (m.includes('bank') || m.includes('card')) return 'https://raw.githubusercontent.com/t-asif/trading-assets/main/bank.png';
  return null;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'APPROVED':
    case 'SUCCESS':
      return 'text-green-500';
    case 'REJECTED':
    case 'CANCELLED':
      return 'text-red-500';
    case 'PENDING':
      return 'text-amber-500';
    default:
      return 'text-gray-500';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'APPROVED':
    case 'SUCCESS':
      return 'Done';
    case 'REJECTED':
    case 'CANCELLED':
      return 'Canceled';
    case 'PENDING':
      return 'Pending';
    default:
      return status;
  }
};

export default function TransactionHistory({ isOpen, onClose, currencySymbol, socket, userEmail }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { showToast } = useToast();
  
  // Filters
  const [filterStatus, setFilterStatus] = useState('All statuses');
  const [filterAccount, setFilterAccount] = useState('All accounts');
  const [filterType, setFilterType] = useState('All types');

  const selectedTxRef = React.useRef(selectedTx);
  useEffect(() => {
    selectedTxRef.current = selectedTx;
  }, [selectedTx]);

  useEffect(() => {
    if (!socket || !isOpen || !userEmail) return;

    socket.emit('get-transactions', userEmail);
    
    // Add listener for withdrawal cancelled
    const handleWithdrawCancelled = ({ id }: { id: number }) => {
      setIsCancelling(false);
      showToast('Withdrawal cancelled successfully');
      // Refresh transactions
      socket.emit('get-transactions', userEmail);
      if (selectedTxRef.current && (selectedTxRef.current.id === id || String(selectedTxRef.current.id) === String(id))) {
        setSelectedTx(null);
      }
    };

    const handleWithdrawError = (error: string) => {
      setIsCancelling(false);
      showToast(error, 'error');
    };

    const handleUserTransactions = (data: { deposits: any[], withdrawals: any[] }) => {
      const userDeposits = data.deposits.map(d => ({ ...d, type: 'DEPOSIT' }));
      const userWithdrawals = data.withdrawals.map(w => ({ ...w, type: 'WITHDRAW' }));
      setTransactions([...userDeposits, ...userWithdrawals].sort((a, b) => b.submittedAt - a.submittedAt));
      setIsLoading(false);
    };

    socket.on('user-transactions', handleUserTransactions);
    socket.on('withdraw-cancelled', handleWithdrawCancelled);
    socket.on('withdraw-error', handleWithdrawError);
    socket.on('transaction-updated', () => {
      socket.emit('get-user-transactions', userEmail);
    });

    socket.emit('get-user-transactions', userEmail);

    return () => {
      socket.off('user-transactions', handleUserTransactions);
      socket.off('withdraw-cancelled', handleWithdrawCancelled);
      socket.off('withdraw-error', handleWithdrawError);
      socket.off('transaction-updated');
    };
  }, [socket, isOpen, userEmail]);

  const handleCancelWithdrawal = () => {
    if (!socket || !selectedTx || selectedTx.status !== 'PENDING') return;

    if (window.confirm('Are you sure you want to cancel this withdrawal? Funds will be returned to your account.')) {
      setIsCancelling(true);
      socket.emit('cancel-withdrawal', { id: selectedTx.id, email: userEmail });
    }
  };

  const formatDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    if (date.toDateString() === now.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const groupedTransactions = transactions.reduce((acc: any, tx) => {
    const label = formatDateLabel(tx.submittedAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(tx);
    return acc;
  }, {});

  const renderDetailView = (tx: Transaction) => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-10">
      <div className="flex flex-col items-center pt-4">
        <div className="w-20 h-20 bg-bg-secondary rounded-2xl flex items-center justify-center mb-4 overflow-hidden border border-border-color p-2">
          {getMethodLogo(tx.method) ? (
            <img src={getMethodLogo(tx.method)!} alt={tx.method} className="w-full h-full object-contain" />
          ) : (
            <Wallet size={40} className="text-[#00ff5f]" />
          )}
        </div>
        <h3 className="text-xl font-bold text-text-primary mb-1">{tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</h3>
        <p className="text-text-secondary/40 text-xs font-medium uppercase tracking-widest">{tx.currency} Account</p>
        <div className={cn("text-3xl font-black mt-6", tx.type === 'DEPOSIT' ? "text-[#00ff5f]" : "text-[#ff4757]")}>
          {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.currency === 'BDT' ? 'BDT' : currencySymbol} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {(tx.status === 'REJECTED' || tx.status === 'CANCELLED') && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <XCircle className="text-red-500" size={20} />
          <p className="text-red-500 font-bold text-sm">Payment canceled</p>
        </div>
      )}

      <div className="space-y-6 pt-4">
        <h4 className="text-text-primary font-bold text-lg mb-2">Details</h4>
        <div className="space-y-4">
          <DetailItem label="Status" value={getStatusLabel(tx.status)} valueClass={getStatusColor(tx.status)} />
          <DetailItem label="Request number" value={`#${tx.id}`} copyable />
          <DetailItem 
            label="Date & time" 
            value={new Date(tx.submittedAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            })} 
          />
          <DetailItem label="Payment method" value={tx.method} />
          <DetailItem label="Account" value={`${tx.currency} Account`} />
          <DetailItem label="Account number" value={tx.accountNumber || '#2923648399'} />
        </div>
      </div>

      {tx.type === 'WITHDRAW' && tx.status === 'PENDING' && (
        <button 
          onClick={handleCancelWithdrawal}
          disabled={isCancelling}
          className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl active:scale-95 transition mt-8 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          {isCancelling ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            <>
              <XCircle size={20} />
              Cancel Withdrawal
            </>
          )}
        </button>
      )}

      <button 
        onClick={() => setSelectedTx(null)}
        className="w-full bg-bg-secondary text-text-primary font-bold py-4 rounded-2xl border border-border-color active:scale-95 transition mt-4"
      >
        Close
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-[100] bg-[#121214] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-border-color">
            <button 
              onClick={() => selectedTx ? setSelectedTx(null) : onClose()} 
              className="p-2 -ml-2 text-text-secondary/60 hover:text-text-primary transition"
            >
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-text-primary tracking-tight absolute left-1/2 -translate-x-1/2">
              {selectedTx ? 'Details' : 'Transactions'}
            </h2>
            <div className="flex items-center gap-2">
              <button className="p-2 text-text-secondary/40 hover:text-text-primary transition">
                <Info size={22} />
              </button>
              <button onClick={onClose} className="p-2 text-text-secondary/40 hover:text-text-primary transition">
                <X size={22} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {selectedTx ? (
              <div className="p-6">
                {renderDetailView(selectedTx)}
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="p-4 px-6 flex items-center gap-3 overflow-x-auto no-scrollbar border-b border-border-color bg-[#121214]/80 backdrop-blur-xl sticky top-0 z-10">
                  <FilterChip label={filterStatus} />
                  <FilterChip label={filterAccount} />
                  <FilterChip label={filterType} />
                </div>

                <div className="p-6 space-y-8">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 relative overflow-hidden">
                      {/* Background Ambience */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#00ff5f]/5 blur-[60px] rounded-full" />
                      </div>

                      <div className="relative flex flex-col items-center justify-center">
                        {/* Professional Gradient Spinner */}
                        <div className="relative w-16 h-16 mb-8">
                          {/* Static track */}
                          <div className="absolute inset-0 rounded-full border-4 border-border-color" />
                          
                          {/* Animated Gradient Spinner */}
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00ff5f] border-r-[#00ff5f]/30 shadow-[0_0_20px_rgba(0,255,95,0.4)]"
                          />
                          
                          {/* Glow effect */}
                          <motion.div
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-[-6px] rounded-full bg-[#00ff5f]/10 blur-xl"
                          />
                        </div>

                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-2"
                        >
                          <p className="text-[#00ff5f] font-black text-[11px] uppercase tracking-[0.4em] drop-shadow-md">
                            Synchronizing Ledger
                          </p>
                          <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                className="w-1 h-1 bg-[#00ff5f] rounded-full"
                              />
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-20 space-y-6 flex flex-col items-center">
                      <div className="w-24 h-24 bg-bg-secondary rounded-full flex items-center justify-center">
                        <History size={48} className="text-text-secondary/10" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-text-primary">No entries found</p>
                        <p className="text-sm text-text-secondary/40 max-w-[200px] mx-auto">Your trading activity and payment history will appear here.</p>
                      </div>
                    </div>
                  ) : (
                    Object.keys(groupedTransactions).map(label => (
                      <div key={label} className="space-y-4">
                        <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
                          {label}
                        </h3>
                        <div className="space-y-3">
                          {groupedTransactions[label].map((tx: Transaction) => (
                            <button 
                              key={`${tx.type}-${tx.id}`}
                              onClick={() => setSelectedTx(tx)}
                              className="w-full bg-bg-secondary p-5 rounded-[1.5rem] flex items-center justify-between border border-border-color hover:border-[#00ff5f]/20 transition-all active:scale-[0.98] group"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-bg-secondary rounded-2xl flex items-center justify-center overflow-hidden border border-border-color p-1.5 shrink-0">
                                  {getMethodLogo(tx.method) ? (
                                    <img src={getMethodLogo(tx.method)!} alt={tx.method} className="w-full h-full object-contain" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[#00ff5f]/10 rounded-xl text-[#00ff5f]">
                                      <Wallet size={20} />
                                    </div>
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className="font-bold text-text-primary text-base">{tx.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'}</p>
                                  <p className="text-[11px] text-text-secondary/40 font-bold uppercase tracking-wider">{tx.currency} Account</p>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end">
                                <p className={cn("font-black text-base", tx.type === 'DEPOSIT' ? "text-[#00ff5f]" : "text-[#ff4757]")}>
                                  {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.currency === 'BDT' ? 'BDT' : currencySymbol} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <span className={cn("text-[11px] font-black uppercase tracking-widest mt-0.5 opacity-80", getStatusColor(tx.status))}>
                                  {getStatusLabel(tx.status)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FilterChip({ label }: { label: string }) {
  return (
    <button className="whitespace-nowrap px-4 py-2 bg-bg-secondary border border-border-color rounded-full text-text-secondary/60 font-bold text-xs flex items-center gap-2 hover:bg-bg-tertiary hover:text-text-primary transition group">
      {label}
      <ChevronRight size={14} className="opacity-40 group-hover:opacity-100 rotate-90" />
    </button>
  );
}

function DetailItem({ label, value, valueClass, copyable }: { label: string; value: string; valueClass?: string; copyable?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-text-secondary/40 font-medium text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn("text-white font-bold text-sm", valueClass)}>{value}</span>
        {copyable && (
          <button className="text-text-secondary/20 hover:text-text-primary">
            <Copy size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
