import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, MoreVertical, Check, RefreshCw, Trash2, Pencil } from 'lucide-react';
import { cn } from './utils';
import AddAccountSheet from './AddAccountSheet';

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
  onDeleteAccount
}: AccountsSheetProps) {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);
  
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
              className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-primary)] rounded-t-[20px] overflow-hidden border-t border-[var(--border-color)] pb-safe"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-[var(--text-secondary)]/30 rounded-full" />
              </div>

              <div className="px-4 pb-4 text-center relative">
                <h2 className="text-[#22c55e] font-bold text-sm uppercase tracking-wider">Islamic Account</h2>
              </div>


              <div className="px-4 pb-8 space-y-3">
                {accounts.map((account) => (
                  <div 
                    key={account.id}
                    onClick={() => {
                      onSelectAccount(account.id);
                      onClose();
                    }}
                    className={cn(
                      "bg-[var(--bg-secondary)] rounded-xl p-4 flex items-center justify-between border transition active:scale-[0.98]",
                      activeAccount === account.id ? "border-[#22c55e]" : "border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", activeAccount === account.id ? "border-[#22c55e]" : "border-[var(--text-secondary)]")}>
                        {activeAccount === account.id && <div className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />}
                      </div>
                      <div className="text-xl">{account.type === 'REAL' ? '✨' : '💰'}</div>
                      <div className="flex flex-col">
                        <span className="text-[var(--text-primary)] font-medium text-sm">
                          {account.id === 'REAL' ? 'Real account' : account.id === 'DEMO' ? 'Demo account' : account.name}
                        </span>
                        <span className="text-[var(--text-primary)] font-bold text-sm">
                          {account.symbol} {hideBalance ? '****' : account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    {account.id !== 'REAL' && account.id !== 'DEMO' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteAccount(account.id);
                        }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition active:scale-90"
                        title="Delete Account"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                    {account.id === 'DEMO' && onSetDemoBalance && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditAmount(account.balance.toString());
                          setIsEditingDemo(true);
                        }}
                        className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 rounded-lg transition active:scale-90"
                        title="Edit Demo Balance"
                      >
                        <Pencil size={18} />
                      </button>
                    )}
                  </div>
                ))}

                <button 
                  onClick={() => setIsAddAccountOpen(true)}
                  className="w-full bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-xl p-4 flex items-center justify-center gap-2 text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition active:scale-[0.98]"
                >
                  <Plus size={20} className="text-[#22c55e]" />
                  <span className="font-bold">Add Account</span>
                </button>
              </div>
              
              <div className="px-4 py-4 border-t border-[var(--border-color)]">
                <button 
                  onClick={() => setHideBalance(!hideBalance)}
                  className="w-full flex items-center justify-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition font-medium"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  {hideBalance ? 'Show balance' : 'Hide balance'}
                </button>
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
              className="relative w-full max-w-sm bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-2xl"
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Set Demo Balance</h3>
                  <button onClick={() => setIsEditingDemo(false)} className="text-[var(--text-secondary)] hover:text-white transition">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block uppercase tracking-wider">New Balance</label>
                    <div className="relative">
                      <span className="absolute left-3 shadow outline-none top-1/2 -translate-y-1/2 text-white/50 cursor-default">$</span>
                      <input 
                        type="number" 
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:border-blue-500 focus:outline-none transition"
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
