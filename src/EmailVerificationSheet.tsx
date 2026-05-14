import React, { useState, useEffect } from 'react';
import { Mail, ChevronLeft, CheckCircle2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { auth } from './firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

interface EmailVerificationSheetProps {
  email: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailVerificationSheet({ email, isOpen, onClose, onSuccess }: EmailVerificationSheetProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Periodic check if verified
  useEffect(() => {
    if (isOpen && !isVerified) {
      const interval = setInterval(async () => {
        if (auth.currentUser) {
          await reload(auth.currentUser);
          if (auth.currentUser.emailVerified) {
            setIsVerified(true);
            onSuccess();
          }
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, isVerified, onSuccess]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError('');
    try {
      await sendEmailVerification(auth.currentUser);
      setTimer(60);
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError('Could not send email. Please wait a moment.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheck = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    setError('');
    try {
      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        setIsVerified(true);
        onSuccess();
      } else {
        setError('Email not verified yet. Please check your inbox.');
      }
    } catch (err: any) {
      setError('Connection issue. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="w-full max-w-[400px] bg-[#151515] border border-border-color rounded-3xl p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-20 h-20 bg-[#22c55e]/10 rounded-full flex items-center justify-center mb-2">
                <Mail className="text-[#22c55e]" size={40} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Verify Your Email</h2>
                <p className="text-sm text-text-secondary/50 leading-relaxed max-w-[280px] mx-auto">
                  We've sent a professional verification link to <span className="text-white font-medium">{email}</span>. Please click the link in your email to continue.
                </p>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={handleManualCheck}
                  disabled={checking || isVerified}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
                >
                  {checking ? (
                    <RefreshCw className="animate-spin" size={20} />
                  ) : isVerified ? (
                    <CheckCircle2 className="text-green-600" size={20} />
                  ) : (
                    'I Have Verified My Email'
                  )}
                </button>

                <div className="flex flex-col items-center gap-4">
                  <button 
                    onClick={handleResend}
                    disabled={timer > 0 || loading}
                    className="text-sm text-text-secondary/40 hover:text-white transition disabled:opacity-50 font-medium"
                  >
                    {timer > 0 ? `Resend link in 00:${timer.toString().padStart(2, '0')}` : 'Resend verification link'}
                  </button>
                  
                  <button 
                    onClick={onClose}
                    className="text-xs text-text-secondary/20 hover:text-text-secondary/40 transition"
                  >
                    Use another email
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-3 px-4 rounded-xl flex items-center gap-2 w-full"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

