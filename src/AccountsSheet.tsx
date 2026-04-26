import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, MoreVertical, Check, RefreshCw, Trash2 } from 'lucide-react';
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
  accounts,
  onAddAccount,
  onDeleteAccount
}: AccountsSheetProps) {
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [hideBalance, setHideBalance] = useState(false);

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
    </>
  );
}
