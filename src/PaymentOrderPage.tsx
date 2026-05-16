import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Clock, Copy, Check, AlertCircle, 
  Smartphone, CreditCard, Banknote, ShieldCheck, 
  Upload, Image as ImageIcon, Loader2, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from './i18n';
import { cn } from './utils';
import { useToast } from './Toast';

export default function PaymentOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [timeLeft, setTimeLeft] = useState(3600);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/payment-orders/${id}`);
        if (!response.ok) throw new Error('Order not found');
        const data = await response.json();
        setOrder(data);
        
        // Calculate remaining time
        const duration = 3600 * 1000; // 1 hour
        const elapsed = Date.now() - data.timestamp;
        const remaining = Math.max(0, Math.floor((duration - elapsed) / 1000));
        setTimeLeft(remaining);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchOrder();
  }, [id]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    showToast('Copied to clipboard', 'success');
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('Image too large (max 2MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (prev) => {
        setScreenshot(prev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!transactionId.trim()) {
      showToast('Please enter Transaction ID', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/payment-orders/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, screenshot })
      });
      
      if (!response.ok) throw new Error('Submission failed');
      
      setSubmitted(true);
      showToast('Payment submitted successfully', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Order Not Found</h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          This payment link may have expired or is invalid. Please contact the person who shared it with you.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Payment Submitted</h1>
        <p className="text-gray-400 mb-8 max-w-sm">
          Thank you! Your payment has been submitted for verification. The balance will be updated automatically once confirmed.
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold"
        >
          Go to Trading
        </button>
      </div>
    );
  }

  const isBdt = order.currency === 'BDT';
  const displayAmount = isBdt ? `৳${order.amount.toLocaleString()}` : `$${order.amount.toLocaleString()}`;

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white font-sans flex flex-col">
      {/* Top Header */}
      <div className="bg-[#161a1e] p-6 flex items-center justify-between border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Smartphone className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">Secure Payment</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Order #{id}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
           <div className="flex items-center gap-1.5 text-[#f3ba2f] font-mono text-xl font-bold">
              <Clock size={16} />
              {formatTime(timeLeft)}
           </div>
           <p className="text-[9px] text-gray-500 font-bold uppercase">Expires Soon</p>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-6 space-y-6">
        {/* Amount Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-2">Payment Amount</p>
          <h2 className="text-5xl font-black text-white tracking-tight">{displayAmount}</h2>
          <div className="mt-4 inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium border border-white/10">
            <ShieldCheck size={14} className="text-green-400" />
            Verified Secure Transaction
          </div>
        </div>

        {/* Payment Method Details */}
        <div className="bg-[#161a1e] rounded-3xl p-6 border border-white/5 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  {order.methodId.includes('bkash') ? (
                    <img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/bkash.png" className="w-8 h-8 object-contain" />
                  ) : order.methodId.includes('nagad') ? (
                    <img src="https://raw.githubusercontent.com/t-asif/trading-assets/main/nagad.png" className="w-8 h-8 object-contain" />
                  ) : (
                    <CreditCard className="text-blue-500" />
                  )}
               </div>
               <div>
                  <h3 className="font-bold text-lg">{order.methodName}</h3>
                  <p className="text-xs text-gray-500">Official Merchant Account</p>
               </div>
            </div>
            <div className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-black uppercase">Active</div>
          </div>

          <div className="space-y-4">
             <div className="p-5 bg-black/30 rounded-2xl border border-white/5 relative group">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">Payment Number</p>
                <div className="flex items-center justify-between">
                   <span className="text-xl font-mono font-bold tracking-wider">{order.details?.paymentNumber || '01712-345678'}</span>
                   <button 
                    onClick={() => copyToClipboard(order.details?.paymentNumber || '01712-345678')}
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition active:scale-90"
                   >
                     {isCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-400" />}
                   </button>
                </div>
             </div>

             <div className="flex items-start gap-3 p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-yellow-500/80 leading-relaxed font-medium">
                  Please send exactly <span className="font-bold underline">{displayAmount}</span> BDT to the number above using <span className="font-bold">Cash Out</span>.
                </p>
             </div>
          </div>
        </div>

        {/* Submission Form */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Confirmation Details</h4>
          
          <div className="bg-[#161a1e] rounded-3xl p-6 border border-white/5 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 ml-1">Transaction ID / Hash</label>
              <div className="relative">
                <input 
                  type="text"
                  placeholder="ex. BBSDA3GH23"
                  className="w-full h-14 bg-black/30 border border-white/10 rounded-2xl px-5 text-lg font-mono focus:border-blue-500/50 transition outline-none"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 ml-1">Payment Screenshot (Optional)</label>
              <div 
                onClick={() => document.getElementById('screenshot-upload')?.click()}
                className="w-full h-32 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition group"
              >
                {screenshot ? (
                   <img src={screenshot} className="h-full w-full object-cover rounded-2xl" />
                ) : (
                  <>
                    <Upload className="text-gray-600 group-hover:text-blue-500 transition" size={24} />
                    <span className="text-xs text-gray-500 font-medium">Click to upload photo</span>
                  </>
                )}
                <input 
                  id="screenshot-upload"
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleScreenshotUpload}
                />
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || timeLeft <= 0}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-blue-600/10",
                timeLeft <= 0 ? "bg-gray-700 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500"
              )}
            >
              {isSubmitting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  Confirm Payment
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center pb-10 space-y-4">
           <div className="flex items-center justify-center gap-4 grayscale opacity-30">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/b2/PCI_DSS_logo.svg" className="h-6" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" />
           </div>
           <p className="text-[10px] text-gray-600 font-medium leading-relaxed">
             This transaction is protected by 256-bit SSL encryption. <br/>
             Merchant: AOLLIKUS LIMITED • ID: {id}
           </p>
        </div>
      </div>
    </div>
  );
}
