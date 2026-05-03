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
  Bitcoin,
  X
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
  platformSettings?: any;
}

const RECENT_TRANSACTIONS = [
  { id: 1, type: 'DEPOSIT', method: 'bKash', amount: 3600, date: 'Mar 1, 2026', status: 'SUCCESS' },
  { id: 2, type: 'WITHDRAW', method: 'Nagad', amount: 1200, date: 'Feb 28, 2026', status: 'PENDING' },
  { id: 3, type: 'DEPOSIT', method: 'BinancePay', amount: 12000, date: 'Feb 25, 2026', status: 'SUCCESS' },
];

export default function PaymentsSheet({ isOpen, onClose, balance, rawBalance, userId, activeAccount, currencySymbol, currencyCode, initialPromoCode, socket, userEmail, turnoverRequired, turnoverAchieved, initialView, platformSettings }: PaymentsSheetProps) {
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
        <div className="px-5 pb-10 space-y-3">
          <div className="flex items-center justify-between py-4 mb-2">
            <h2 className="text-white font-black text-2xl tracking-tight">Payments</h2>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white transition"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => setIsDepositOpen(true)}
              className="w-full bg-[#00ff5f] hover:bg-[#00e655] transition-all rounded-2xl py-4 px-6 flex items-center gap-4 text-black font-black text-lg shadow-[0_4px_20px_rgba(0,255,95,0.2)] active:scale-[0.98]"
            >
              <Wallet size={24} strokeWidth={2.5} />
              <span className="flex-1 text-center pr-8">Deposit</span>
            </button>
            
            <button 
              onClick={() => setIsWithdrawOpen(true)}
              className="w-full bg-[#2d2d2d] hover:bg-[#353535] transition-all rounded-2xl py-4 px-6 flex items-center gap-4 text-white font-bold text-lg active:scale-[0.98]"
            >
              <div className="text-white/70">
                <ArrowDown size={24} strokeWidth={2.5} />
              </div>
              <span className="flex-1 text-center pr-8">Withdraw</span>
            </button>

             <button 
              onClick={() => setIsTransferOpen(true)}
              className="w-full bg-[#2d2d2d] hover:bg-[#353535] transition-all rounded-2xl py-4 px-6 flex items-center gap-4 text-white font-bold text-lg active:scale-[0.98]"
            >
              <div className="text-white/70">
                <ArrowLeftRight size={24} strokeWidth={2.5} />
              </div>
              <span className="flex-1 text-center pr-8">Transfer</span>
            </button>
 
             <button 
              onClick={() => setIsHistoryOpen(true)}
              className="w-full bg-[#2d2d2d] hover:bg-[#353535] transition-all rounded-2xl py-4 px-6 flex items-center gap-4 text-white font-bold text-lg active:scale-[0.98]"
            >
              <div className="text-white/70">
                <History size={24} strokeWidth={2.5} />
              </div>
              <span className="flex-1 text-center pr-8">Transactions</span>
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
            onDepositClick={() => setIsDepositOpen(true)}
            currencySymbol={currencySymbol}
            currencyCode={currencyCode}
            socket={socket}
            userEmail={userEmail}
            balance={balance}
            activeAccount={activeAccount}
            turnoverRequired={turnoverRequired}
            turnoverAchieved={turnoverAchieved}
            platformSettings={platformSettings}
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
