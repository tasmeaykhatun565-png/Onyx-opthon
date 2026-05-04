import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  FacebookAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock, User, LogIn, UserPlus, Chrome, AlertCircle, 
  Globe, DollarSign, ArrowRight, CheckCircle2, ShieldCheck, 
  TrendingUp, BarChart3, Zap, ChevronLeft, Eye, EyeOff,
  LockKeyhole, Globe2, Shield, CreditCard, Activity
} from 'lucide-react';
import { cn } from './utils';

const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD', symbol: '$' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£' },
  { code: 'EU', name: 'European Union', currency: 'EUR', symbol: '€' },
  { code: 'IN', name: 'India', currency: 'INR', symbol: '₹' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: 'BDT ' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', symbol: '₦' },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: '₨' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', symbol: 'Rp' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', symbol: 'R$' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', symbol: 'R' },
];

interface AuthProps {
  onSuccess: () => void;
}

type AuthView = 'login' | 'signup' | 'forgot-password';

export default function Auth({ onSuccess }: AuthProps) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [country, setCountry] = useState(COUNTRIES[0].code);

  useEffect(() => {
    // Check for referral code in URL parameters
    const params = new URLSearchParams(window.location.search);
    const refCodeFromUrl = params.get('ref');
    
    // Check for referral code in localStorage
    const savedRefCode = localStorage.getItem('onyx_referral_code');
    
    const referralToUse = refCodeFromUrl || savedRefCode;
    
    if (referralToUse) {
      setReferralCode(referralToUse);
      if (refCodeFromUrl) localStorage.setItem('onyx_referral_code', refCodeFromUrl);
      if (view === 'login') setView('signup'); // Auto-switch to signup if ref code is present
    }

    // Check if URL is /register
    if (window.location.pathname === '/register') {
      setView('signup');
    }
  }, []);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [liveActivity, setLiveActivity] = useState([
    { id: 1, user: 'Alex M.', action: 'Profit', amount: 450.20, asset: 'BTC/USD', time: 'Just now' },
    { id: 2, user: 'Sarah K.', action: 'Profit', amount: 120.50, asset: 'ETH/USD', time: '2m ago' },
    { id: 3, user: 'John D.', action: 'Payout', amount: 1200.00, asset: 'Withdrawal', time: '5m ago' },
  ]);
  const [marketPrices, setMarketPrices] = useState([
    { pair: 'BTC/USD', price: 64231.50, change: 2.4 },
    { pair: 'ETH/USD', price: 3452.12, change: 1.8 },
    { pair: 'EUR/USD', price: 1.0842, change: -0.2 },
    { pair: 'GBP/USD', price: 1.2734, change: 0.5 },
    { pair: 'GOLD', price: 2154.20, change: 1.2 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketPrices(prev => prev.map(item => ({
        ...item,
        price: item.price * (1 + (Math.random() - 0.5) * 0.0001),
        change: item.change + (Math.random() - 0.5) * 0.05
      })));

      // Simulate live activity
      if (Math.random() > 0.7) {
        const users = ['Michael R.', 'Elena S.', 'David L.', 'Sophie T.', 'Lucas B.'];
        const assets = ['BTC/USD', 'ETH/USD', 'GOLD', 'EUR/USD'];
        const actions = ['Profit', 'Profit', 'Payout'];
        const newActivity = {
          id: Date.now(),
          user: users[Math.floor(Math.random() * users.length)],
          action: actions[Math.floor(Math.random() * actions.length)],
          amount: Math.floor(Math.random() * 2000) + 50,
          asset: assets[Math.floor(Math.random() * assets.length)],
          time: 'Just now'
        };
        setLiveActivity(prev => [newActivity, ...prev.slice(0, 2)]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const selectedCountryData = COUNTRIES.find(c => c.code === country) || COUNTRIES[0];

  useEffect(() => {
    if (password) {
      let strength = 0;
      if (password.length >= 6) strength += 1;
      if (password.length >= 10) strength += 1;
      if (/[A-Z]/.test(password)) strength += 1;
      if (/[0-9]/.test(password)) strength += 1;
      if (/[^A-Za-z0-9]/.test(password)) strength += 1;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || (view !== 'forgot-password' && !password)) {
      setError('Please fill in all required fields.');
      return;
    }

    if (view === 'signup' && !acceptedTerms) {
      setError('You must accept the Terms and Conditions to continue.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (view !== 'forgot-password' && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      } else if (view === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Generate a unique referral code for the new user
        const newUserReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Create user profile in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: name || user.displayName || 'Operative',
            balance: 0,
            demoBalance: 10000,
            bonusBalance: 0,
            kycStatus: 'NOT_SUBMITTED',
            referralCode: newUserReferralCode,
            referredBy: referralCode || null,
            createdAt: Date.now(),
            country: country,
            currency: selectedCountryData.currency,
            currencySymbol: selectedCountryData.symbol,
            role: 'user',
            preferences: {
              language: 'en',
              theme: 'onyx',
              chartType: 'candles',
              timeframe: '1m'
            },
            extraAccounts: []
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
        
        onSuccess();
      } else if (view === 'forgot-password') {
        await sendPasswordResetEmail(auth, email);
        setSuccess('If an account exists for this email, you will receive reset instructions.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = err.message;
      if (err.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'An account already exists with this email. Please login instead.';
        setView('login'); // Automatically switch to login view
      }
      if (err.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for authentication. Please add it to your Firebase Console (Authentication > Settings > Authorized domains).';
      }
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Authentication provider (Google/Email) is not enabled in Firebase Console. Please enable it in Authentication > Sign-in method.';
      }
      setError(message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }

      if (userDoc && !userDoc.exists()) {
        // Create user profile if it doesn't exist
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'Operative',
            balance: 0,
            demoBalance: 10000,
            createdAt: Date.now(),
            country: 'US', // Default
            currency: 'USD',
            currencySymbol: '$',
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referredBy: referralCode || null
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      let message = err.message;
      if (err.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for Google Sign-In. Please add it to your Firebase Console (Authentication > Settings > Authorized domains).';
      }
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Google Sign-In is not enabled in Firebase Console. Please enable Google in Authentication > Sign-in method.';
      }
      setError(message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', user.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }

      if (userDoc && !userDoc.exists()) {
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email || `${user.uid}@facebook.auth`,
            name: user.displayName || 'Operative',
            balance: 0,
            demoBalance: 10000,
            createdAt: Date.now(),
            country: 'US', // Default
            currency: 'USD',
            currencySymbol: '$',
            referralCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            referredBy: referralCode || null
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error('Facebook Auth error:', err);
      let message = err.message;
      if (err.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for Facebook Sign-In. Please add it to your Firebase Console (Authentication > Settings > Authorized domains).';
      }
      setError(message || 'Facebook Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center p-4 font-sans selection:bg-[#22c55e]/30">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-white tracking-tight">Authorization</h1>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-3xl p-5 shadow-2xl">
           <div className="bg-[#2a2a2a] rounded-xl flex p-1 mb-6">
              <button 
                type="button"
                onClick={() => setView('signup')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-lg transition-colors",
                  view === 'signup' 
                    ? "bg-[#353535] text-white shadow-sm" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Registration
              </button>
              <button 
                type="button"
                onClick={() => setView('login')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-lg transition-colors",
                  view === 'login' 
                    ? "bg-white text-black shadow-sm" 
                    : "text-white/40 hover:text-white/60"
                )}
              >
                Login
              </button>
           </div>

           {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-lg flex items-start gap-2">
                 <AlertCircle size={16} className="shrink-0 mt-0.5" />
                 <span>{error}</span>
              </div>
           )}
           {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded-lg flex items-start gap-2">
                 <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                 <span>{success}</span>
              </div>
           )}

           <form onSubmit={handleAuth} className="space-y-4">
              <div className="relative group">
                 <input 
                   type="email" 
                   required
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                   placeholder="Email" 
                   className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#22c55e]/50 rounded-xl px-4 py-4 text-white placeholder-white/40 text-sm outline-none transition-all group-hover:border-white/10" 
                 />
              </div>

              {view !== 'forgot-password' && (
                <div className="relative group">
                   <input 
                     type={showPassword ? "text" : "password"}
                     required
                     value={password}
                     onChange={e => setPassword(e.target.value)}
                     placeholder="Password" 
                     className="w-full bg-[#1a1a1a] border border-white/5 focus:border-[#22c55e]/50 rounded-xl pl-4 pr-12 py-4 text-white placeholder-white/40 text-sm outline-none transition-all group-hover:border-white/10" 
                   />
                   <button 
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                   >
                     {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                   </button>
                </div>
              )}

              {view === 'signup' && (
                <div className="flex items-start gap-3 mt-4">
                   <button 
                     type="button"
                     onClick={() => setAcceptedTerms(!acceptedTerms)}
                     className={cn("w-5 h-5 rounded mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors shadow-inner", acceptedTerms ? "bg-white" : "bg-[#2a2a2a] hover:bg-[#333]")}
                   >
                     {acceptedTerms && <CheckCircle2 size={14} className="text-black" />}
                   </button>
                   <p className="text-[12px] text-white/50 leading-relaxed">
                     I confirm that I am of legal age, I have read and agree to the <a href="#" className="underline hover:text-white transition-colors">Service agreement</a>.
                   </p>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#22c55e] hover:bg-[#22c55e]/90 text-black font-bold py-4 rounded-xl mt-6 text-[15px] flex items-center justify-center transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(34,197,94,0.2)] disabled:opacity-50 disabled:active:scale-100"
              >
                {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : (
                   view === 'forgot-password' ? 'Reset Password' : (view === 'login' ? 'Login' : 'Register')
                )}
              </button>

              {view === 'login' && (
                 <div className="text-center mt-6">
                    <button type="button" onClick={() => setView('forgot-password')} className="text-[#22c55e] text-sm font-bold hover:underline underline-offset-4">
                      Forgot your password? &gt;
                    </button>
                 </div>
              )}
              {view === 'forgot-password' && (
                 <div className="text-center mt-6">
                    <button type="button" onClick={() => setView('login')} className="text-[#22c55e] text-sm font-bold hover:underline underline-offset-4">
                      Return to Login &gt;
                    </button>
                 </div>
              )}
           </form>

           {view !== 'forgot-password' && (
             <>
               <div className="mt-8 mb-6 flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center flex-1 w-2/3 mx-auto">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <span className="relative px-4 text-[13px] text-white/40 bg-[#151515]">Sign up with</span>
               </div>

               <div className="flex justify-center gap-4 mt-6">
                  <button onClick={handleFacebookSignIn} type="button" className="w-[60px] h-[60px] bg-white rounded-2xl hover:opacity-90 flex items-center justify-center transition-all active:scale-[0.96]">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.24h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                     </svg>
                  </button>
                  <button onClick={handleGoogleSignIn} type="button" className="w-[60px] h-[60px] bg-white rounded-2xl hover:opacity-90 flex items-center justify-center transition-all active:scale-[0.96]">
                     <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                     </svg>
                  </button>
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
}
