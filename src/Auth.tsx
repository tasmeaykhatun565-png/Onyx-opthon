import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
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
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', symbol: '৳' },
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
        
        // Create user profile in Firestore
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            name: name || user.displayName || 'Operative',
            balance: 0,
            demoBalance: 10000,
            referralCode: referralCode || '',
            createdAt: Date.now(),
            country: country,
            currency: selectedCountryData.currency,
            currencySymbol: selectedCountryData.symbol
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
      if (err.code === 'auth/email-already-in-use') message = 'An account already exists with this email.';
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
            currencySymbol: '$'
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }
      onSuccess();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-blue-500/30 overflow-hidden">
      {/* Top Market Ticker */}
      <div className="h-10 bg-white/[0.02] border-b border-white/5 flex items-center overflow-hidden whitespace-nowrap relative z-50 backdrop-blur-md">
        <div className="flex animate-marquee items-center gap-12 px-12">
          {marketPrices.map((market, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold text-white/40 tracking-wider uppercase">{market.pair}</span>
              <span className="text-[10px] font-mono font-bold text-white tracking-tight">{market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={cn(
                "text-[9px] font-mono font-bold",
                market.change >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
              </span>
            </div>
          ))}
          {/* Duplicate for seamless loop */}
          {marketPrices.map((market, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold text-white/40 tracking-wider uppercase">{market.pair}</span>
              <span className="text-[10px] font-mono font-bold text-white tracking-tight">{market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={cn(
                "text-[9px] font-mono font-bold",
                market.change >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Branding & Features (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#020202] border-r border-white/5">
        {/* Atmospheric Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_30%,rgba(37,99,235,0.15),transparent_60%)]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,rgba(147,51,234,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:60px_60px]" />
          
          {/* Animated Orbs */}
          <motion.div 
            animate={{ 
              x: [0, 50, 0],
              y: [0, 30, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ 
              x: [0, -40, 0],
              y: [0, 60, 0],
              scale: [1.2, 1, 1.2],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px]" 
          />
        </div>
        
        <div className="relative z-10 p-16 flex flex-col justify-between h-full w-full">
          <div>
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-6 mb-24"
            >
              <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.15)] ring-1 ring-white/20 transform -rotate-6">
                <TrendingUp className="text-black" size={36} />
              </div>
              <div className="flex flex-col">
                <span className="text-4xl font-display tracking-tight text-white uppercase leading-none">Onyx</span>
                <span className="text-[10px] text-blue-500 font-mono font-bold uppercase tracking-[0.5em] mt-2">Elite Terminal</span>
              </div>
            </motion.div>

            <div className="space-y-12 max-w-2xl">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="transform -skew-x-6"
              >
                <h2 className="text-[120px] font-display leading-[0.82] text-white tracking-[-0.02em] uppercase">
                  Master <br />
                  <span className="font-serif italic font-light text-blue-500 lowercase tracking-tight ml-4">the</span> <br />
                  Markets.
                </h2>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-2xl text-white/40 leading-relaxed font-light max-w-lg font-sans"
              >
                Experience institutional-grade execution with the world's most sophisticated binary options engine.
              </motion.p>
            </div>
          </div>

          <div className="space-y-12">
            {/* Live Activity Feed - Social Proof */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em]">Live Network Activity</span>
              </div>
              <div className="grid gap-3">
                {liveActivity.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 backdrop-blur-md flex items-center justify-between group hover:bg-white/[0.04] transition-all duration-500"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/5">
                        <img src={`https://picsum.photos/seed/${activity.user}/40/40`} alt="" className="w-full h-full object-cover opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                      </div>
                      <div>
                        <p className="text-xs font-mono font-bold text-white/80 tracking-tight">{activity.user}</p>
                        <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">{activity.asset}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-sm font-mono font-bold tracking-tighter",
                        activity.action === 'Profit' ? "text-emerald-400" : "text-blue-400"
                      )}>
                        {activity.action === 'Profit' ? '+' : ''}${activity.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[8px] font-mono text-white/20 font-bold uppercase tracking-widest">{activity.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trust Badges & Stats */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="pt-10 border-t border-white/5 flex items-end justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-8">
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-white tracking-tighter">1.2M+</p>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Active Traders</p>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="space-y-1">
                    <p className="text-3xl font-black text-white tracking-tighter">$4.8B</p>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Volume Traded</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <Shield size={12} className="text-blue-400" />
                    <span className="text-[9px] text-white/60 font-black uppercase tracking-widest">Bank-Grade Security</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <Globe2 size={12} className="text-emerald-400" />
                    <span className="text-[9px] text-white/60 font-black uppercase tracking-widest">Global Compliance</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <div className="flex -space-x-3 mb-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-white/10 ring-1 ring-white/20">
                      <img src={`https://picsum.photos/seed/avatar${i}/100/100`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-tighter">Trusted by professionals worldwide</p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-[#020202] overflow-y-auto">
        {/* Background Accents */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-[480px] relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white/[0.02] border border-white/10 rounded-[40px] p-10 sm:p-12 backdrop-blur-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden group"
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

              <div className="mb-12 relative">
                {view === 'forgot-password' && (
                  <button 
                    onClick={() => setView('login')}
                    className="flex items-center gap-2 text-white/30 hover:text-white text-[10px] font-black uppercase tracking-[0.3em] mb-8 transition-colors group/back"
                  >
                    <ChevronLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" />
                    Return to Terminal
                  </button>
                )}
                
                <div className="lg:hidden flex items-center gap-3 mb-10">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <TrendingUp className="text-black" size={20} />
                  </div>
                  <span className="text-xl font-display tracking-tighter text-white uppercase">Onyx</span>
                </div>

                <h1 className="text-6xl font-display text-white mb-4 tracking-tight uppercase">
                  {view === 'login' ? 'Sign In' : view === 'signup' ? 'Join Elite' : 'Reset'}
                </h1>
                <p className="text-white/40 text-sm font-medium tracking-wide uppercase opacity-70">
                  {view === 'login' 
                    ? 'Access your institutional trading terminal' 
                    : view === 'signup' 
                    ? 'Begin your journey with the world\'s most advanced platform'
                    : 'Enter your email to receive secure reset instructions'}
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-4 text-red-400 text-sm leading-relaxed"
                >
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                  <p>{error}</p>
                </motion.div>
              )}

              {success && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-4 text-emerald-400 text-sm leading-relaxed"
                >
                  <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
                  <p>{success}</p>
                </motion.div>
              )}

              <form onSubmit={handleAuth} className="space-y-8 relative">
                {view === 'signup' && (
                  <>
                    <div className="space-y-3">
                      <label className="text-[13px] font-mono font-bold text-white/80 uppercase tracking-[0.3em] ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="text" 
                          required 
                          placeholder="ENTER YOUR FULL NAME"
                          className="w-full bg-white/[0.05] border border-white/20 rounded-2xl py-5 pl-16 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all ring-0 focus:ring-8 focus:ring-blue-500/5 font-mono text-sm tracking-tight backdrop-blur-sm"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-mono font-bold text-white/80 uppercase tracking-[0.3em] ml-1">Region</label>
                        <div className="relative group">
                          <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-500 transition-colors" size={20} />
                          <select
                            className="w-full bg-white/[0.05] border border-white/20 rounded-2xl py-5 pl-16 pr-6 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all appearance-none cursor-pointer text-[12px] font-mono font-bold uppercase tracking-wider backdrop-blur-sm"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.code} value={c.code} className="bg-[#0a0a0a] text-white">
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[13px] font-mono font-bold text-white/80 uppercase tracking-[0.3em] ml-1">Currency</label>
                        <div className="relative group">
                          <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                          <div className="w-full bg-white/[0.05] border border-white/20 rounded-2xl py-5 pl-16 pr-6 text-white/60 flex items-center gap-2 cursor-not-allowed text-[12px] font-mono font-bold uppercase tracking-wider">
                            <span>{selectedCountryData.currency}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[13px] font-mono font-bold text-white/80 uppercase tracking-[0.3em] ml-1">Referral Code</label>
                      <div className="relative group">
                        <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-500 transition-colors" size={20} />
                        <input 
                          type="text" 
                          placeholder="OPTIONAL CODE"
                          className="w-full bg-white/[0.05] border border-white/20 rounded-2xl py-5 pl-16 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all font-mono text-sm tracking-tight backdrop-blur-sm"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-3">
                  <label className="text-[13px] font-mono font-bold text-white/80 uppercase tracking-[0.3em] ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input 
                      type="email" 
                      required 
                      placeholder="YOUR@EMAIL.COM"
                      className="w-full bg-white/[0.05] border border-white/20 rounded-2xl py-5 pl-16 pr-6 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all ring-0 focus:ring-8 focus:ring-blue-500/5 font-mono text-sm tracking-tight backdrop-blur-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {view !== 'forgot-password' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-[13px] font-mono font-bold text-white/80 uppercase tracking-[0.3em]">Password</label>
                      {view === 'login' && (
                        <button 
                          type="button"
                          onClick={() => setView('forgot-password')}
                          className="text-[12px] text-blue-500 hover:text-blue-400 transition-colors font-mono font-bold uppercase tracking-widest"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative group">
                      <LockKeyhole className="absolute left-6 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        required 
                        placeholder="••••••••"
                        className="w-full bg-white/[0.05] border border-white/20 rounded-2xl py-5 pl-16 pr-16 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all ring-0 focus:ring-8 focus:ring-blue-500/5 font-mono text-sm tracking-tight backdrop-blur-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>

                    {view === 'signup' && password && (
                      <div className="px-1 space-y-3">
                        <div className="flex gap-2 h-1.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div 
                              key={i}
                              className={cn(
                                "flex-1 rounded-full transition-all duration-700",
                                i <= passwordStrength 
                                  ? passwordStrength <= 2 ? "bg-red-500/50" : passwordStrength <= 4 ? "bg-yellow-500/50" : "bg-emerald-500/50"
                                  : "bg-white/5"
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.2em]">
                          Security Level: <span className={cn(
                            "transition-colors",
                            passwordStrength <= 2 ? "text-red-400" : passwordStrength <= 4 ? "text-yellow-400" : "text-emerald-400"
                          )}>
                            {passwordStrength <= 2 ? 'Vulnerable' : passwordStrength <= 4 ? 'Standard' : 'Fortified'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {view === 'signup' && (
                  <div className="flex items-start gap-4 px-1">
                    <button
                      type="button"
                      onClick={() => setAcceptedTerms(!acceptedTerms)}
                      className={cn(
                        "mt-1 w-6 h-6 rounded-lg border transition-all flex items-center justify-center shrink-0",
                        acceptedTerms ? "bg-white border-white" : "bg-white/5 border-white/10 hover:border-white/20"
                      )}
                    >
                      {acceptedTerms && <CheckCircle2 size={16} className="text-black" />}
                    </button>
                    <p className="text-xs text-white/30 leading-relaxed font-medium">
                      I acknowledge the <button type="button" className="text-blue-500 hover:text-blue-400 transition-colors">Master Agreement</button> and <button type="button" className="text-blue-500 hover:text-blue-400 transition-colors">Risk Disclosure</button>. I confirm I am of legal trading age.
                    </p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-white hover:bg-white/90 disabled:opacity-50 text-black font-display py-6 rounded-2xl transition-all flex items-center justify-center gap-4 group relative overflow-hidden shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] uppercase tracking-[0.1em] text-sm"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-black/10 border-t-black rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{view === 'login' ? 'Establish Connection' : view === 'signup' ? 'Create Terminal' : 'Reset Security'}</span>
                      <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {view !== 'forgot-password' && (
                <>
                  <div className="my-12 flex items-center gap-6">
                    <div className="h-px flex-1 bg-white/5"></div>
                    <span className="text-[9px] text-white/10 font-black uppercase tracking-[0.5em]">External Auth</span>
                    <div className="h-px flex-1 bg-white/5"></div>
                  </div>

                  <button 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full bg-white/[0.01] border border-white/5 text-white/40 font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-4 hover:bg-white/[0.03] hover:text-white active:scale-[0.98] group"
                  >
                    <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ring-1 ring-white/10">
                      <Chrome size={18} className="text-white/60 group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] font-mono font-bold">Continue with Google</span>
                  </button>
                </>
              )}

              <div className="mt-14 pt-10 border-t border-white/5 text-center">
                <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                  {view === 'login' ? "New operative?" : view === 'signup' ? "Existing operative?" : "Remembered?"}{' '}
                  <button 
                    onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                    className="text-blue-500 font-black hover:text-blue-400 transition-colors ml-2 underline-offset-8 hover:underline"
                  >
                    {view === 'login' ? 'Register Account' : 'Sign In'}
                  </button>
                </p>
              </div>

              {/* Trust Badges - Bottom of form */}
              <div className="mt-10 flex items-center justify-center gap-8 opacity-20 grayscale hover:grayscale-0 hover:opacity-50 transition-all duration-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span className="text-[8px] font-black uppercase tracking-widest">PCI DSS</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock size={16} />
                  <span className="text-[8px] font-black uppercase tracking-widest">AES-256</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} />
                  <span className="text-[8px] font-black uppercase tracking-widest">Secure Pay</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
);
}
