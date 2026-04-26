import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeftRight, 
  History, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Smartphone,
  Bitcoin
} from 'lucide-react';
import BottomSheet from './BottomSheet';
import DepositFlow from './DepositFlow';
import WithdrawFlow from './WithdrawFlow';
import TransferFlow from './TransferFlow';
import TransactionHistory from './TransactionHistory';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from './utils';

interface PaymentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  rawBalance?: number;
  userId?: string;
  activeAccount: string;
  currencySymbol: string;
  currencyCode: string;
  initialPromoCode?: string | null;
  socket?: any;
  userEmail?: string;
  turnoverRequired?: number;
  turnoverAchieved?: number;
  initialView?: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'HISTORY' | null;
}

const RECENT_TRANSACTIONS = [
  { id: 1, type: 'DEPOSIT', method: 'bKash', amount: 3600, date: 'Mar 1, 2026', status: 'SUCCESS' },
  { id: 2, type: 'WITHDRAW', method: 'Nagad', amount: 1200, date: 'Feb 28, 2026', status: 'PENDING' },
  { id: 3, type: 'DEPOSIT', method: 'BinancePay', amount: 12000, date: 'Feb 25, 2026', status: 'SUCCESS' },
];

export default function PaymentsSheet({ isOpen, onClose, balance, rawBalance, userId, activeAccount, currencySymbol, currencyCode, initialPromoCode, socket, userEmail, turnoverRequired, turnoverAchieved, initialView }: PaymentsSheetProps) {
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasOpenedPromo, setHasOpenedPromo] = useState(false);

  useEffect(() => {
    if (initialView) {
      if (initialView === 'DEPOSIT') setIsDepositOpen(true);
      if (initialView === 'WITHDRAW') setIsWithdrawOpen(true);
      if (initialView === 'TRANSFER') setIsTransferOpen(true);
      if (initialView === 'HISTORY') setIsHistoryOpen(true);
    }
  }, [initialView]);

  useEffect(() => {
    if (initialPromoCode && !isDepositOpen && !hasOpenedPromo) {
      setIsDepositOpen(true);
      setHasOpenedPromo(true);
    }
  }, [initialPromoCode, isDepositOpen, hasOpenedPromo]);

  return (
    <>
      <BottomSheet 
        isOpen={isOpen} 
        onClose={onClose}
        ignoreClickOutside={isDepositOpen || isWithdrawOpen || isTransferOpen || isHistoryOpen}
      >
        <div className="px-4 pb-8 space-y-6">
          <div className="flex items-center justify-center py-2 border-b border-[var(--border-color)] -mx-4 mb-4">
            <h2 className="text-[var(--text-primary)] font-bold text-lg pb-2">Payments</h2>
          </div>
          
          <div className="space-y-1">
            <button 
              onClick={() => setIsDepositOpen(true)}
              className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-all rounded-xl py-3 px-4 flex items-center gap-4 text-[var(--text-primary)] font-medium text-base border border-transparent hover:border-[#333]"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-[#22c55e]/10 rounded-lg text-[#22c55e]">
                <Wallet size={18} />
              </div>
              <span className="flex-1 text-left">Deposit</span>
              <ChevronRight size={18} className="text-[#666]" />
            </button>
            
            <button 
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-all rounded-xl py-3 px-4 flex items-center gap-4 text-[var(--text-primary)] font-medium text-base border border-transparent hover:border-[#333]"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-[#f59e0b]/10 rounded-lg text-[#f59e0b]">
                <ArrowDown size={18} />
              </div>
              <span className="flex-1 text-left">Withdraw</span>
              <ChevronRight size={18} className="text-[#666]" />
            </button>

            <button 
              onClick={() => setIsTransferOpen(true)}
              className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-all rounded-xl py-3 px-4 flex items-center gap-4 text-[var(--text-primary)] font-medium text-base border border-transparent hover:border-[#333]"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-[#3b82f6]/10 rounded-lg text-[#3b82f6]">
                <ArrowLeftRight size={18} />
              </div>
              <span className="flex-1 text-left">Transfer</span>
              <ChevronRight size={18} className="text-[#666]" />
            </button>

            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="w-full bg-[#1e1e1e] hover:bg-[#2a2a2a] transition-all rounded-xl py-3 px-4 flex items-center gap-4 text-[var(--text-primary)] font-medium text-base border border-transparent hover:border-[#333]"
            >
              <div className="w-8 h-8 flex items-center justify-center bg-[#94a3b8]/10 rounded-lg text-[#94a3b8]">
                <History size={18} />
              </div>
              <span className="flex-1 text-left">Transactions</span>
              <ChevronRight size={18} className="text-[#666]" />
            </button>
          </div>
        </div>
      </BottomSheet>

      <AnimatePresence>
        {isDepositOpen && (
          <DepositFlow 
            isOpen={isDepositOpen} 
            onClose={() => setIsDepositOpen(false)} 
            currencySymbol={currencySymbol}
            currencyCode={currencyCode}
            initialPromoCode={initialPromoCode}
            socket={socket}
            userEmail={userEmail}
            rawBalance={rawBalance}
            userId={userId}
          />
        )}
        {isWithdrawOpen && (
          <WithdrawFlow 
            isOpen={isWithdrawOpen} 
            onClose={() => setIsWithdrawOpen(false)} 
            currencySymbol={currencySymbol}
            currencyCode={currencyCode}
            socket={socket}
            userEmail={userEmail}
            balance={balance}
            activeAccount={activeAccount}
            turnoverRequired={turnoverRequired}
            turnoverAchieved={turnoverAchieved}
          />
        )}
        {isTransferOpen && (
          <TransferFlow 
            isOpen={isTransferOpen} 
            onClose={() => setIsTransferOpen(false)} 
            currencySymbol={currencySymbol}
            currencyCode={currencyCode}
            userId={userId || ''}
            balance={rawBalance || 0}
          />
        )}
        {isHistoryOpen && (
          <TransactionHistory 
            isOpen={isHistoryOpen} 
            onClose={() => setIsHistoryOpen(false)} 
            currencySymbol={currencySymbol}
            socket={socket}
            userEmail={userEmail}
          />
        )}
      </AnimatePresence>
    </>
  );
}
