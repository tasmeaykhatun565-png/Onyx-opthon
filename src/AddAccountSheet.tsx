import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, Check, Search } from 'lucide-react';
import { cn } from './utils';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}

interface AddAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (currency: Currency, name: string) => void;
}

const CURRENCIES: Currency[] = [
  { code: 'BDT', name: 'Bangladeshi taka', symbol: '৳', flag: '🇧🇩' },
  { code: 'USD', name: 'US dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
];

export default function AddAccountSheet({ isOpen, onClose, onAddAccount }: AddAccountSheetProps) {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [accountName, setAccountName] = useState(`${CURRENCIES[0].code} Account`);

  const handleNext = () => {
    setAccountName(`${selectedCurrency.code} Account`);
    setStep(2);
  };

  const handleCreate = () => {
    onAddAccount(selectedCurrency, accountName);
    onClose();
    setStep(1);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-[var(--bg-primary)] rounded-t-[20px] h-[90vh] flex flex-col"
          >
            <div className="flex items-center p-4 border-b border-[var(--border-color)]">
              <button onClick={step === 2 ? () => setStep(1) : onClose} className="p-2">
                <ChevronLeft size={24} className="text-[var(--text-primary)]" />
              </button>
              <h2 className="text-[var(--text-primary)] font-bold text-lg flex-1 text-center mr-10">
                {step === 1 ? 'Add Account' : 'Account name'}
              </h2>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {step === 1 ? (
                <>
                  <p className="text-[var(--text-secondary)] mb-4">Select the currency for the trading account from the available list.</p>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                      type="text"
                      placeholder="Search currency..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-[#22c55e] transition"
                    />
                  </div>

                  <div className="space-y-2">
                    {CURRENCIES.filter(c => 
                      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      c.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((currency) => (
                      <div
                        key={currency.code}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setAccountName(`${currency.code} Account`);
                          setStep(2);
                        }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition cursor-pointer",
                          selectedCurrency.code === currency.code 
                            ? "border-[#22c55e] bg-[#22c55e]/10" 
                            : "border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{currency.flag}</span>
                          <div>
                            <div className="text-[var(--text-primary)] font-bold">{currency.code} — {currency.name}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[var(--text-secondary)] font-bold">{currency.code}</span>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                            selectedCurrency.code === currency.code ? "border-[#22c55e] bg-[#22c55e]" : "border-[var(--text-secondary)]"
                          )}>
                            {selectedCurrency.code === currency.code && <Check size={12} className="text-black" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]">
                    <span className="text-4xl">{selectedCurrency.flag}</span>
                    <div>
                      <div className="text-[var(--text-primary)] font-bold text-lg">{selectedCurrency.code}</div>
                      <div className="text-[var(--text-secondary)] text-sm">{selectedCurrency.name}</div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[var(--text-secondary)] mb-4">Give your new account a custom name to easily identify it.</p>
                    <div className="bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-color)] focus-within:border-[#22c55e] transition">
                      <label className="text-[var(--text-secondary)] text-xs mb-1 block uppercase tracking-wider font-bold">Account name</label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Enter account name..."
                        className="w-full bg-transparent text-[var(--text-primary)] font-bold text-xl focus:outline-none"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[var(--border-color)]">
              {step === 2 && (
                <button
                  onClick={handleCreate}
                  className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold py-4 rounded-xl transition active:scale-[0.98] shadow-[0_4px_12px_rgba(34,197,94,0.2)]"
                >
                  Create Account
                </button>
              )}
              {step === 1 && (
                <div className="text-center text-[var(--text-secondary)] text-sm py-2">
                  Select a currency to continue
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
