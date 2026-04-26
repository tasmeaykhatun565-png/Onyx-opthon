import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils';
import { X, Loader2, AlertCircle, ChevronLeft } from 'lucide-react';

interface Transaction {
  id: number | string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  currency: string;
  method: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'SUCCESS';
  submittedAt: number;
  bonusAmount?: number;
}

interface TransactionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  socket?: any;
  userEmail?: string;
}

export default function TransactionHistory({ isOpen, onClose, currencySymbol, socket, userEmail }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket || !isOpen || !userEmail) return;

    const handleUserTransactions = (data: { deposits: any[], withdrawals: any[] }) => {
      const userDeposits = data.deposits.map(d => ({ ...d, type: 'DEPOSIT' }));
      const userWithdrawals = data.withdrawals.map(w => ({ ...w, type: 'WITHDRAW' }));
      setTransactions([...userDeposits, ...userWithdrawals].sort((a, b) => b.submittedAt - a.submittedAt));
      setIsLoading(false);
    };

    socket.on('user-transactions', handleUserTransactions);
    socket.on('transaction-updated', () => {
      socket.emit('get-user-transactions', userEmail);
    });

    // Request initial data
    socket.emit('get-user-transactions', userEmail);

    return () => {
      socket.off('user-transactions', handleUserTransactions);
      socket.off('transaction-updated');
    };
  }, [socket, isOpen, userEmail]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col md:p-6"
        >
          <div className="w-full h-full md:max-w-xl md:mx-auto md:h-auto md:max-h-[90vh] md:rounded-[32px] md:border md:border-[var(--border-color)] md:shadow-2xl flex flex-col bg-[var(--bg-primary)] overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)]">
              <button 
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-[var(--text-primary)] flex-1">Transaction History</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-green-500" size={32} />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <AlertCircle className="mx-auto text-[var(--text-secondary)] opacity-20" size={48} />
                  <p className="text-[var(--text-secondary)]">No transactions found.</p>
                </div>
              ) : (
                <div className="space-y-3 pb-10">
                  {transactions.map(tx => (
                    <div key={`${tx.type}-${tx.id}`} className="bg-[var(--bg-secondary)] p-4 rounded-xl flex justify-between items-center border border-[var(--border-color)] shadow-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[var(--text-primary)]">{tx.type}</p>
                          <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded uppercase font-bold">{tx.method}</span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                          {new Date(tx.submittedAt).toLocaleDateString()} {new Date(tx.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1">
                        <p className={cn("font-bold text-sm", tx.type === 'DEPOSIT' ? "text-[#22c55e]" : "text-[#ff4757]")}>
                          {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.currency === 'BDT' ? '৳' : currencySymbol}{tx.amount.toLocaleString()}
                        </p>
                        {tx.type === 'DEPOSIT' && tx.bonusAmount && tx.bonusAmount > 0 && (
                          <p className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Bonus: +{tx.currency === 'BDT' ? '৳' : currencySymbol}{tx.bonusAmount.toLocaleString()}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                            tx.status === 'APPROVED' || tx.status === 'SUCCESS' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                            tx.status === 'PENDING' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                            "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                          )}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
