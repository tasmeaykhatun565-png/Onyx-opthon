import React, { useState } from 'react';
import BottomSheet from './BottomSheet';
import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  runTransaction, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

interface TransferFlowProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  currencyCode: string;
  userId: string;
  balance: number;
  onTransferSuccess?: () => void;
}

export default function TransferFlow({ 
  isOpen, 
  onClose, 
  currencySymbol, 
  currencyCode, 
  userId, 
  balance,
  onTransferSuccess 
}: TransferFlowProps) {
  const [amount, setAmount] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const EXCHANGE_RATE = 120; // 1 USD = 120 BDT (approx)
  const MAX_TRANSFER_USD = 1;
  const MIN_TRANSFER_BDT = 20;

  const handleTransfer = async () => {
    if (!userId || !recipientEmail || !amount) return;
    
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      setError('Invalid amount');
      return;
    }

    // Convert limits to current currency
    let maxLimit = MAX_TRANSFER_USD;
    let minLimit = 0.1; // Default min 0.1 USD

    if (currencyCode === 'BDT') {
      maxLimit = MAX_TRANSFER_USD * EXCHANGE_RATE;
      minLimit = MIN_TRANSFER_BDT;
    }

    if (transferAmount > maxLimit) {
      setError(`Maximum transfer is ${currencySymbol}${maxLimit.toFixed(2)} ($1)`);
      return;
    }

    if (transferAmount < minLimit) {
      setError(`Minimum transfer is ${currencySymbol}${minLimit.toFixed(2)}`);
      return;
    }

    if (transferAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Find recipient by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', recipientEmail.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Recipient not found');
        setLoading(false);
        return;
      }

      const recipientDoc = querySnapshot.docs[0];
      const recipientId = recipientDoc.id;
      const recipientData = recipientDoc.data();

      if (recipientId === userId) {
        setError('You cannot transfer to yourself');
        setLoading(false);
        return;
      }

      // 2. Run transaction for transfer
      const senderRef = doc(db, 'users', userId);
      const receiverRef = doc(db, 'users', recipientId);

      await runTransaction(db, async (transaction) => {
        const sDoc = await transaction.get(senderRef);
        if (!sDoc.exists()) throw new Error('Sender not found');
        
        const sData = sDoc.data();
        
        // Constraints Check
        const lastTransfer = sData.lastTransferAt || 0;
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        if (Date.now() - lastTransfer < threeDaysMs) {
          const nextAvailable = new Date(lastTransfer + threeDaysMs);
          throw new Error(`You can only transfer once every 3 days. Next available: ${nextAvailable.toLocaleDateString()}`);
        }

        const receivedTotal = sData.receivedTransferTotal || 0;
        const transferableBalance = sData.balance - receivedTotal;

        if (transferableBalance < transferAmount) {
          throw new Error(`Insufficient transferable balance. You have ${currencySymbol}${transferableBalance.toFixed(2)} transferable (Total: ${currencySymbol}${sData.balance.toFixed(2)}, Received: ${currencySymbol}${receivedTotal.toFixed(2)}). Received funds cannot be re-transferred.`);
        }

        const sentToUids = sData.sentToUids || [];
        if (sentToUids.includes(recipientId)) {
          throw new Error('You have already sent a transfer to this account. Only one transfer per recipient is allowed.');
        }

        // Perform updates
        transaction.update(senderRef, {
          balance: sData.balance - transferAmount,
          lastTransferAt: Date.now(),
          sentToUids: [...sentToUids, recipientId]
        });

        transaction.update(receiverRef, {
          balance: (recipientData.balance || 0) + transferAmount,
          receivedTransferTotal: (recipientData.receivedTransferTotal || 0) + transferAmount
        });

        // Log transaction
        const txRef = doc(collection(db, 'transactions'));
        transaction.set(txRef, {
          userId,
          recipientId,
          amount: transferAmount,
          type: 'INTERNAL_TRANSFER',
          status: 'SUCCESS',
          timestamp: serverTimestamp(),
          currency: currencyCode
        });
      });

      setSuccess(true);
      if (onTransferSuccess) onTransferSuccess();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setAmount('');
        setRecipientEmail('');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} className="bg-[var(--bg-primary)]">
      <div className="p-4 space-y-6 pb-10">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Internal Transfer</h2>
          <p className="text-xs text-[var(--text-secondary)]">Transfer funds to another Onyx account</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center text-green-500">
              <CheckCircle2 size={48} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-green-500">Transfer Successful</h3>
              <p className="text-sm text-[var(--text-secondary)]">Funds have been sent to {recipientEmail}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 text-rose-500 text-sm">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider ml-1">Recipient Email</label>
              <input 
                type="email" 
                value={recipientEmail} 
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] p-4 rounded-2xl text-[var(--text-primary)] border border-[var(--border-color)] focus:border-blue-500 transition-all outline-none"
                placeholder="Enter recipient's email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Amount</label>
                <span className="text-[10px] text-[var(--text-secondary)]">Balance: {currencySymbol}{balance.toFixed(2)}</span>
              </div>
              <div className="relative">
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[var(--bg-secondary)] p-4 rounded-2xl text-[var(--text-primary)] font-bold text-xl border border-[var(--border-color)] focus:border-blue-500 transition-all outline-none pl-10"
                  placeholder="0.00"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] font-bold text-lg">{currencySymbol}</span>
              </div>
              <div className="flex justify-between px-1">
                <p className="text-[10px] text-[var(--text-secondary)] italic">Max: $1.00 equivalent</p>
                <p className="text-[10px] text-[var(--text-secondary)] italic">Min: {currencyCode === 'BDT' ? '20.00 BDT' : '0.10 USD'}</p>
              </div>
            </div>

            <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest">Transfer Rules</h4>
              <ul className="text-[10px] text-[var(--text-secondary)] space-y-1 list-disc pl-4">
                <li>Once every 3 days only.</li>
                <li>Maximum $1.00 per transfer.</li>
                <li>One-time transfer per recipient.</li>
                <li>If you received a transfer, you cannot send one.</li>
              </ul>
            </div>

            <button 
              onClick={handleTransfer}
              disabled={loading || !amount || !recipientEmail}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Send Transfer</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
