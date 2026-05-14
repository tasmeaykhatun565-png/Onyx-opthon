import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, MoreVertical, Check, RefreshCw, Trash2, Pencil, DollarSign, Wallet, ArrowLeftRight, History, Archive, ChevronRight } from 'lucide-react';
import { cn } from './utils';
import AddAccountSheet from './AddAccountSheet';

const getAccountNumber = (id: string) => {
  // Demo account always has the same number
  if (id === 'DEMO') return '#1023420844';
  
  // Generate a deterministic 10-digit number from the ID
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const absHash = Math.abs(hash).toString();
  return '#' + (absHash.length >= 10 ? absHash.slice(0, 10) : absHash.padEnd(10, '0'));
};

interface Account {
  id: string;
  name: string;
  currency: string;
  symbol: string;
  balance: number;
  type: 'DEMO' | 'REAL';
  flag: string;
}

interface AccountsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: string;
  onSelectAccount: (id: string) => void;
  onRefill: () => void;
  onSetDemoBalance?: (amount: number) => void;
  accounts: Account[];
  onAddAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onDeposit?: () => void;
  onWithdraw?: () => void;
  onTransfer?: () => void;
  onHistory?: () => void;
}

export default function AccountsSheet({ 
  isOpen, 
  onClose, 
  activeAccount,
  onSelectAccount,
  onRefill,
  onSetDemoBalance,
  accounts,
  onAddAccount,
  onDeleteAccount,
  onDeposit,
  onWithdraw,
  onTransfer,
  onHistory
}: AccountsSheetProps) {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const [isEditingDemo, setIsEditingDemo] = useState(false);
  const [editAmount, setEditAmount] = useState('10000');

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 1 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[400px] z-[101] bg-bg-secondary flex flex-col text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-10 pb-6">
                <h2 className="text-[32px] font-bold tracking-tight">Accounts</h2>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition p-2"
                >
                  <X size={32} strokeWidth={2} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-20 custom-scrollbar">
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div 
                      key={account.id}
                      onClick={() => {
                        onSelectAccount(account.id);
                        onClose();
                      }}
                      className={cn(
                        "rounded-2xl p-5 flex items-center justify-between transition-all cursor-pointer group active:scale-[0.98]",
                        activeAccount === account.id ? "bg-[#1c1d22] border border-border-color" : "hover:bg-white/[0.03]"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon based on account type */}
                        <div className="relative">
                          {account.id === 'DEMO' ? (
                            <div className="w-10 h-10 rounded-xl bg-[#f59e0b] flex items-center justify-center border-2 border-white/20 shadow-lg">
                              <span className="text-white font-black text-lg">Đ</span>
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#1c1d22] border border-border-color flex items-center justify-center shadow-lg relative overflow-hidden">
                               {/* BDT flag-like icon */}
                               <div className="w-6 h-[18px] bg-[#006a4e] rounded-sm flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[#f42a41]" />
                               </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col">
                          <span className="text-gray-400 font-bold text-sm leading-tight mb-1">
                            {account.id === 'DEMO' ? 'Demo account' : account.name}
                          </span>
                          <span className="text-white font-bold text-[18px] tracking-tight">
                            {account.symbol}{account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 relative">
                         {account.id !== 'DEMO' && account.id !== 'REAL' && (
                           <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(activeMenu === account.id ? null : account.id);
                                }}
                                className={cn(
                                  "p-2 rounded-xl transition flex items-center justify-center",
                                  activeMenu === account.id ? "bg-[#3dbd6d] text-white" : "text-gray-500 hover:text-gray-300"
                                )}
                              >
                                <MoreVertical size={24} strokeWidth={2.5} />
                              </button>

                              {/* Dropdown Menu */}
                              <AnimatePresence>
                                {activeMenu === account.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-[110]" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenu(null);
                                      }}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: -10, x: -10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: -10, x: -10 }}
                                      className="absolute right-0 top-full mt-2 w-[280px] bg-[#1c1d22] border border-border-color rounded-[20px] shadow-[0_15px_50px_rgba(0,0,0,0.8)] z-[120] overflow-hidden backdrop-blur-xl"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {/* Account Number Header */}
                                      <div className="px-5 py-4 border-b border-border-color">
                                        <span className="text-gray-500 text-sm font-medium">
                                          Account {getAccountNumber(account.id)}
                                        </span>
                                      </div>

                                      {/* Menu Items */}
                                      <div className="py-2">
                                        <button 
                                          onClick={() => {
                                            onDeposit?.();
                                            onClose();
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.05] transition text-left"
                                        >
                                          <DollarSign size={22} className="text-gray-400" />
                                          <span className="text-[17px] font-medium text-text-primary/90">Deposit</span>
                                        </button>
                                        <button 
                                          onClick={() => {
                                            onWithdraw?.();
                                            onClose();
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.05] transition text-left"
                                        >
                                          <Wallet size={22} className="text-gray-400" />
                                          <span className="text-[17px] font-medium text-text-primary/90">Withdraw</span>
                                        </button>
                                        <button 
                                          onClick={() => {
                                            onTransfer?.();
                                            onClose();
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.05] transition text-left"
                                        >
                                          <ArrowLeftRight size={22} className="text-gray-400" />
                                          <span className="text-[17px] font-medium text-text-primary/90">Transfer</span>
                                        </button>
                                        <button 
                                          onClick={() => {
                                            onHistory?.();
                                            onClose();
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.05] transition text-left"
                                        >
                                          <History size={22} className="text-gray-400" />
                                          <span className="text-[17px] font-medium text-text-primary/90">Transactions</span>
                                        </button>
                                        <button className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.05] transition text-left">
                                          <Pencil size={22} className="text-gray-400" />
                                          <span className="text-[17px] font-medium text-text-primary/90">Rename</span>
                                        </button>
                                        <button 
                                          onClick={() => {
                                            if (confirm('Are you sure you want to archive this account?')) {
                                              onDeleteAccount(account.id);
                                              setActiveMenu(null);
                                            }
                                          }}
                                          className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.05] transition text-left"
                                        >
                                          <Archive size={22} className="text-gray-400" />
                                          <span className="text-[17px] font-medium text-text-primary/90">Archive</span>
                                        </button>
                                      </div>
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                           </div>
                         )}
                         {account.id === 'DEMO' && (
                            <MoreVertical size={24} className="text-gray-600 group-hover:text-gray-400 transition" />
                         )}
                      </div>
                    </div>
                  ))}

                  {/* Add Account Button */}
                  <button 
                    onClick={() => setIsAddAccountOpen(true)}
                    className="w-full mt-2 group flex items-center gap-4 px-6 py-5 rounded-2xl transition hover:bg-white/[0.03] active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 flex items-center justify-center text-gray-400 group-hover:text-white transition">
                      <Plus size={32} strokeWidth={2} />
                    </div>
                    <span className="text-[17px] font-bold text-white transition">Add Account</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AddAccountSheet 
        isOpen={isAddAccountOpen} 
        onClose={() => setIsAddAccountOpen(false)} 
        onAddAccount={(currency, name) => {
          onAddAccount({
            id: Math.random().toString(36).substr(2, 9),
            name,
            currency: currency.code,
            symbol: currency.symbol,
            balance: 0,
            type: 'REAL',
            flag: currency.flag
          });
        }}
      />
      <AnimatePresence>
        {isEditingDemo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              className="relative w-full max-w-sm bg-bg-primary rounded-2xl border border-border-color overflow-hidden shadow-2xl"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Set Demo Balance</h3>
                  <button onClick={() => setIsEditingDemo(false)} className="text-text-secondary hover:text-white transition">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-text-secondary mb-1 block uppercase tracking-wider">New Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 shadow outline-none top-1/2 -translate-y-1/2 text-text-secondary/50 cursor-default">$</span>
                      <input 
                        type="number" 
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-bg-secondary border border-border-color rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:border-blue-500 focus:outline-none transition"
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
    </>
  );
}
