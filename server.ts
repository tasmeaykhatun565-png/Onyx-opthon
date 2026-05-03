import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';

const JWT_SECRET = process.env.JWT_SECRET || 'trading-platform-secret-key';

let firestore: any = null;
let db: any = null;
let currentFirebaseProjectId: string | null = null;
let firestoreDisabledDueToError = false;

process.on('unhandledRejection', (reason: any, promise) => {
  if (reason && (reason.code === 7 || (reason.message && reason.message.includes('PERMISSION_DENIED')))) {
    firestoreDisabledDueToError = true;
    console.warn('Firestore sync disabled globally due to PERMISSION_DENIED. Please provide a service account key or use the default AI Studio Firebase project.');
  } else if (reason && (reason.code === 5 || (reason.message && reason.message.includes('NOT_FOUND')))) {
    firestoreDisabledDueToError = true;
    console.warn('Firestore sync disabled globally due to NOT_FOUND database. Please verify your Firestore Database ID.');
  } else {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

const canSyncFirestore = () => {
  return firestore !== null && !firestoreDisabledDueToError;
};

const handleFirestoreError = (e: any, context: string) => {
  if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
    firestoreDisabledDueToError = true;
    console.warn(`Firestore sync disabled globally due to PERMISSION_DENIED during ${context}.`);
  } else if (e.code === 5 || (e.message && e.message.includes('NOT_FOUND'))) {
    firestoreDisabledDueToError = true;
    console.warn(`Firestore sync disabled globally due to NOT_FOUND database during ${context}. Please verify your Firestore Database ID.`);
  } else {
    console.error(`Firestore ${context} error:`, e);
  }
};

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  BDT: 110,
  EUR: 0.92,
  INR: 83,
  PKR: 278,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.53,
  BRL: 4.95,
  NGN: 1150,
  IDR: 15600,
  MYR: 4.75,
  PHP: 56,
  THB: 35.8,
  VND: 24600
};

import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';

async function startServer() {
  // Initialize Firebase Admin
  try {
    if (fs.existsSync('./firebase-applet-config.json')) {
      const configContent = fs.readFileSync('./firebase-applet-config.json', 'utf-8');
      const firebaseConfig = JSON.parse(configContent);
      currentFirebaseProjectId = firebaseConfig.projectId;
      console.log('Initializing Firebase Admin with project:', firebaseConfig.projectId);
      
      if (getApps().length === 0) {
        const options: any = {
          credential: applicationDefault(),
        };
        // In AI Studio, applicationDefault() already knows the project ID.
        // If we're in a remixed app, the projectId in config might be stale.
        // We prefer the environment's project ID if available.
        const envProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;
        if (envProjectId) {
          options.projectId = envProjectId;
          console.log('Using environment project ID:', envProjectId);
        } else if (firebaseConfig.projectId && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
           options.projectId = firebaseConfig.projectId;
        }
        initializeApp(options);
      }
      
      const app = getApps()[0];
      const dbId = firebaseConfig.firestoreDatabaseId;
      const firestoreDb = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
      try {
        firestoreDb.settings({ ignoreUndefinedProperties: true });
      } catch (e) {
        console.warn('Could not set firestore settings:', e);
      }
      firestore = firestoreDb;
    }
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }

  // Initialize Database
  const dbPath = path.join(process.cwd(), 'trading_v2.db');
  const initDb = (pathStr: string) => {
    const database = new Database(pathStr);
    database.exec(`
      CREATE TABLE IF NOT EXISTS market_history (
        symbol TEXT,
        time INTEGER,
        open REAL,
        high REAL,
        low REAL,
        close REAL,
        PRIMARY KEY (symbol, time)
      );
      
      CREATE INDEX IF NOT EXISTS idx_market_history_time ON market_history(time);
      CREATE INDEX IF NOT EXISTS idx_market_history_symbol_time ON market_history(symbol, time);
      
      CREATE TABLE IF NOT EXISTS trade_stats (
        date TEXT PRIMARY KEY,
        total_trades INTEGER DEFAULT 0,
        total_volume REAL DEFAULT 0,
        total_user_profit REAL DEFAULT 0,
        total_user_loss REAL DEFAULT 0,
        house_net REAL DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS kyc_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        documentType TEXT,
        documentNumber TEXT,
        fullName TEXT,
        dateOfBirth TEXT,
        gender TEXT,
        frontImage TEXT,
        backImage TEXT,
        selfieImage TEXT,
        status TEXT DEFAULT 'PENDING',
        submittedAt INTEGER,
        updatedAt INTEGER,
        rejectionReason TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        email TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        timestamp INTEGER,
        isRead INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        amount REAL,
        currency TEXT,
        method TEXT,
        transactionId TEXT,
        status TEXT DEFAULT 'PENDING',
        submittedAt INTEGER,
        updatedAt INTEGER,
        promoCode TEXT,
        bonusAmount REAL DEFAULT 0,
        turnoverRequired REAL DEFAULT 0,
        screenshot TEXT
      );

      CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        amount REAL,
        currency TEXT,
        method TEXT,
        accountDetails TEXT,
        status TEXT DEFAULT 'PENDING',
        submittedAt INTEGER,
        updatedAt INTEGER,
        rejectionReason TEXT,
        realAmount REAL DEFAULT 0,
        bonusAmount REAL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT,
        name TEXT,
        photoURL TEXT,
        uid TEXT,
        balance REAL DEFAULT 0,
        demoBalance REAL DEFAULT 10000,
        status TEXT DEFAULT 'ACTIVE',
        kycStatus TEXT DEFAULT 'NONE',
        isBoosted INTEGER DEFAULT 0,
        createdAt INTEGER,
        lastLogin INTEGER,
        turnover_required REAL DEFAULT 0,
        turnover_achieved REAL DEFAULT 0,
        bonus_balance REAL DEFAULT 0,
        referredBy TEXT,
        referralCode TEXT,
        referralCount INTEGER DEFAULT 0,
        referralBalance REAL DEFAULT 0,
        totalReferralEarnings REAL DEFAULT 0,
        allowed_withdrawal_methods TEXT DEFAULT '',
        trades TEXT DEFAULT '[]',
        language TEXT DEFAULT 'en',
        currency TEXT DEFAULT 'USD',
        currencySymbol TEXT DEFAULT '$',
        currencyName TEXT DEFAULT 'US Dollar',
        currencyFlag TEXT DEFAULT '🇺🇸',
        timeframe TEXT DEFAULT '1m',
        chartType TEXT DEFAULT 'candles'
      );

      CREATE TABLE IF NOT EXISTS promo_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE,
        description TEXT,
        bonusPercentage REAL,
        minDeposit REAL,
        turnoverMultiplier REAL,
        expiresAt INTEGER,
        title TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        action TEXT,
        details TEXT,
        timestamp INTEGER,
        ip TEXT
      );

      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        referrerUid TEXT,
        referredUid TEXT,
        referredEmail TEXT,
        amount REAL,
        type TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS pending_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        uid TEXT,
        assetId TEXT,
        assetName TEXT,
        type TEXT,
        triggerValue REAL,
        profitability REAL,
        amount REAL,
        duration INTEGER,
        direction TEXT,
        accountType TEXT,
        status TEXT DEFAULT 'PENDING',
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS social_chat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        name TEXT,
        text TEXT,
        photoURL TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS support_chat (
        id TEXT PRIMARY KEY,
        email TEXT,
        text TEXT,
        sender TEXT,
        timestamp INTEGER
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        email TEXT PRIMARY KEY,
        status TEXT DEFAULT 'active',
        lastUpdated INTEGER
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        fromEmail TEXT,
        toEmail TEXT,
        amount REAL,
        timestamp INTEGER,
        status TEXT DEFAULT 'COMPLETED'
      );

      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        prizeFund REAL,
        startTime INTEGER,
        endTime INTEGER,
        imageUrl TEXT,
        status TEXT,
        isLocked INTEGER DEFAULT 0,
        rules TEXT,
        participants INTEGER DEFAULT 0,
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        title TEXT,
        imageUrl TEXT,
        linkUrl TEXT,
        displayOrder INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        createdAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id TEXT PRIMARY KEY,
        title TEXT,
        message TEXT,
        imageUrl TEXT,
        linkUrl TEXT,
        likes INTEGER DEFAULT 0,
        dislikes INTEGER DEFAULT 0,
        createdAt INTEGER
      );
    `);
    
    // Add columns if they don't exist (for existing databases)
    const migrationQueries = [
      'ALTER TABLE kyc_submissions ADD COLUMN gender TEXT',
      'ALTER TABLE users ADD COLUMN trades TEXT DEFAULT "[]"',
      'ALTER TABLE users ADD COLUMN password TEXT',
      'ALTER TABLE users ADD COLUMN twoFactorSecret TEXT',
      'ALTER TABLE users ADD COLUMN twoFactorEnabled INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN name TEXT',
      'ALTER TABLE users ADD COLUMN photoURL TEXT',
      'ALTER TABLE users ADD COLUMN uid TEXT',
      'ALTER TABLE users ADD COLUMN turnover_required REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN turnover_achieved REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN bonus_balance REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN referredBy TEXT',
      'ALTER TABLE users ADD COLUMN referralCode TEXT',
      'ALTER TABLE users ADD COLUMN referralCount INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN referralBalance REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN totalReferralEarnings REAL DEFAULT 0',
      'ALTER TABLE users ADD COLUMN allowed_withdrawal_methods TEXT DEFAULT ""',
      'ALTER TABLE users ADD COLUMN extraAccounts TEXT DEFAULT "[]"',
      'ALTER TABLE users ADD COLUMN currencySymbol TEXT DEFAULT "$"',
      'ALTER TABLE users ADD COLUMN currencyName TEXT DEFAULT "US Dollar"',
      'ALTER TABLE users ADD COLUMN currencyFlag TEXT DEFAULT "🇺🇸"',
      'ALTER TABLE deposits ADD COLUMN promoCode TEXT',
      'ALTER TABLE deposits ADD COLUMN bonusAmount REAL DEFAULT 0',
      'ALTER TABLE deposits ADD COLUMN turnoverRequired REAL DEFAULT 0',
      'ALTER TABLE withdrawals ADD COLUMN realAmount REAL DEFAULT 0',
      'ALTER TABLE withdrawals ADD COLUMN bonusAmount REAL DEFAULT 0',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_deposits_transactionId ON deposits(transactionId)'
    ];

    for (const query of migrationQueries) {
      try { database.prepare(query).run(); } catch (e) {}
    }
    
    // Migrations
    try {
      database.exec("ALTER TABLE kyc_submissions ADD COLUMN selfieImage TEXT");
      console.log('Added selfieImage column to kyc_submissions');
    } catch (e) {}

    try {
      database.exec("ALTER TABLE users ADD COLUMN extraAccounts TEXT DEFAULT '[]'");
      console.log('Added extraAccounts column to users');
    } catch (e) {}

    return database;
  };

  try {
    db = initDb(dbPath);
  } catch (dbError: any) {
    const errorStr = String(dbError);
    console.error('Database initialization error:', errorStr);
    if (dbError.code === 'SQLITE_CORRUPT' || errorStr.includes('malformed') || errorStr.includes('unsupported file format')) {
      console.error('Database file is corrupt or invalid. Deleting and recreating...');
      try {
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
        db = initDb(dbPath);
      } catch (retryError) {
        console.error('Failed to recreate database file, using in-memory:', retryError);
        db = initDb(':memory:');
      }
    } else {
      console.error('Falling back to in-memory database');
      db = initDb(':memory:');
    }
  }

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // Debug request logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Helper to sync user from Firestore to SQLite
  const syncUserFromFirestore = async (email: string, uid: string, defaultName: string, defaultPhoto: string) => {
    if (!canSyncFirestore() || !uid) return null;
    try {
      const doc = await firestore.collection('users').doc(uid).get().catch((e: any) => {
        if (e.code === 5) return null; // NOT_FOUND
        throw e;
      });
      
      if (doc && doc.exists) {
        const data = doc.data();
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        const now = Date.now();
        
        if (!existingUser) {
          db.prepare('INSERT INTO users (email, name, photoURL, uid, balance, demoBalance, createdAt, lastLogin, status, kycStatus, turnover_achieved, turnover_required, bonus_balance, referralBalance, totalReferralEarnings, allowed_withdrawal_methods, trades, language, currency, currencySymbol, currencyName, currencyFlag, timeframe, chartType, referredBy, referralCode, referralCount, extraAccounts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(
              email, 
              data.name || defaultName || '', 
              data.photoURL || defaultPhoto || '', 
              uid, 
              data.balance !== undefined ? data.balance : 0, 
              data.demoBalance !== undefined ? data.demoBalance : 10000, 
              data.createdAt || now, 
              now,
              data.status || 'ACTIVE',
              data.kycStatus || 'NONE',
              data.turnover_achieved || 0,
              data.turnover_required || 0,
              data.bonus_balance || 0,
              data.referralBalance || 0,
              data.totalReferralEarnings || 0,
              data.allowed_withdrawal_methods || '',
              data.trades || '[]',
              data.language || 'en',
              data.currency || 'USD',
              data.currencySymbol || '$',
              data.currencyName || 'US Dollar',
              data.currencyFlag || '🇺🇸',
              data.timeframe || '1m',
              data.chartType || 'candles',
              data.referredBy || null,
              data.referralCode || Math.random().toString(36).substring(2, 8).toUpperCase(),
              data.referralCount || 0,
              data.extraAccounts || '[]'
            );
            
          // Increment referralCount for referrer
          if (data.referredBy) {
            const referrer = db.prepare('SELECT * FROM users WHERE referralCode = ? OR UPPER(substr(uid, 1, 8)) = UPPER(?)').get(data.referredBy, data.referredBy) as any;
            if (referrer) {
              db.prepare('UPDATE users SET referralCount = referralCount + 1 WHERE email = ?').run(referrer.email);
              if (canSyncFirestore() && referrer.uid) {
                firestore.collection('users').doc(referrer.uid).set({
                  referralCount: (referrer.referralCount || 0) + 1
                }, { merge: true }).catch((e: any) => {
                  if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                    firestoreDisabledDueToError = true;
                    console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during referrer count update.');
                  } else {
                    console.error('Firestore referrer count update error:', e);
                  }
                });
              }
            }
          }
        } else {
          db.prepare('UPDATE users SET balance = ?, demoBalance = ?, status = ?, kycStatus = ?, turnover_achieved = ?, turnover_required = ?, bonus_balance = ?, referralBalance = ?, totalReferralEarnings = ?, allowed_withdrawal_methods = ?, trades = ?, language = ?, currency = ?, currencySymbol = ?, currencyName = ?, currencyFlag = ?, timeframe = ?, chartType = ?, referredBy = ?, referralCode = ?, referralCount = ?, extraAccounts = ? WHERE email = ?')
            .run(
              data.balance !== undefined ? data.balance : existingUser.balance,
              data.demoBalance !== undefined ? data.demoBalance : existingUser.demoBalance,
              data.status || existingUser.status,
              data.kycStatus || existingUser.kycStatus,
              data.turnover_achieved !== undefined ? data.turnover_achieved : existingUser.turnover_achieved,
              data.turnover_required !== undefined ? data.turnover_required : existingUser.turnover_required,
              data.bonus_balance !== undefined ? data.bonus_balance : existingUser.bonus_balance,
              data.referralBalance !== undefined ? data.referralBalance : existingUser.referralBalance,
              data.totalReferralEarnings !== undefined ? data.totalReferralEarnings : existingUser.totalReferralEarnings,
              data.allowed_withdrawal_methods !== undefined ? data.allowed_withdrawal_methods : existingUser.allowed_withdrawal_methods,
              data.trades !== undefined ? data.trades : existingUser.trades,
              data.language !== undefined ? data.language : existingUser.language,
              data.currency !== undefined ? data.currency : existingUser.currency,
              data.currencySymbol !== undefined ? data.currencySymbol : existingUser.currencySymbol,
              data.currencyName !== undefined ? data.currencyName : existingUser.currencyName,
              data.currencyFlag !== undefined ? data.currencyFlag : existingUser.currencyFlag,
              data.timeframe !== undefined ? data.timeframe : existingUser.timeframe,
              data.chartType !== undefined ? data.chartType : existingUser.chartType,
              data.referredBy !== undefined ? data.referredBy : existingUser.referredBy,
              data.referralCode !== undefined ? data.referralCode : existingUser.referralCode,
              data.referralCount !== undefined ? data.referralCount : existingUser.referralCount,
              data.extraAccounts !== undefined ? data.extraAccounts : existingUser.extraAccounts,
              email
            );
        }
        return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      }
    } catch (error: any) {
      handleFirestoreError(error, 'user sync from Firestore');
    }
    return null;
  };

  app.get('/api/user', async (req, res) => {
    console.log('API /api/user called with query:', req.query);
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
      let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      
      // Try to fetch from Firestore if not found in SQLite
      if (!user && canSyncFirestore()) {
        try {
          const snapshot = await firestore.collection('users').where('email', '==', email).limit(1).get();
          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const uid = doc.id;
            user = await syncUserFromFirestore(email as string, uid, '', '');
          }
        } catch (e: any) {
          handleFirestoreError(e, 'user fetch by email');
        }
      }
      
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/withdraw-referral', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const email = decoded.email;

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const minWithdrawal = globalReferralSettings.minWithdrawal || 10;
      if (!user.referralBalance || user.referralBalance < minWithdrawal) {
        return res.status(400).json({ error: `Minimum withdrawal is USD ${minWithdrawal}` });
      }

      const withdrawAmount = user.referralBalance;
      
      // Update SQLite: Transfer from referralBalance to main balance
      db.prepare('UPDATE users SET balance = balance + ?, referralBalance = 0 WHERE email = ?')
        .run(withdrawAmount, email);
      
      // Log activity
      logActivity(email, 'REFERRAL_PAYOUT', `Withdrew USD ${withdrawAmount.toFixed(2)} from referral balance to main balance`);
      
      // Emit update to user
      emitUserUpdate(email);
      
      // Notify user via socket
      const socketIds = Object.keys(connectedUsers).filter(id => connectedUsers[id].email === email);
      socketIds.forEach(socketId => {
        io.to(socketId).emit('balance-updated', { balance: (user.balance + withdrawAmount), type: 'REAL' });
        io.to(socketId).emit('new-notification', {
          id: Date.now().toString(),
          title: 'Payout Successful!',
          message: `USD ${withdrawAmount.toFixed(2)} has been transferred to your main balance.`,
          type: 'success',
          timestamp: Date.now()
        });
      });

      res.json({ 
        success: true, 
        amount: withdrawAmount, 
        message: 'Withdrawal successful' 
      });
    } catch (error: any) {
      console.error('Withdraw referral error:', error);
      res.status(500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.post('/api/user/preferences', async (req, res) => {
    const { email, language, currency, currencySymbol, currencyName, currencyFlag, timeframe, chartType } = req.body;
    try {
      const updates = [];
      const values = [];
      const firestoreUpdates: any = {};

      if (language) { updates.push('language = ?'); values.push(language); firestoreUpdates.language = language; }
      if (currency) { updates.push('currency = ?'); values.push(currency); firestoreUpdates.currency = currency; }
      if (currencySymbol) { updates.push('currencySymbol = ?'); values.push(currencySymbol); firestoreUpdates.currencySymbol = currencySymbol; }
      if (currencyName) { updates.push('currencyName = ?'); values.push(currencyName); firestoreUpdates.currencyName = currencyName; }
      if (currencyFlag) { updates.push('currencyFlag = ?'); values.push(currencyFlag); firestoreUpdates.currencyFlag = currencyFlag; }
      if (timeframe) { updates.push('timeframe = ?'); values.push(timeframe); firestoreUpdates.timeframe = timeframe; }
      if (chartType) { updates.push('chartType = ?'); values.push(chartType); firestoreUpdates.chartType = chartType; }

      if (updates.length > 0) {
        values.push(email);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE email = ?`).run(...values);
        
        // Sync to Firestore
        if (canSyncFirestore()) {
          const user = db.prepare('SELECT uid FROM users WHERE email = ?').get(email) as any;
          if (user && user.uid) {
            firestore.collection('users').doc(user.uid).set(firestoreUpdates, { merge: true })
              .catch((error: any) => handleFirestoreError(error, 'preferences sync'));
          }
        }
        
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'No preferences provided' });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Auth Routes
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name, referralCode } = req.body;
    try {
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = Math.random().toString(36).substring(2, 15);
      const createdAt = Date.now();

      db.prepare(`
        INSERT INTO users (email, password, name, uid, createdAt, balance, demoBalance, referralCode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(email, hashedPassword, name, uid, createdAt, 0, 10000, Math.random().toString(36).substring(2, 8).toUpperCase());

      if (referralCode) {
        const referrer = db.prepare('SELECT * FROM users WHERE referralCode = ? OR UPPER(substr(uid, 1, 8)) = UPPER(?)').get(referralCode, referralCode) as any;
        if (referrer) {
          db.prepare('UPDATE users SET referredBy = ? WHERE email = ?').run(referrer.referralCode, email);
          db.prepare('UPDATE users SET referralCount = referralCount + 1 WHERE email = ?').run(referrer.email);
          if (canSyncFirestore() && referrer.uid) {
            firestore.collection('users').doc(referrer.uid).set({
              referralCount: (referrer.referralCount || 0) + 1
            }, { merge: true }).catch((e: any) => {
              if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                firestoreDisabledDueToError = true;
                console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during referrer count update.');
              } else {
                console.error('Firestore referrer count update error:', e);
              }
            });
          }
        }
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      const token = jwt.sign({ email: user.email, uid: user.uid }, JWT_SECRET, { expiresIn: '7d' });

      res.json({ user, token });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Invalid password' });
      }

      db.prepare('UPDATE users SET lastLogin = ? WHERE email = ?').run(Date.now(), email);

      const token = jwt.sign({ email: user.email, uid: user.uid }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ user, token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(decoded.email) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  const httpServer = createServer(app);

  // Setup Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Sync users from Firestore to SQLite in real-time - DISABLED for performance
  /*
  if (firestore && db) {
    console.log('Initializing Firestore users sync...');
    // ... (logic removed for speed)
  }
  */

  // Helper to update user trades in the database
  const updateUserTrades = (email: string, trade: any) => {
    if (!email) {
      console.error('updateUserTrades: email is missing');
      return;
    }
    const user = db.prepare('SELECT uid, trades FROM users WHERE email = ?').get(email) as any;
    if (user) {
      let trades = [];
      try {
        trades = typeof user.trades === 'string' ? JSON.parse(user.trades) : (user.trades || []);
      } catch (e) {
        trades = [];
      }
      
      // Check if trade already exists in history
      const index = trades.findIndex((t: any) => t.id === trade.id);
      if (index !== -1) {
        trades[index] = { ...trades[index], ...trade };
      } else {
        trades.unshift(trade);
      }
      
      // Keep only last 100 trades to prevent DB bloat
      if (trades.length > 100) trades = trades.slice(0, 100);
      
      const tradesJson = JSON.stringify(trades);
      db.prepare('UPDATE users SET trades = ? WHERE email = ?').run(tradesJson, email);

      // Sync with Firestore
      if (canSyncFirestore() && user.uid) {
        firestore.collection('users').doc(user.uid).set({ trades: tradesJson }, { merge: true })
          .catch((e: any) => handleFirestoreError(e, 'user trades update'));
          
        // Also save directly to a subcollection for easier viewing
        firestore.collection('users').doc(user.uid).collection('trades').doc(trade.id).set(trade, { merge: true })
          .catch((e: any) => handleFirestoreError(e, 'trade document update'));
      }
    }
  };

  // Helper to emit user data updates
  const emitUserUpdate = (email: string) => {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (user) {
      // Find all sockets for this user (could be multiple tabs)
      const socketIds = Object.keys(connectedUsers).filter(id => connectedUsers[id].email === email);
      
      // Parse trades if it's a string
      let trades = [];
      try {
        trades = typeof user.trades === 'string' ? JSON.parse(user.trades) : (user.trades || []);
      } catch (e) {
        trades = [];
      }

      // Parse extraAccounts if it's a string
      let extraAccounts = [];
      try {
        extraAccounts = typeof user.extraAccounts === 'string' ? JSON.parse(user.extraAccounts) : (user.extraAccounts || []);
      } catch (e) {
        extraAccounts = [];
      }

      // Get recent referrals
      const recentReferrals = db.prepare('SELECT email, createdAt, status FROM users WHERE referredBy = ? OR referredBy = ? OR referredBy = ? ORDER BY createdAt DESC LIMIT 10').all(user.referralCode, user.uid, user.email);
      
      // Get commission history
      const commissionHistory = db.prepare('SELECT * FROM referrals WHERE referrerUid = ? OR referrerUid = ? OR referredEmail = ? ORDER BY timestamp DESC LIMIT 10').all(user.uid, user.referralCode, user.email);

      socketIds.forEach(socketId => {
        if (connectedUsers[socketId]) {
          connectedUsers[socketId] = {
            ...connectedUsers[socketId],
            ...user,
            trades,
            extraAccounts,
            recentReferrals,
            commissionHistory
          };
        }
        io.to(socketId).emit('user-data-updated', {
          ...user,
          trades,
          extraAccounts,
          recentReferrals,
          commissionHistory
        });
      });

      // Sync to Firestore if available and authorized
      if (canSyncFirestore() && user.uid) {
        const syncData = {
          balance: user.balance,
          bonus_balance: user.bonus_balance || 0,
          demoBalance: user.demoBalance,
          referralBalance: user.referralBalance,
          totalReferralEarnings: user.totalReferralEarnings,
          referralCount: user.referralCount,
          recentReferrals,
          commissionHistory,
          trades: trades,
          extraAccounts: extraAccounts,
          kycStatus: user.kycStatus,
          lastLogin: user.lastLogin,
          status: user.status,
          turnover_achieved: user.turnover_achieved,
          turnover_required: user.turnover_required
        };
        firestore.collection('users').doc(user.uid).set(syncData, { merge: true })
          .catch((error: any) => {
            if (error.code === 7 || (error.message && error.message.includes('PERMISSION_DENIED'))) {
              firestoreDisabledDueToError = true;
              console.warn('Firestore sync disabled due to PERMISSION_DENIED. Please provide a service account key or use the default AI Studio Firebase project.');
            } else if (error.code === 5 || (error.message && error.message.includes('NOT_FOUND'))) {
              firestoreDisabledDueToError = true;
              console.warn('Firestore sync disabled due to NOT_FOUND database. Please verify your Firestore Database ID.');
            } else {
              console.error('Firestore user sync error:', error);
            }
          });
      }
      
      // Also update admin panel (only send the updated user, not all users)
      io.to('admin-room').emit('admin-user-updated', {
        ...user,
        trades,
        extraAccounts
      });
    }
  };

  // Helper to emit an event to all connected sockets of a specific user
  const emitToUser = (email: string, event: string, data?: any) => {
    const socketIds = Object.keys(connectedUsers).filter(id => connectedUsers[id].email === email);
    socketIds.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  };

  const sendNotification = (email: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    try {
      const id = Math.random().toString(36).substring(2, 11);
      const timestamp = Date.now();
      
      db.prepare('INSERT INTO notifications (id, email, title, message, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, email, title, message, type, timestamp);
      
      const newNotification = { id, email, title, message, type, timestamp, isRead: 0 };
      emitToUser(email, 'new-notification', newNotification);
      
      // Update admin list
      const allNotifications = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100').all();
      io.to('admin-room').emit('admin-notifications', allNotifications);
      
      return newNotification;
    } catch (error) {
      console.error('sendNotification Error:', error);
      return null;
    }
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // --- Market Simulation Engine (Server-Side) ---
  const assets: Record<string, { 
    price: number, 
    volatility: number, 
    trend: number, 
    isFrozen?: boolean, 
    targetPrice?: number | null, 
    winPercentage?: number, 
    payout?: number,
    isRealMarket?: boolean,
    isOTC?: boolean,
    baseMarketPrice?: number
  }> = {
    'BTC/USD': { price: 65000.00, volatility: 25.0, trend: 0, winPercentage: 50, payout: 90 },
    'ETH/USD': { price: 3500.00, volatility: 1.5, trend: 0, winPercentage: 50, payout: 90 },
    'SOL/USD': { price: 150.00, volatility: 0.15, trend: 0, winPercentage: 50, payout: 90 },
    'DOGE/USD': { price: 0.15, volatility: 0.001, trend: 0, winPercentage: 50, payout: 90 },
    'EUR/USD': { price: 1.0800, volatility: 0.00005, trend: 0, winPercentage: 50, payout: 85 },
    'GBP/USD': { price: 1.2500, volatility: 0.00006, trend: 0, winPercentage: 50, payout: 85 },
    'USD/JPY': { price: 155.00, volatility: 0.01, trend: 0, winPercentage: 50, payout: 85 },
    'USD/CAD': { price: 1.3500, volatility: 0.00005, trend: 0, winPercentage: 50, payout: 85 },
    'GBP/JPY': { price: 195.50, volatility: 0.012, trend: 0, winPercentage: 50, payout: 85 },
    'EUR/JPY': { price: 168.00, volatility: 0.01, trend: 0, winPercentage: 50, payout: 85 },
    'AUD/JPY': { price: 101.50, volatility: 0.01, trend: 0, winPercentage: 50, payout: 82 },
    'GOLD': { price: 2300.00, volatility: 0.15, trend: 0, winPercentage: 50, payout: 85 },
    'OIL': { price: 80.00, volatility: 0.02, trend: 0, winPercentage: 50, payout: 80 },
    'AAPL': { price: 175.00, volatility: 0.1, trend: 0, winPercentage: 50, payout: 90 },
    'NVDA': { price: 900.00, volatility: 0.5, trend: 0, winPercentage: 50, payout: 90 },
    'TSLA': { price: 180.00, volatility: 0.2, trend: 0, winPercentage: 50, payout: 90 },
    'EUR/USD OTC': { price: 1.0850, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'GBP/USD OTC': { price: 1.2550, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'AUD/USD OTC': { price: 0.6650, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'NZD/USD OTC': { price: 0.6050, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'USD/CHF OTC': { price: 0.9050, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'USD/JPY OTC': { price: 155.50, volatility: 0.015, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'USD/CAD OTC': { price: 1.3550, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'EUR/GBP OTC': { price: 0.8650, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'EUR/JPY OTC': { price: 168.50, volatility: 0.015, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'GBP/JPY OTC': { price: 196.50, volatility: 0.018, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'AUD/JPY OTC': { price: 102.50, volatility: 0.012, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'NZD/JPY OTC': { price: 93.50, volatility: 0.012, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'EUR/AUD OTC': { price: 1.6350, volatility: 0.00012, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'EUR/CAD OTC': { price: 1.4750, volatility: 0.00012, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'GBP/CAD OTC': { price: 1.7150, volatility: 0.00012, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'AUD/CAD OTC': { price: 0.9050, volatility: 0.0001, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'USD/NOK OTC': { price: 10.8500, volatility: 0.0008, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'USD/SEK OTC': { price: 10.7500, volatility: 0.0008, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'USD/SGD OTC': { price: 1.3550, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'EUR/CHF OTC': { price: 0.9750, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'GBP/CHF OTC': { price: 1.1350, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'AUD/CHF OTC': { price: 0.5950, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'CAD/CHF OTC': { price: 0.6650, volatility: 0.00008, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'GOLD OTC': { price: 2310.00, volatility: 0.18, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'OIL OTC': { price: 81.00, volatility: 0.025, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'SILVER OTC': { price: 28.50, volatility: 0.005, trend: 0, winPercentage: 50, payout: 88, isOTC: true },
    'COPPER OTC': { price: 4.50, volatility: 0.002, trend: 0, winPercentage: 50, payout: 85, isOTC: true },
    'CRYPTO INDEX': { price: 2500.00, volatility: 1.2, trend: 0, winPercentage: 50, payout: 90, isOTC: true },
    'ALTCOIN INDEX': { price: 1200.00, volatility: 1.8, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'DEFI INDEX': { price: 850.00, volatility: 2.5, trend: 0, winPercentage: 50, payout: 92, isOTC: true },
    'AMZN': { price: 185.00, volatility: 0.12, trend: 0, winPercentage: 50, payout: 90 },
    'GOOGL': { price: 170.00, volatility: 0.1, trend: 0, winPercentage: 50, payout: 90 },
    'META': { price: 480.00, volatility: 0.3, trend: 0, winPercentage: 50, payout: 90 },
    'MSFT': { price: 410.00, volatility: 0.25, trend: 0, winPercentage: 50, payout: 90 },
    'NFLX': { price: 620.00, volatility: 0.4, trend: 0, winPercentage: 50, payout: 90 },
    'AMD': { price: 160.00, volatility: 0.35, trend: 0, winPercentage: 50, payout: 88 },
    'INTC': { price: 35.00, volatility: 0.08, trend: 0, winPercentage: 50, payout: 85 },
    'BABA': { price: 75.00, volatility: 0.15, trend: 0, winPercentage: 50, payout: 85 },
    'PYPL': { price: 65.00, volatility: 0.18, trend: 0, winPercentage: 50, payout: 85 },
  };

  // --- Binance WebSocket Integration ---
  const binanceCryptoPairs = [
    { symbol: 'BTC/USD', binanceSymbol: 'btcusdt' },
    { symbol: 'ETH/USD', binanceSymbol: 'ethusdt' },
    { symbol: 'BNB/USD', binanceSymbol: 'bnbusdt' },
    { symbol: 'SOL/USD', binanceSymbol: 'solusdt' },
    { symbol: 'XRP/USD', binanceSymbol: 'xrpusdt' },
    { symbol: 'DOGE/USD', binanceSymbol: 'dogeusdt' },
    { symbol: 'ADA/USD', binanceSymbol: 'adausdt' },
    { symbol: 'DOT/USD', binanceSymbol: 'dotusdt' },
    { symbol: 'LINK/USD', binanceSymbol: 'linkusdt' },
    { symbol: 'MATIC/USD', binanceSymbol: 'maticusdt' },
    { symbol: 'UNI/USD', binanceSymbol: 'uniusdt' }
  ];

  const binanceForexPairs = [
    { symbol: 'EUR/USD', binanceSymbol: 'eurusdt' },
    { symbol: 'GBP/USD', binanceSymbol: 'gbpusdt' },
    { symbol: 'AUD/USD', binanceSymbol: 'audusdt' },
    { symbol: 'USD/JPY', binanceSymbol: 'usdtjpy' },
    { symbol: 'USD/CAD', binanceSymbol: 'usdtcad' },
    { symbol: 'GBP/JPY', binanceSymbol: 'gbpjpy' },
    { symbol: 'EUR/JPY', binanceSymbol: 'eurjpy' },
    { symbol: 'AUD/JPY', binanceSymbol: 'audjpy' }
  ];

  const coinbaseCryptoPairs = [
    { symbol: 'BTC/USD', coinbaseSymbol: 'BTC-USD' },
    { symbol: 'ETH/USD', coinbaseSymbol: 'ETH-USD' },
    { symbol: 'BNB/USD', coinbaseSymbol: 'BNB-USD' },
    { symbol: 'SOL/USD', coinbaseSymbol: 'SOL-USD' },
    { symbol: 'XRP/USD', coinbaseSymbol: 'XRP-USD' },
    { symbol: 'DOGE/USD', coinbaseSymbol: 'DOGE-USD' },
    { symbol: 'ADA/USD', coinbaseSymbol: 'ADA-USD' },
    { symbol: 'DOT/USD', coinbaseSymbol: 'DOT-USD' },
    { symbol: 'LINK/USD', coinbaseSymbol: 'LINK-USD' },
    { symbol: 'MATIC/USD', coinbaseSymbol: 'MATIC-USD' },
    { symbol: 'UNI/USD', coinbaseSymbol: 'UNI-USD' }
  ];

  // Store historical ticks (last 1 hour = 3600 ticks)
  const history: Record<string, any[]> = {};
  Object.keys(assets).forEach(symbol => {
    history[symbol] = [];
    const isCrypto = binanceCryptoPairs.some(p => p.symbol === symbol) || coinbaseCryptoPairs.some(p => p.symbol === symbol);
    const isBinanceForex = binanceForexPairs.some(p => p.symbol === symbol);
    const isForex = symbol.includes('/') && !symbol.includes('BTC') && !symbol.includes('ETH') && !symbol.includes('OTC');
    const isStock = ['AAPL', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'MSFT', 'NFLX', 'AMD', 'INTC', 'BABA', 'PYPL'].includes(symbol);
    
    if (isCrypto || isBinanceForex || isForex || isStock) {
      assets[symbol as keyof typeof assets].isRealMarket = true;
    }
  });

  // Track active trades for admin panel
  const activeTrades: Record<string, any> = {};
  
  // Track connected users for admin panel
  const connectedUsers: Record<string, any> = {};

  const initBinanceWS = () => {
    console.log('Initializing Binance WebSocket...');
    const cryptoStreams = binanceCryptoPairs.map(p => `${p.binanceSymbol}@ticker`);
    const forexStreams = binanceForexPairs.map(p => `${p.binanceSymbol}@ticker`);
    const allStreams = [...cryptoStreams, ...forexStreams].join('/');
    
    const ws = new WebSocket(`wss://stream.binance.com:443/stream?streams=${allStreams}`);

    ws.on('open', () => {
      console.log('Connected to Binance Combined Stream (Crypto + Forex)');
    });

    ws.on('message', (data: any) => {
      try {
        const rawMsg = JSON.parse(data);
        const msg = rawMsg.data || rawMsg; 
        
        const symbol = (msg.s || '').toLowerCase();
        const pair = [...binanceCryptoPairs, ...binanceForexPairs].find(p => p.binanceSymbol === symbol);
        
        if (pair && assets[pair.symbol as keyof typeof assets]) {
          const asset = assets[pair.symbol as keyof typeof assets];
          const newPrice = parseFloat(msg.c);
          
          if (!isNaN(newPrice) && !asset.isFrozen) {
            const now = Date.now();
            asset.price = newPrice;
            (asset as any).lastRealUpdate = now;
            (asset as any).priceSource = 'Binance';
          }
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      setTimeout(initBinanceWS, 5000);
    });
    ws.on('error', () => {});
  };

  const initCoinbaseWS = () => {
    console.log('Initializing Coinbase WebSocket...');
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    
    ws.on('open', () => {
      console.log('Connected to Coinbase Stream');
      const subscribeMsg = {
        type: 'subscribe',
        product_ids: coinbaseCryptoPairs.map(p => p.coinbaseSymbol),
        channels: ['ticker']
      };
      ws.send(JSON.stringify(subscribeMsg));
    });

    ws.on('message', (data: any) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'ticker' && msg.price) {
          const pair = coinbaseCryptoPairs.find(p => p.coinbaseSymbol === msg.product_id);
          if (pair && assets[pair.symbol as keyof typeof assets]) {
            const asset = assets[pair.symbol as keyof typeof assets];
            const newPrice = parseFloat(msg.price);
            
            // Only update if Binance hasn't updated recently (Binance is preferred if both active)
            const now = Date.now();
            const lastUpdate = (asset as any).lastRealUpdate || 0;
            if (now - lastUpdate > 500 || (asset as any).priceSource !== 'Binance') {
              asset.price = newPrice;
              (asset as any).lastRealUpdate = now;
              (asset as any).priceSource = 'Coinbase';
            }
          }
        }
      } catch (e) {}
    });

    ws.on('close', () => {
      setTimeout(initCoinbaseWS, 5000);
    });
    ws.on('error', () => {});
  };

  // REST Fallback for Prices
  const priceRestFallback = async () => {
    try {
      // Binance Fallback
      const allBinanceSymbols = [...binanceCryptoPairs, ...binanceForexPairs].map(p => `"${p.binanceSymbol.toUpperCase()}"`).join(',');
      const encodedSymbols = encodeURIComponent(`[${allBinanceSymbols}]`);
      
      const mirrors = [
        'https://api.binance.com',
        'https://api1.binance.com',
        'https://api2.binance.com',
        'https://api3.binance.com'
      ];
      
      let bResp = null;
      for (const mirror of mirrors) {
        try {
          const resp = await fetch(`${mirror}/api/v3/ticker/price?symbols=${encodedSymbols}`).catch(() => null);
          if (resp && resp.ok) {
            bResp = resp;
            break;
          }
        } catch (e) {}
      }
      if (bResp && bResp.ok) {
        const data = await bResp.json() as any[];
        const now = Date.now();
        data.forEach(item => {
          const pair = [...binanceCryptoPairs, ...binanceForexPairs].find(p => p.binanceSymbol.toUpperCase() === item.symbol);
          if (pair && assets[pair.symbol]) {
            const asset = assets[pair.symbol];
            const lastUpdate = (asset as any).lastRealUpdate || 0;
            if (now - lastUpdate > 5000) {
              asset.price = parseFloat(item.price);
              (asset as any).lastRealUpdate = now;
              (asset as any).priceSource = 'Binance-REST';
            }
          }
        });
      }

      // Forex Fallback (Simple update base rates)
      const fResp = await fetch('https://api.exchangerate-api.com/v4/latest/USD').catch(() => null);
      if (fResp && fResp.ok) {
        const data = await fResp.json() as any;
        const rates = data.rates;
        const now = Date.now();
        
        Object.keys(assets).forEach(symbol => {
          const isBinanceForex = binanceForexPairs.some(p => p.symbol === symbol);
          if (!isBinanceForex && symbol.includes('/') && !symbol.includes('BTC') && !symbol.includes('ETH') && !symbol.includes('OTC')) {
             const parts = symbol.split('/');
             if (parts.length === 2) {
               const base = parts[0];
               const quote = parts[1];
               if (rates[base] && rates[quote]) {
                 const newPrice = rates[quote] / rates[base];
                 const asset = assets[symbol];
                 if (asset) {
                   // Slow update for Forex to maintain simulation jitter
                   asset.baseMarketPrice = newPrice;
                   (asset as any).lastForexUpdate = now;
                 }
               }
             }
          }
        });
      }
    } catch (e) {}
  };

  setInterval(priceRestFallback, 10000);
  initBinanceWS();
  initCoinbaseWS();
  // --- End Price Integration ---

  // Global Trade Automation Settings
  let globalTradeSettings = {
    mode: 'FAIR', // 'FAIR', 'FORCE_LOSS', 'FORCE_WIN', 'PERCENTAGE', 'SMART'
    winPercentage: 50,
    payoutPercentage: 90,
    smartThreshold: 10 // Default $10 threshold for SMART mode
  };

  let globalDepositSettings = {
    bkashNumbers: ['01712-345678'],
    nagadNumbers: ['01712-345678'],
    rocketNumbers: ['01712-345678'],
    upayNumbers: ['01712-345678'],
    binancePayId: '123456789',
    binancePayQrCode: '',
    paypalEmail: 'payments@onyxtrade.com',
    netellerEmail: 'payments@onyxtrade.com',
    skrillEmail: 'payments@onyxtrade.com',
    usdtTrc20Address: 'Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdtBep20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    ethErc20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdcErc20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdcBep20Address: '0xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    btcAddress: '1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    bankCardDetails: 'Bank: Onyx Bank, Account: 1234567890, Branch: Main',
    onyxOptionPayNumbers: ['01712-345678'],
    hamprooPayNumbers: ['01712-345678'],
    upiId: 'onyxtrade@upi',
    perfectMoneyAccount: 'U12345678',
    advcashEmail: 'payments@onyxtrade.com',
    payeerAccount: 'P12345678',
    webmoneyWmz: 'Z123456789012',
    ltcAddress: 'Lxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    xrpAddress: 'rxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    xlmAddress: 'Gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    dogeAddress: 'Dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    usdtTonAddress: 'UQxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    enabledMethods: [
      'bkash_p2c', 'nagad_p2c', 'rocket_p2c', 'upay_p2c', 
      'binance_pay', 'usdt_trc20', 'usdt_bep20', 'bitcoin',
      'bank_card', 'skrill', 'xrp', 'usdt_ton', 'usdc_erc20', 'usdc_bep20', 'ethereum', 'litecoin',
      'paypal', 'neteller', 'upi', 'perfect_money', 'advcash', 'payeer', 'webmoney', 'stellar', 'dogecoin',
      'onyx_option_pay', 'hamproo_pay'
    ],
    exchangeRate: 120,
    depositNote: 'Ensure you include your account ID in the reference if required. Deposits usually reflect within 5-15 minutes.',
    minDepositForBonus: 50,
    bonusPercentage: 10,
    turnoverMultiplier: 3,
    methodLogos: {} as Record<string, string>
  };

  let globalPlatformSettings: {
    isTradingEnabled: boolean;
    isDepositsEnabled: boolean;
    isWithdrawalsEnabled: boolean;
    isChatEnabled: boolean;
    maintenanceMode: boolean;
    minWithdrawalAmount: number;
    minWithdrawalLimits?: Record<string, number>;
  } = {
    isTradingEnabled: true,
    isDepositsEnabled: true,
    isWithdrawalsEnabled: true,
    isChatEnabled: true,
    maintenanceMode: false,
    minWithdrawalAmount: 10,
    minWithdrawalLimits: {}
  };

  // Load trade settings from DB
  const savedSettings = db.prepare('SELECT value FROM settings WHERE key = ?').get('trade_settings') as any;
  if (savedSettings) {
    globalTradeSettings = JSON.parse(savedSettings.value);
  }

  const savedAssetSettings = db.prepare('SELECT value FROM settings WHERE key = ?').get('asset_settings') as any;
  if (savedAssetSettings) {
    const parsed = JSON.parse(savedAssetSettings.value);
    Object.keys(parsed).forEach(symbol => {
      if (assets[symbol]) {
        assets[symbol] = { ...assets[symbol], ...parsed[symbol] };
      }
    });
  }

  let globalReferralSettings = {
    bonusAmount: 10, // Fixed bonus for referrer
    referralPercentage: 20, // Percentage of first deposit
    minDepositForBonus: 20,
    minWithdrawal: 10
  };

  const savedDepositSettings = db.prepare('SELECT value FROM settings WHERE key = ?').get('deposit_settings') as any;
  if (savedDepositSettings) {
    globalDepositSettings = { ...globalDepositSettings, ...JSON.parse(savedDepositSettings.value) };
  }

  const savedPlatformSettings = db.prepare('SELECT value FROM settings WHERE key = ?').get('platform_settings') as any;
  if (savedPlatformSettings) {
    globalPlatformSettings = { ...globalPlatformSettings, ...JSON.parse(savedPlatformSettings.value) };
  }

  const savedReferralSettings = db.prepare('SELECT value FROM settings WHERE key = ?').get('referral_settings') as any;
  if (savedReferralSettings) {
    globalReferralSettings = { ...globalReferralSettings, ...JSON.parse(savedReferralSettings.value) };
  }

  const saveTradeSettings = (settings: any) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('trade_settings', JSON.stringify(settings));
  };

  const saveAssetSettings = () => {
    const toSave: Record<string, any> = {};
    Object.keys(assets).forEach(symbol => {
      toSave[symbol] = { winPercentage: assets[symbol].winPercentage, payout: assets[symbol].payout, volatility: assets[symbol].volatility };
    });
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('asset_settings', JSON.stringify(toSave));
  };

  const saveDepositSettings = (settings: any) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('deposit_settings', JSON.stringify(settings));
  };

  const savePlatformSettings = (settings: any) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('platform_settings', JSON.stringify(settings));
  };

  const saveReferralSettings = (settings: any) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('referral_settings', JSON.stringify(settings));
  };

  const logActivity = (email: string, action: string, details: string = '', ip: string = '') => {
    try {
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'").get();
      if (!tableExists) return;

      db.prepare('INSERT INTO activity_logs (email, action, details, timestamp, ip) VALUES (?, ?, ?, ?, ?)')
        .run(email, action, details, Date.now(), ip);
    } catch (error) {
      console.error('Activity Logging Error:', error);
    }
  };

  // Platform Financial Statistics
  const today = new Date().toISOString().split('T')[0];
  let platformStats = {
    totalTrades: 0,
    totalVolume: 0,
    totalProfit: 0, // Profit for users
    totalLoss: 0,   // Loss for users (Profit for platform)
    netPlatformProfit: 0,
    dailyStats: {
      trades: 0,
      volume: 0,
      profit: 0,
      loss: 0
    }
  };

  // Load stats from DB
  const loadStats = () => {
    const allTime = db.prepare('SELECT SUM(total_trades) as trades, SUM(total_volume) as volume, SUM(total_user_profit) as profit, SUM(total_user_loss) as loss FROM trade_stats').get() as any;
    const daily = db.prepare('SELECT * FROM trade_stats WHERE date = ?').get(today) as any;

    if (allTime && allTime.trades !== null) {
      platformStats.totalTrades = allTime.trades;
      platformStats.totalVolume = allTime.volume;
      platformStats.totalProfit = allTime.profit;
      platformStats.totalLoss = allTime.loss;
      platformStats.netPlatformProfit = allTime.loss - allTime.profit;
    }

    if (daily) {
      platformStats.dailyStats = {
        trades: daily.total_trades,
        volume: daily.total_volume,
        profit: daily.total_user_profit,
        loss: daily.total_user_loss
      };
    } else {
      // Initialize today's stats in DB
      db.prepare('INSERT OR IGNORE INTO trade_stats (date) VALUES (?)').run(today);
    }
  };
  loadStats();

  const saveTradeToStats = (amount: number, userProfit: number, isWin: boolean, accountType: string, email: string) => {
    if (accountType !== 'REAL') return; // Only track real balance trades as requested
    
    const userLoss = isWin ? 0 : amount;
    const net = userLoss - userProfit;

    db.prepare(`
      UPDATE trade_stats 
      SET total_trades = total_trades + 1,
          total_volume = total_volume + ?,
          total_user_profit = total_user_profit + ?,
          total_user_loss = total_user_loss + ?,
          house_net = house_net + ?
      WHERE date = ?
    `).run(amount, userProfit, userLoss, net, today);

    // Update user turnover
    db.prepare('UPDATE users SET turnover_achieved = turnover_achieved + ? WHERE email = ?').run(amount, email);
    
    loadStats(); // Reload into memory
  };

  // Use a dedicated function for resolution to allow reuse
  const resolveTrade = (tradeId: string) => {
    console.log(`resolveTrade called for trade: ${tradeId}`);
    try {
      const activeTrade = activeTrades[tradeId];
      if (!activeTrade) {
        console.log(`resolveTrade: Trade ${tradeId} not found in activeTrades.`);
        return;
      }

      const email = activeTrade.userEmail || activeTrade.email;
      if (!email) {
        console.error(`resolveTrade: email is missing for trade ${tradeId}`);
        delete activeTrades[tradeId];
        return;
      }
      console.log(`resolveTrade: Processing trade ${tradeId} for user ${email}`);

      const assetKey = activeTrade.assetShortName || activeTrade.asset;
      const currentPrice = assets[assetKey as keyof typeof assets]?.price || activeTrade.entryPrice;
      
      // Check if admin forced a result
      let isWin = false;
      let finalClosePrice = currentPrice;
      
      if (activeTrade.forcedResult) {
        isWin = activeTrade.forcedResult === 'WIN';
        const isUp = activeTrade.type === 'UP';
        const needsUp = (isUp && isWin) || (!isUp && !isWin);
        
        // Ensure final close price is on the correct side with a clear visual distance
        // This avoids "tie" or "barely win/loss" scenarios that look fake
        const volatility = assets[assetKey as keyof typeof assets]?.volatility || 0.001;
        const distinctMargin = volatility * 0.4; // 40% of volatility for a clear, professional visual gap
        
        if (needsUp && finalClosePrice <= activeTrade.entryPrice + (volatility * 0.05)) {
          finalClosePrice = activeTrade.entryPrice + distinctMargin;
        } else if (!needsUp && finalClosePrice >= activeTrade.entryPrice - (volatility * 0.05)) {
          finalClosePrice = activeTrade.entryPrice - distinctMargin;
        }
        
        // Update the asset price to match the forced close price so the chart doesn't jump back
        if (assets[assetKey as keyof typeof assets]) {
           assets[assetKey as keyof typeof assets].price = finalClosePrice;
        }
      } else {
        isWin = activeTrade.type === 'UP' 
          ? currentPrice > activeTrade.entryPrice 
          : currentPrice < activeTrade.entryPrice;
      }
      
      const isDraw = !isWin && finalClosePrice === activeTrade.entryPrice;
      const payout = parseFloat(activeTrade.payout) || 80; // Default to 80% if missing
      const profit = isWin ? activeTrade.amount * (payout / 100) : (isDraw ? 0 : -activeTrade.amount);
      
      // Add profit to balance
      if (isWin) {
      if (activeTrade.accountType === 'REAL') {
        const realAmount = activeTrade.realAmount || 0;
        const bonusAmount = activeTrade.bonusAmount || 0;
        const totalAmount = realAmount + bonusAmount;
        
        // Proportional profit distribution
        const realProfit = profit * (realAmount / totalAmount);
        const bonusProfit = profit * (bonusAmount / totalAmount);
        
        const realReturn = realAmount + realProfit;
        const bonusReturn = bonusAmount + bonusProfit;
        
        db.prepare('UPDATE users SET balance = balance + ?, bonus_balance = bonus_balance + ? WHERE email = ?')
          .run(realReturn, bonusReturn, email);
      } else if (activeTrade.accountType === 'DEMO') {
        const totalReturn = activeTrade.amount + profit;
        db.prepare('UPDATE users SET demoBalance = demoBalance + ? WHERE email = ?').run(totalReturn, email);
      } else {
        // Handle extra accounts
        const totalReturn = activeTrade.amount + profit;
        const user = db.prepare('SELECT extraAccounts FROM users WHERE email = ?').get(email) as any;
        if (user) {
          let extraAccounts = [];
          try {
            extraAccounts = typeof user.extraAccounts === 'string' ? JSON.parse(user.extraAccounts) : (user.extraAccounts || []);
          } catch (e) {
            extraAccounts = [];
          }
          
          let updated = false;
          extraAccounts = extraAccounts.map((acc: any) => {
            if (acc.id === activeTrade.accountType) {
              updated = true;
              return { ...acc, balance: acc.balance + totalReturn };
            }
            return acc;
          });
          
          if (updated) {
            db.prepare('UPDATE users SET extraAccounts = ? WHERE email = ?').run(JSON.stringify(extraAccounts), email);
          }
        }
      }
    } else if (isDraw) {
      // Return investment on DRAW
      if (activeTrade.accountType === 'REAL') {
        const realAmount = activeTrade.realAmount || 0;
        const bonusAmount = activeTrade.bonusAmount || 0;
        db.prepare('UPDATE users SET balance = balance + ?, bonus_balance = bonus_balance + ? WHERE email = ?')
          .run(realAmount, bonusAmount, email);
      } else if (activeTrade.accountType === 'DEMO') {
        db.prepare('UPDATE users SET demoBalance = demoBalance + ? WHERE email = ?').run(activeTrade.amount, email);
      } else {
        const user = db.prepare('SELECT extraAccounts FROM users WHERE email = ?').get(email) as any;
        if (user) {
          let extraAccounts = [];
          try {
            extraAccounts = typeof user.extraAccounts === 'string' ? JSON.parse(user.extraAccounts) : (user.extraAccounts || []);
          } catch (e) {
            extraAccounts = [];
          }
          let updated = false;
          extraAccounts = extraAccounts.map((acc: any) => {
            if (acc.id === activeTrade.accountType) {
              updated = true;
              return { ...acc, balance: acc.balance + activeTrade.amount };
            }
            return acc;
          });
          if (updated) {
            db.prepare('UPDATE users SET extraAccounts = ? WHERE email = ?').run(JSON.stringify(extraAccounts), email);
          }
        }
      }
    }
    
    // Update Firestore after adding profit
    if (canSyncFirestore() && (activeTrade.accountType === 'REAL' || activeTrade.accountType === 'DEMO')) {
        const updatedUser = db.prepare('SELECT balance, bonus_balance, demoBalance, uid FROM users WHERE email = ?').get(email) as any;
        if (updatedUser) {
          const updateData = activeTrade.accountType === 'REAL' 
            ? { balance: updatedUser.balance, bonus_balance: updatedUser.bonus_balance } 
            : { demoBalance: updatedUser.demoBalance };
          firestore.collection('users').doc(updatedUser.uid).set(updateData, { merge: true })
            .catch((e: any) => {
               if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                  firestoreDisabledDueToError = true;
               } else {
                  console.error('Firestore user balance update error (trade win):', e);
               }
            });
        }
    }
    
    // Update Platform Stats in DB (Live Balance only)
    saveTradeToStats(activeTrade.amount, profit, isWin, activeTrade.accountType, email);

    // Broadcast stats to admin
    io.to('admin-room').emit('admin-stats', platformStats);

    emitToUser(email, 'trade-result', {
      id: activeTrade.id,
      status: isWin ? 'WIN' : 'LOSS',
      closePrice: finalClosePrice,
      profit: profit
    });
    
    logActivity(email, 'TRADE_RESULT', `${isWin ? 'WIN' : 'LOSS'} on ${activeTrade.assetShortName} - Profit: ${profit.toFixed(2)}`);

    // Update in DB history
    updateUserTrades(email, { 
      id: activeTrade.id, 
      status: isWin ? 'WIN' : 'LOSS', 
      profit: profit, 
      closePrice: finalClosePrice 
    });

    // --- Referral Commission on Trade Loss ---
    if (!isWin && !isDraw && activeTrade.accountType === 'REAL') {
       const tradeUser = db.prepare('SELECT referredBy, uid, email FROM users WHERE email = ?').get(email) as any;
       if (tradeUser && tradeUser.referredBy) {
          const referrer = db.prepare('SELECT * FROM users WHERE referralCode = ? OR uid = ? OR email = ? OR UPPER(substr(uid, 1, 8)) = UPPER(?)').get(tradeUser.referredBy, tradeUser.referredBy, tradeUser.referredBy, tradeUser.referredBy) as any;
          if (referrer) {
             const tradeCommissionRate = (globalReferralSettings.referralPercentage || 50) / 100;
             const commission = Math.abs(activeTrade.amount) * tradeCommissionRate;
             
             db.prepare('UPDATE users SET referralBalance = referralBalance + ?, totalReferralEarnings = totalReferralEarnings + ? WHERE email = ?')
               .run(commission, commission, referrer.email);
               
             db.prepare('INSERT INTO referrals (referrerUid, referredUid, referredEmail, amount, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
               .run(referrer.uid, tradeUser.uid, email, commission, 'TRADE_LOSS', Date.now());
               
             emitUserUpdate(referrer.email);
          }
       }
    }

    emitUserUpdate(email);

    delete activeTrades[tradeId];
    } catch (error) {
      console.error(`Error resolving trade ${tradeId}:`, error);
      // Ensure we don't get stuck in an infinite loop
      delete activeTrades[tradeId];
    }
  };

  // Load active trades from DB on startup
  const loadActiveTradesFromDB = () => {
    try {
      // Only fetch users who potentially have active trades to save memory
      const allUsers = db.prepare('SELECT email, trades FROM users WHERE trades LIKE \'%"status":"ACTIVE"%\'').all() as any[];
      let activeCount = 0;
      allUsers.forEach(user => {
        let trades = [];
        try {
          trades = typeof user.trades === 'string' ? JSON.parse(user.trades) : (user.trades || []);
        } catch (e) {
          trades = [];
        }

        trades.forEach((trade: any) => {
          if (trade.status === 'ACTIVE') {
            trade.email = user.email; // Ensure email is present
            activeTrades[trade.id] = trade;
            activeCount++;
            
            // Set a timer to resolve the trade if it hasn't expired
            const durationMs = trade.endTime - Date.now();
            if (durationMs > 0) {
              setTimeout(() => resolveTrade(trade.id), durationMs);
            } else {
              // Already expired, resolve immediately
              setTimeout(() => resolveTrade(trade.id), 100);
            }
          }
        });
      });
      console.log(`Loaded ${activeCount} active trades from database.`);
    } catch (error) {
      console.error('Error loading active trades from DB:', error);
    }
  };
  loadActiveTradesFromDB();

  // Global Support & Tutorial Settings
  let globalSupportSettings = {
    telegram: 'https://t.me/onyxtrade_support',
    whatsapp: 'https://wa.me/1234567890',
    email: 'support@onyxtrade.com',
    isChatEnabled: true,
    supportStatus: 'online' as 'online' | 'offline'
  };

  // Referral Settings
  // Deposit & Withdrawal Requests
  let pendingRequests: any[] = [];
  
  // Global Notifications
  let globalNotifications: any[] = [];

  // Global Rewards
  let globalRewards: any[] = [
    {
      id: '1',
      title: '110% Deposit Bonus',
      description: 'Use LUNAR2026 when depositing $10.00+',
      category: 'Promo Code',
      value: 'LUNAR2026',
      badge: '110%',
      icon: 'Gift'
    },
    {
      id: '2',
      title: 'Advanced Status',
      description: 'Use UE5QMQZ0E8 depositing $250.00+',
      category: 'Promo Code',
      value: 'UE5QMQZ0E8',
      badge: 'UP TO 100%',
      icon: 'Zap'
    }
  ];

  let globalTutorials = [
    {
      id: '1',
      title: 'Binary Options Basics',
      description: 'Learn the fundamentals of digital options trading in 5 minutes.',
      link: 'https://youtube.com/watch?v=example1',
      category: 'Beginner',
      duration: '5:20'
    },
    {
      id: '2',
      title: 'Advanced Chart Analysis',
      description: 'Master technical indicators and price action strategies.',
      link: 'https://youtube.com/watch?v=example2',
      category: 'Advanced',
      duration: '12:45'
    }
  ];

  // Generate initial history (24 hours for high resolution) asynchronously
  const now = Date.now();
  const historyDurationMs = 24 * 3600 * 1000;
  const historyTicksCount = 24 * 3600;
  
  console.log('Generating initial market history (24 hours) asynchronously...');
  
  const symbols = Object.keys(assets);
  let currentSymbolIndex = 0;

  const generateNextAssetHistory = () => {
    if (currentSymbolIndex >= symbols.length) {
      console.log('Market history generation complete.');
      return;
    }

    const symbol = symbols[currentSymbolIndex];
    const asset = assets[symbol as keyof typeof assets];
    
    try {
      // Check if we already have history in DB
      const existingHistory = db.prepare('SELECT * FROM market_history WHERE symbol = ? ORDER BY time DESC LIMIT 1').get(symbol) as any;
      
      if (existingHistory && (now - existingHistory.time) < historyDurationMs) {
        // Load existing history (only last 28800 items into memory)
        const rows = db.prepare('SELECT * FROM market_history WHERE symbol = ? ORDER BY time DESC LIMIT 28800').all(symbol) as any[];
        history[symbol] = rows.map(r => ({
          time: r.time,
          price: r.close,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close
        })).reverse();
        
        if (rows.length > 0) {
          asset.price = rows[0].close; // rows[0] is the newest because of DESC
        }
        
        // If there's a gap between last history and now, fill it
        let lastTime = existingHistory.time;
        let currentPrice = existingHistory.close;
        let currentTrend = 0;
        
        let gapSeconds = Math.floor((now - lastTime) / 1000);
        if (gapSeconds > 7 * 24 * 3600) {
          gapSeconds = 7 * 24 * 3600;
          lastTime = now - (gapSeconds * 1000);
        }
        
        if (gapSeconds > 1) {
          const insert = db.prepare('INSERT OR REPLACE INTO market_history (symbol, time, open, high, low, close) VALUES (?, ?, ?, ?, ?, ?)');
          const transaction = db.transaction((symbol, startTime, startPrice, count) => {
            let price = startPrice;
            for (let i = 1; i <= count; i++) {
              const time = startTime + i * 1000;
              
              // Wave-like momentum for "Real Market" feel
              currentTrend += (Math.random() - 0.5) * asset.volatility * 0.2;
              currentTrend += Math.sin(time / 300000) * asset.volatility * 0.05; // 5 min waves
              currentTrend *= 0.98; // Decay
              
              const move = (currentTrend + (Math.random() - 0.5) * asset.volatility * 1.5);
              const open = price;
              price += move;
              const close = price;
              
              // Realistic shadows with "Noise"
              const wickVolatility = asset.volatility * (0.5 + Math.random());
              const high = Math.max(open, close) + Math.random() * wickVolatility;
              const low = Math.min(open, close) - Math.random() * wickVolatility;
              
              insert.run(symbol, time, open, high, low, close);
              history[symbol].push({ time, price: close, open, high, low, close });
              if (history[symbol].length > 28800) history[symbol].shift();
            }
            return price;
          });
          asset.price = transaction(symbol, lastTime, currentPrice, gapSeconds);
        }
      } else {
        // Generate new history (30 days)
        let currentPrice = asset.price;
        let currentTrend = 0;
        const insert = db.prepare('INSERT OR REPLACE INTO market_history (symbol, time, open, high, low, close) VALUES (?, ?, ?, ?, ?, ?)');
        
        const transaction = db.transaction((symbol, startTime, startPrice) => {
          let price = startPrice;
          for (let i = historyTicksCount; i >= 0; i--) {
            const time = now - i * 1000;
            
            // Momentum / Waves
            currentTrend += (Math.random() - 0.5) * asset.volatility * 0.2;
            currentTrend += Math.sin(time / 600000) * asset.volatility * 0.1; // 10 min waves
            currentTrend *= 0.98;
            
            const candleTypeRand = Math.random();
            let moveMultiplier = 1.0;
            if (candleTypeRand < 0.15) moveMultiplier = 0.2; // Small candles
            else if (candleTypeRand < 0.3) moveMultiplier = 2.5; // Big "Power" candles
            
            const move = (currentTrend + (Math.random() - 0.5) * asset.volatility * 1.5) * moveMultiplier;
            const open = price;
            price += move;
            const close = price;
            
            const wickVolatility = asset.volatility * (0.4 + Math.random() * 1.2);
            const high = Math.max(open, close) + Math.random() * wickVolatility;
            const low = Math.min(open, close) - Math.random() * wickVolatility;

            insert.run(symbol, time, open, high, low, close);
            if (i <= 28800) {
              history[symbol].push({ time, price: close, open, high, low, close });
            }
          }
          return price;
        });
        asset.price = transaction(symbol, now - historyDurationMs, currentPrice);
      }
    } catch (e) {
      console.error(`Error generating history for ${symbol}:`, e);
    }
    
    currentSymbolIndex++;
    setTimeout(generateNextAssetHistory, 100); // Yield to event loop to prevent blocking server startup
  };

  generateNextAssetHistory();

  // Generate ticks every 200ms for smooth movement
  let tickCounter = 0;
  const insertTick = db.prepare('INSERT OR REPLACE INTO market_history (symbol, time, open, high, low, close) VALUES (?, ?, ?, ?, ?, ?)');
  
  setInterval(() => {
    if (!globalPlatformSettings.isTradingEnabled) return;
    try {
      const now = Date.now();
      const ticks: Record<string, any> = {};
      const isFullSecond = tickCounter % 5 === 0;

      if (tickCounter % 50 === 0) { // Log every 10 seconds
        console.log(`Tick loop running. Active trades: ${Object.keys(activeTrades).length}`);
      }

      // --- Centralized Price Guiding Logic ---
    const assetTargets: Record<string, { target: number | null, trend: number | null, timeRemaining?: number, duration?: number }> = {};
    
    // First, aggregate exposure per asset
    const assetExposure: Record<string, { upAmount: number, downAmount: number, upPayout: number, downPayout: number, upTrades: any[], downTrades: any[] }> = {};

    Object.values(activeTrades).forEach((trade: any) => {
      if (trade.status === 'ACTIVE' && trade.accountType === 'REAL') {
        const assetKey = trade.assetShortName || trade.asset;
        const assetObj = assets[assetKey as keyof typeof assets];
        
        // Ensure no market control for real markets
        if (assetObj && assetObj.isRealMarket) return;

        if (!assetExposure[assetKey]) {
           assetExposure[assetKey] = { upAmount: 0, downAmount: 0, upPayout: 0, downPayout: 0, upTrades: [], downTrades: [] };
        }
        if (trade.type === 'UP') {
           assetExposure[assetKey].upAmount += trade.amount;
           assetExposure[assetKey].upPayout += trade.amount * (1 + trade.payout / 100);
           assetExposure[assetKey].upTrades.push(trade);
        } else {
           assetExposure[assetKey].downAmount += trade.amount;
           assetExposure[assetKey].downPayout += trade.amount * (1 + trade.payout / 100);
           assetExposure[assetKey].downTrades.push(trade);
        }
      }
    });

    Object.keys(assetExposure).forEach(assetKey => {
       const exposure = assetExposure[assetKey];
       const asset = assets[assetKey as keyof typeof assets];
       if (!asset) return;

       let needsUp = false;
       let hasConflict = false;
       let targetPrice = null;

       // Determine outcome based on mode
       if (globalTradeSettings.mode === 'SMART') {
          if (exposure.upPayout > 0 || exposure.downPayout > 0) {
             // Simply favor the side that pays out less to the house
             if (exposure.upPayout > exposure.downPayout) {
                needsUp = false; // Down wins
             } else if (exposure.downPayout > exposure.upPayout) {
                needsUp = true; // Up wins
             } else {
                needsUp = Math.random() > 0.5;
             }
          }
          hasConflict = true;
       } else if (globalTradeSettings.mode === 'FORCE_LOSS') {
          needsUp = exposure.upAmount > 0 ? false : true;
          hasConflict = true;
       } else if (globalTradeSettings.mode === 'FORCE_WIN') {
          needsUp = exposure.upAmount > 0 ? true : false;
          hasConflict = true;
       } else if (exposure.upAmount > 0 && exposure.downAmount > 0) {
          // In FAIR or PERCENTAGE mode with conflict, we still need a direction.
          // If we don't have a specific mode, we default to FAIR (random if no forced results)
          const firstTrade = [...exposure.upTrades, ...exposure.downTrades][0];
          if (firstTrade.forcedResult) {
             needsUp = (firstTrade.type === 'UP' && firstTrade.forcedResult === 'WIN') || (firstTrade.type === 'DOWN' && firstTrade.forcedResult === 'LOSS');
          } else {
             needsUp = Math.random() > 0.5;
          }
       } else if (exposure.upAmount > 0) {
          // Only UP trades
          const trade = exposure.upTrades[0];
          if (trade.forcedResult === 'WIN') needsUp = true;
          else needsUp = false;
       } else if (exposure.downAmount > 0) {
          // Only DOWN trades
          const trade = exposure.downTrades[0];
          if (trade.forcedResult === 'WIN') needsUp = false;
          else needsUp = true;
       } else {
          return; // No real trades
       }

       const safeMargin = asset.volatility * 0.2; // Reduced further to avoid big candles
       
       // Find the most extreme entry price we need to beat and the minimum time remaining
       let basePrice = asset.price;
       let minTimeRemaining = Infinity;
       const allTrades = [...exposure.upTrades, ...exposure.downTrades];
       if (allTrades.length > 0) {
           // Use the entry price of the first trade in the batch as the base
           allTrades.sort((a, b) => a.startTime - b.startTime);
           basePrice = allTrades[0].entryPrice;
           if (isNaN(basePrice)) basePrice = asset.price;
           
           allTrades.forEach(t => {
              const tr = t.endTime - now;
              if (tr > 0 && tr < minTimeRemaining) minTimeRemaining = tr;
           });
       }

       targetPrice = basePrice + (needsUp ? safeMargin : -safeMargin) * (0.8 + Math.random() * 0.4);
       if (isNaN(targetPrice)) targetPrice = asset.price;

       assetTargets[assetKey] = {
          target: targetPrice,
          trend: needsUp ? 1 : -1,
          timeRemaining: minTimeRemaining === Infinity ? 10000 : minTimeRemaining,
          duration: 60000
       };
       
       // Update forcedResults of trades to match the new reality so resolveTrade doesn't jump the price back
       if (hasConflict) {
          exposure.upTrades.forEach(t => {
             t.forcedResult = needsUp ? 'WIN' : 'LOSS';
          });
          exposure.downTrades.forEach(t => {
             t.forcedResult = needsUp ? 'LOSS' : 'WIN';
          });
       }
    });

    Object.keys(assets).forEach(symbol => {
      const asset = assets[symbol as keyof typeof assets];
      
      let drift = 0;
      if (assetTargets[symbol]) {
        const targetInfo = assetTargets[symbol];
        const currentPrice = asset.price;
        const diff = targetInfo.target! - currentPrice;
        
        // Only apply drift if we are on the wrong side or not far enough into the safe zone
        const needsUp = targetInfo.trend! > 0;
        const isSafe = needsUp ? currentPrice > targetInfo.target! : currentPrice < targetInfo.target!;
        
        // Start nudging halfway through the trade duration for a professional experience
        const nudgeStartThreshold = (targetInfo.duration || 60000) * 0.5;
        
        if (!isSafe && targetInfo.timeRemaining! <= nudgeStartThreshold) {
           const progress = 1 - (targetInfo.timeRemaining! / nudgeStartThreshold);
           
           // Aim for a "safe buffer" instead of just crossing the line, 
           // so the price stays on the correct side for the last ~15 seconds naturally.
           const targetBuffer = asset.volatility * 0.4;
           const adjustedDiff = needsUp ? (targetInfo.target! + targetBuffer - currentPrice) : (targetInfo.target! - targetBuffer - currentPrice);

           // Smoother cubic progress
           const nudgingIntensity = Math.pow(progress, 2) * 1.5; 
           
           // Calculate drift to bridge the gap smoothly over the remaining time
           const ticksRemaining = Math.max(5, targetInfo.timeRemaining! / 200);
           drift = (adjustedDiff / ticksRemaining) * Math.min(1.5, nudgingIntensity);
           
           if (isNaN(drift)) drift = 0;
           
           // Cap the drift to maintain natural candle shapes
           const maxDrift = asset.volatility * 0.4;
           if (drift > maxDrift) drift = maxDrift;
           if (drift < -maxDrift) drift = -maxDrift;
        }
      }

      let newPrice = asset.price;
      if (isNaN(newPrice)) newPrice = 1.0; // Fallback
      if (isNaN(asset.trend)) asset.trend = 0;
      
      if (!asset.isFrozen) {
        // Only use strict external price if we have a recent update from a real source
        const lastUpdate = (asset as any).lastRealUpdate || 0;
        const hasLiveSource = (asset.isRealMarket || false) && (now - lastUpdate < 30000);

        if (asset.isRealMarket && hasLiveSource) {
          // STRICTLY follow local asset.price which is updated by WS/REST
          newPrice = asset.price;
        } else {
          // --- Professional Smoother Movement Logic ---
          // Also used as a fallback for "Real Market" assets that don't have a live source
          let move = 0;
          
          // Trend persistence: trends last longer and change more gradually
          asset.trend += (Math.random() - 0.5) * asset.volatility * (asset.isRealMarket ? 0.08 : 0.12); 
          asset.trend *= (asset.isRealMarket ? 0.85 : 0.94); 
          
          const candleTypeRand = Math.random();
          let moveMultiplier = 1.0;
          
          // Occasional sharp movements
          if (candleTypeRand < 0.02) moveMultiplier = 2.2;  
          else if (candleTypeRand < 0.04) moveMultiplier = 0.3; 
          
          // Professional jitter: controlled noise for realistic movement
          const noise = (Math.random() - 0.5) * asset.volatility * (asset.isRealMarket ? 1.5 : 2.0); 
          
          // Only apply drift (manipulation) if it's NOT a real market
          const finalDrift = asset.isRealMarket ? 0 : drift;
          
          // Technical analysis: Occasional reversion if trend gets too high
          if (Math.abs(asset.trend) > asset.volatility * 5) {
            asset.trend *= 0.6;
          }
          
          // Combine the deterministic/directional forces
          let regressionDrift = 0;
          if (asset.baseMarketPrice) {
             const diffFromBase = asset.baseMarketPrice - asset.price;
             // Faster catch-up for real markets that use baseMarketPrice markers
             const catchUpSpeed = asset.isRealMarket ? 0.05 : 0.002;
             regressionDrift = diffFromBase * catchUpSpeed;
             
             const maxRegression = asset.volatility * (asset.isRealMarket ? 1.5 : 0.15);
             if (regressionDrift > maxRegression) regressionDrift = maxRegression;
             if (regressionDrift < -maxRegression) regressionDrift = -maxRegression;
          }

          let directionalForce = (asset.trend + finalDrift + regressionDrift) * moveMultiplier;
          
          // Cap the directional force so it never completely overwhelms the random noise
          const maxDirectional = asset.volatility * 0.3;
          if (directionalForce > maxDirectional) directionalForce = maxDirectional;
          if (directionalForce < -maxDirectional) directionalForce = -maxDirectional;

          // The final move combines trend momentum with controlled noise
          move = directionalForce + noise;
          
          // Technical analysis: Occasional reversion if trend gets too high
          if (Math.abs(asset.trend) > asset.volatility * 5) {
            asset.trend *= 0.6;
          }

          // Prevent static price by adding a minimum movement floor
          if (Math.abs(move) < asset.volatility * 0.01) {
            move = (Math.random() > 0.5 ? 1 : -1) * asset.volatility * 0.15;
          }
          
          // Absolute safety limit on per-tick movement
          const maxMovePerTick = asset.volatility * 0.8;
          if (move > maxMovePerTick) move = maxMovePerTick;
          if (move < -maxMovePerTick) move = -maxMovePerTick;
          
          newPrice += move;

          // --- Gap Up / Gap Down Logic ---
          if (isFullSecond && Math.random() < 0.005) { 
            const gapDirection = Math.random() > 0.5 ? 1 : -1;
            const gapSize = (Math.random() * 1.5 + 0.5) * asset.volatility; 
            newPrice += gapDirection * gapSize;
          }
        }
      }
      
      const tick = {
        time: now,
        price: newPrice,
        open: asset.price,
        high: Math.max(asset.price, newPrice) + (isFullSecond ? Math.random() * asset.volatility * 0.7 : 0),
        low: Math.min(asset.price, newPrice) - (isFullSecond ? Math.random() * asset.volatility * 0.7 : 0),
        close: newPrice,
        isFrozen: asset.isFrozen
      };
      
      ticks[symbol] = tick;
      
      // Only push to history every 1 second to keep it consistent
      if (isFullSecond) {
        history[symbol].push(tick);
        insertTick.run(symbol, Math.floor(now / 1000) * 1000, tick.open, tick.high, tick.low, tick.close);
        
        // Keep up to 8 hours of history in memory (28800 seconds)
        if (history[symbol].length > 28800) {
          history[symbol].shift(); 
        }

        // Prune DB history every 1000 ticks (approx 16 mins) to keep last 30 days
        if (tickCounter % 1000 === 0) {
          const thirtyDaysAgo = now - (30 * 24 * 3600 * 1000);
          db.prepare('DELETE FROM market_history WHERE time < ?').run(thirtyDaysAgo);
        }
      }
      
      asset.price = newPrice;
    });

    // Broadcast to all connected clients
    io.emit('market-tick', ticks);
    
    // --- Resolve Expired Trades ---
    Object.keys(activeTrades).forEach(tradeId => {
      const trade = activeTrades[tradeId];
      if (now >= trade.endTime) {
        console.log(`Tick loop resolving expired trade: ${tradeId}`);
        resolveTrade(tradeId);
      }
    });

    // Broadcast active trades to admin every second
    if (isFullSecond) {
        const realActiveTrades = Object.values(activeTrades).filter((t: any) => t.accountType === 'REAL');
        io.to('admin-room').emit('admin-active-trades', realActiveTrades);
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      }
      
      tickCounter++;
    } catch (error) {
      console.error("Error in tick loop:", error);
    }
  }, 200);

  // Handle Trade Execution
  const handleTradePlacement = (socket: any, trade: any) => {
    const user = connectedUsers[socket.id];
    if (!user) return;

    if (user.status === 'BLOCKED') {
      socket.emit('trade-error', 'Your account has been blocked. Please contact support.');
      return;
    }

    if (!globalPlatformSettings.isTradingEnabled) {
      socket.emit('trade-error', 'Trading is currently disabled for maintenance.');
      return;
    }
    console.log('Trade received:', trade);
    
    // Apply Global Automation Rules
    let forcedResult = null;
    
    if (trade.accountType === 'REAL') {
      if (globalTradeSettings.mode === 'FORCE_LOSS') {
        forcedResult = 'LOSS';
      } else if (globalTradeSettings.mode === 'FORCE_WIN') {
        forcedResult = 'WIN';
      } else if (globalTradeSettings.mode === 'PERCENTAGE') {
        const assetKey = trade.assetShortName || trade.asset;
        const asset = assets[assetKey as keyof typeof assets];
        const winPercentage = asset?.winPercentage !== undefined ? asset.winPercentage : globalTradeSettings.winPercentage;
        
        // Check if there are active trades for this asset in the same direction
        // If so, inherit their forcedResult to ensure consistent outcome for multiple entries
        const existingTrades = Object.values(activeTrades).filter((t: any) => 
          (t.assetShortName || t.asset) === assetKey && 
          t.type === trade.type &&
          t.status === 'ACTIVE' &&
          t.forcedResult
        );

        if (existingTrades.length > 0) {
           forcedResult = existingTrades[0].forcedResult;
        } else {
           const isWin = Math.random() * 100 < winPercentage;
           forcedResult = isWin ? 'WIN' : 'LOSS';
        }
      }
    }

    const email = trade.userEmail || trade.email || user.email;
    if (!email) {
      console.error('place-trade: userEmail is missing in trade object');
      socket.emit('trade-error', 'User email is missing.');
      return;
    }

    // Validate and deduct balance
    const userFromDb = db.prepare('SELECT balance, bonus_balance, turnover_achieved, uid, trades FROM users WHERE email = ?').get(email) as any;
    if (!userFromDb) {
      console.error(`place-trade: user not found for email ${email}`);
      socket.emit('trade-error', 'User not found.');
      return;
    }

    // Check if trade already exists to prevent duplicate processing on reconnect
    let userTrades = [];
    try {
      userTrades = typeof userFromDb.trades === 'string' ? JSON.parse(userFromDb.trades) : (userFromDb.trades || []);
    } catch (e) {
      userTrades = [];
    }
    const existingTrade = userTrades.find((t: any) => t.id === trade.id);
    if (existingTrade) {
      console.log(`Trade ${trade.id} already exists, skipping duplicate processing.`);
      if (existingTrade.status === 'ACTIVE' && activeTrades[trade.id]) {
        activeTrades[trade.id].socketId = socket.id;
      }
      return;
    }

    let realAmount = 0;
    let bonusAmount = 0;

    if (trade.accountType === 'REAL') {
      const totalBalance = (userFromDb.balance || 0) + (userFromDb.bonus_balance || 0);
      if (totalBalance < trade.amount) {
        socket.emit('trade-error', 'Insufficient balance.');
        return;
      }
      
      // Deduct from real balance first, then bonus
      if (userFromDb.balance >= trade.amount) {
        realAmount = trade.amount;
        bonusAmount = 0;
      } else {
        realAmount = userFromDb.balance;
        bonusAmount = trade.amount - userFromDb.balance;
      }

      db.prepare('UPDATE users SET balance = balance - ?, bonus_balance = bonus_balance - ?, turnover_achieved = turnover_achieved + ? WHERE email = ?')
        .run(realAmount, bonusAmount, trade.amount, email);
    } else if (trade.accountType === 'DEMO') {
      if (userFromDb.demoBalance < trade.amount) {
        socket.emit('trade-error', 'Insufficient demo balance.');
        return;
      }
      db.prepare('UPDATE users SET demoBalance = demoBalance - ? WHERE email = ?').run(trade.amount, email);
    }

    // Update Firestore after deduction
    if (canSyncFirestore() && (trade.accountType === 'REAL' || trade.accountType === 'DEMO')) {
      const updatedUser = db.prepare('SELECT balance, bonus_balance, demoBalance, turnover_achieved FROM users WHERE email = ?').get(email) as any;
      if (updatedUser) {
        const updateData = trade.accountType === 'REAL' 
          ? { balance: updatedUser.balance, bonus_balance: updatedUser.bonus_balance, turnover_achieved: updatedUser.turnover_achieved } 
          : { demoBalance: updatedUser.demoBalance };
        firestore.collection('users').doc(userFromDb.uid).set(updateData, { merge: true })
          .catch((e: any) => {
             if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                firestoreDisabledDueToError = true;
             } else {
                console.error('Firestore user balance update error (trade placement):', e);
             }
          });
      }
    }

    // Store active trade
    // Use the exact endTime provided by the synced client for minute-boundary precision.
    // If trade.endTime is somehow missing or in the past, fallback to a minimum duration.
    const serverNow = Date.now();
    let serverEndTime = trade.endTime;
    
    // Safety check: Prevent suspicious 1-second trades caused by client/server clock drifts
    const minDurationMs = 3000; // Reduced to 3 seconds to allow candle-aligned trades
    if (!serverEndTime || (serverEndTime - serverNow) < minDurationMs) {
       const durationSeconds = trade.duration || 60;
       serverEndTime = serverNow + Math.max(minDurationMs, durationSeconds * 1000);
    }
    
    // Similarly, trust the synced client's startTime if it's within a reasonable window, else use serverNow
    let serverStartTime = trade.startTime;
    if (!serverStartTime || Math.abs(serverStartTime - serverNow) > 5000) {
        serverStartTime = serverNow;
    }
    
    const tradeToStore = { 
      ...trade, 
      email, 
      socketId: socket.id, 
      forcedResult, 
      realAmount, 
      bonusAmount,
      startTime: serverStartTime,
      endTime: serverEndTime
    };
    
    activeTrades[trade.id] = tradeToStore;
    
    // Save to DB history
    updateUserTrades(email, { ...tradeToStore, status: 'ACTIVE' });
    
    emitUserUpdate(email);
    
    logActivity(email, 'TRADE_PLACE', `${trade.type} on ${trade.assetShortName} - Amount: ${trade.amount} (${trade.accountType})`);

    // In a real app, we would validate balance and store in DB here
    // For now, we just acknowledge receipt
    socket.emit('trade-accepted', { id: trade.id, status: 'ACTIVE', startTime: serverNow, endTime: serverEndTime });
  };

  // --- Pending Orders Logic ---
  const checkPendingOrders = () => {
    try {
      const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_orders'").get();
      if (!tableExists) return;

      const pending = db.prepare("SELECT * FROM pending_orders WHERE status = 'PENDING'").all();
      pending.forEach((order: any) => {
        const asset = assets[order.assetId];
        if (!asset) return;

        let shouldTrigger = false;
        if (order.type === 'PRICE') {
          if (Math.abs(asset.price - order.triggerValue) < asset.volatility) {
            shouldTrigger = true;
          }
        } else if (order.type === 'TIME') {
          if (Date.now() >= order.triggerValue) {
            shouldTrigger = true;
          }
        }

        if (shouldTrigger) {
          const currentProfitability = asset.winPercentage || globalTradeSettings.winPercentage;
          if (currentProfitability >= order.profitability) {
            db.prepare("UPDATE pending_orders SET status = 'EXECUTED' WHERE id = ?").run(order.id);
            
            const socketId = Object.keys(connectedUsers).find(sid => connectedUsers[sid].email === order.email);
            if (socketId) {
              const socket = io.sockets.sockets.get(socketId);
              if (socket) {
                const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const trade = {
                  id: tradeId,
                  email: order.email,
                  asset: order.assetId,
                  assetShortName: order.assetId,
                  amount: order.amount,
                  type: order.direction,
                  duration: order.duration,
                  entryPrice: asset.price,
                  startTime: Date.now(),
                  endTime: Date.now() + order.duration * 1000,
                  payout: currentProfitability,
                  accountType: order.accountType
                };
                
                socket.emit('pending-order-executed', { orderId: order.id, tradeId: tradeId });
                handleTradePlacement(socket, trade);
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error checking pending orders:', error);
    }
  };

  // --- Leaderboard Simulation ---
  const FIRST_NAMES = ['Sebas', 'Dani', 'Alex', 'John', 'Maria', 'Abdul', 'Yusuf', 'Chris', 'Elena', 'Diego', 'Mohammed', 'Chen', 'Satoshi', 'Oliver', 'Sophie', 'Lucas', 'Emma', 'Hiroshi', 'Anna', 'Ivan', 'Binomo', 'Dev', 'Trading', 'FX', 'Pro', 'ID', 'Crypto', 'King', 'Queen', 'Master'];
  const LAST_NAMES = ['Trader', 'Pro', 'King', 'Master', 'Star', '17', '99', '2024', 'Win', 'Bull', 'Bear', 'Pip', 'Capital', 'Fund', 'Wealth', 'Rich', 'Cash', 'Money', 'Profit', 'Trade'];
  const COUNTRIES = ['CO', 'BR', 'MX', 'IN', 'TR', 'AE', 'ID', 'KW', 'AR', 'NG', 'ZA', 'US', 'ES', 'GB', 'DE', 'FR', 'JP', 'KR', 'AU', 'CA', 'SG', 'MY', 'PH', 'VN', 'TH'];

  let leaderboardEntries: any[] = [];
  let lastResetDate = new Date().getDate();
  let lastSwapTime = Date.now();

  const generateLeaderboard = () => {
    const newEntries = [];
    for (let i = 0; i < 20; i++) {
        // Distribute profits more realistically, top near $12000, min near $500
        const profit = 500 + Math.random() * 11500;
        newEntries.push({
            id: `sim-${i}`,
            name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
            profit: profit,                
            countryCode: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
        });
    }
    return newEntries.sort((a, b) => b.profit - a.profit);
  };

  leaderboardEntries = generateLeaderboard();
  console.log('Leaderboard initialized with', leaderboardEntries.length, 'entries');

  // Update leaderboard every 30 minutes
  setInterval(() => {
    const now = Date.now();
    const today = new Date().getDate();
    if (today !== lastResetDate) {
        leaderboardEntries = generateLeaderboard();
        lastResetDate = today;
    }

    // Simulate profit growth and user swapping
    leaderboardEntries = leaderboardEntries.map(entry => {
        // Swap users
        return {
            id: entry.id, // keep id
            name: `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]}`,
            countryCode: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
            profit: 500 + Math.random() * 11500 // Start fresh profit
        };
    }).sort((a, b) => b.profit - a.profit);

    lastSwapTime = now;

    io.emit('leaderboard-update', leaderboardEntries);
  }, 30 * 60 * 1000);
  // --- End Leaderboard Simulation ---

  setInterval(checkPendingOrders, 1000);

  // Handle Client Connections
  io.on('connection', (socket) => {
    socket.emit('leaderboard-update', leaderboardEntries);
    socket.on('request-leaderboard', () => {
        socket.emit('leaderboard-update', leaderboardEntries);
    });
    console.log('Client connected:', socket.id);
    
    // Default user state
    connectedUsers[socket.id] = {
      id: socket.id,
      email: 'Anonymous',
      name: 'Guest',
      balance: 0,
      trades: []
    };

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      delete connectedUsers[socket.id];
      io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
    });

    // Handle user authentication/sync from client
    socket.on('user-sync', async (userData) => {
      if (userData && userData.email) {
        // Fetch latest KYC status
        const kyc = db.prepare('SELECT status, rejectionReason FROM kyc_submissions WHERE email = ? ORDER BY submittedAt DESC LIMIT 1').get(userData.email) as any;
        
        // Try to sync from Firestore first
        if (canSyncFirestore() && userData.uid) {
          await syncUserFromFirestore(userData.email, userData.uid, userData.name || userData.displayName, userData.photoURL);
        }

        // Upsert user into users table
        const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(userData.email);
        const now = Date.now();
        
        if (!existingUser) {
          db.prepare('INSERT INTO users (email, name, photoURL, uid, balance, demoBalance, createdAt, lastLogin, kycStatus, referredBy, referralCode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(userData.email, userData.name || userData.displayName || '', userData.photoURL || '', userData.uid || '', userData.balance || 0, userData.demoBalance || 10000, now, now, userData.kycStatus || (kyc ? kyc.status : 'NONE'), userData.referredBy || null, userData.referralCode || Math.random().toString(36).substring(2, 8).toUpperCase());
          
          // Increment referralCount for referrer
          if (userData.referredBy) {
            let referrer = db.prepare('SELECT * FROM users WHERE referralCode = ? OR UPPER(substr(uid, 1, 8)) = UPPER(?) OR email = ?').get(userData.referredBy, userData.referredBy, userData.referredBy) as any;
            
            // Fallback to Firestore if not found in SQLite
            if (!referrer && canSyncFirestore()) {
              try {
                const snaps = await firestore.collection('users').where('referralCode', '==', userData.referredBy).limit(1).get();
                if (!snaps.empty) {
                  const data = snaps.docs[0].data();
                  referrer = { ...data, uid: snaps.docs[0].id };
                }
              } catch (e) {
                console.error('Firestore referrer lookup error:', e);
              }
            }

            if (referrer) {
              // Update SQLite if exists in SQLite
              const existingReferrerInSql = db.prepare('SELECT * FROM users WHERE email = ?').get(referrer.email);
              if (existingReferrerInSql) {
                db.prepare('UPDATE users SET referralCount = referralCount + 1 WHERE email = ?').run(referrer.email);
              }
              
              // Always update Firestore
              if (canSyncFirestore() && referrer.uid) {
                firestore.collection('users').doc(referrer.uid).set({
                  referralCount: (referrer.referralCount || 0) + 1
                }, { merge: true }).catch((e: any) => {
                  if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                    firestoreDisabledDueToError = true;
                    console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during referrer count update.');
                  } else {
                    console.error('Firestore referrer count update error:', e);
                  }
                });
              }
              
              // Notify referrer to update their referral count in real-time
              emitUserUpdate(referrer.email);
            }
          }
          
          // Sync to Firestore since it's a new user locally, but use merge to avoid overwriting existing balance/stats
          if (canSyncFirestore() && userData.uid) {
             const firestoreSyncData: any = {
               email: userData.email,
               name: userData.name || userData.displayName || '',
               photoURL: userData.photoURL || '',
               uid: userData.uid,
               lastLogin: now,
               status: 'ACTIVE',
               kycStatus: userData.kycStatus || (kyc ? kyc.status : 'NONE'),
               referralCode: userData.referralCode || Math.random().toString(36).substring(2, 8).toUpperCase()
             };
             
             // Only include balance if we are sure it's a brand new user (handled by Auth.tsx usually)
             // We omit balance here to prevent overwriting with 0 if syncFromFirestore failed
             
             firestore.collection('users').doc(userData.uid).set(firestoreSyncData, { merge: true })
               .catch((e: any) => handleFirestoreError(e, 'new user sync'));
          }
        } else {
          const fallbackReferralCode = existingUser.uid ? existingUser.uid.slice(0, 8).toUpperCase() : Math.random().toString(36).substring(2, 8).toUpperCase();
          db.prepare('UPDATE users SET name = ?, photoURL = ?, uid = ?, lastLogin = ?, kycStatus = ?, referredBy = ?, referralCode = ? WHERE email = ?')
            .run(userData.name || userData.displayName || existingUser.name || '', userData.photoURL || existingUser.photoURL || '', userData.uid || existingUser.uid || '', now, kyc ? kyc.status : existingUser.kycStatus, userData.referredBy || existingUser.referredBy, userData.referralCode || existingUser.referralCode || fallbackReferralCode, userData.email);
        }

        const userFromDb = db.prepare('SELECT * FROM users WHERE email = ?').get(userData.email) as any;
        
        connectedUsers[socket.id] = {
          ...connectedUsers[socket.id],
          ...userData,
          ...userFromDb,
          kycStatus: userFromDb.kycStatus || 'NOT_SUBMITTED',
          kycRejectionReason: kyc ? kyc.rejectionReason : null,
          id: socket.id,
          socketId: socket.id
        };

        // Update socketId for all active trades of this user
        Object.keys(activeTrades).forEach(tradeId => {
          if (activeTrades[tradeId].email === userData.email) {
            activeTrades[tradeId].socketId = socket.id;
          }
        });
        
        // Send full user data to client immediately via socket
        emitUserUpdate(userData.email);
        
        // Send initial KYC status back
        socket.emit('kyc-status-updated', { 
          status: kyc ? kyc.status : 'NOT_SUBMITTED',
          reason: kyc ? kyc.rejectionReason : null
        });

        socket.emit('allowed-withdraw-methods', userFromDb.allowed_withdrawal_methods || '');

        // If user is blocked, force logout
        if (userFromDb.status === 'BLOCKED') {
          socket.emit('force-logout');
        }

        logActivity(userData.email, 'LOGIN', `User logged in from ${socket.handshake.address}`, socket.handshake.address);
      }
    });

    socket.on('sync-extra-accounts', (data) => {
      if (data && data.email && data.extraAccounts) {
        try {
          db.prepare('UPDATE users SET extraAccounts = ? WHERE email = ?').run(JSON.stringify(data.extraAccounts), data.email);
          emitUserUpdate(data.email);
        } catch (e) {
          console.error('Error syncing extra accounts:', e);
        }
      }
    });

    // Send initial prices
    const initialPrices: Record<string, number> = {};
    Object.keys(assets).forEach(symbol => {
      initialPrices[symbol] = assets[symbol as keyof typeof assets].price;
    });
    socket.emit('initial-prices', initialPrices);

    // Handle history request
    socket.on('request-history', async (requestData) => {
      let assetShortName = typeof requestData === 'string' ? requestData : requestData.asset;
      let beforeTime = typeof requestData === 'object' ? requestData.beforeTime : null;
      let limit = typeof requestData === 'object' ? requestData.limit : 1000; // Default to 1000 candles
      let timeframe = typeof requestData === 'object' ? requestData.timeframe : '1m';

      let tfMs = 60000;
      const tfValue = parseInt(timeframe);
      const tfUnit = timeframe.replace(String(tfValue), '');
      if (tfUnit === 's') tfMs = tfValue * 1000;
      else if (tfUnit === 'm') tfMs = tfValue * 60000;
      else if (tfUnit === 'h') tfMs = tfValue * 3600000;
      else if (tfUnit === 'd') tfMs = tfValue * 86400000;
      else tfMs = 60000;

      let candles: any[] = [];
      let data: any[] = [];

      // Binance integration: Try to fetch from Binance for crypto assets
      const cryptoAssets = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'LTC', 'MATIC', 'AVAX'];
      const binancePair = binanceCryptoPairs.find(p => p.symbol === assetShortName);
      if (binancePair || cryptoAssets.includes(assetShortName.split('/')[0])) {
        try {
          const bSymbol = binancePair ? binancePair.binanceSymbol.toUpperCase() : (assetShortName.replace('/', '').toUpperCase() + 'USDT');
          const intervalMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
          const interval = intervalMap[timeframe] || '1m';
          const url = `https://api.binance.com/api/v3/klines?symbol=${bSymbol}&interval=${interval}&limit=${Math.min(limit, 1000)}`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (Array.isArray(data)) {
            candles = data.map((d: any) => ({
              time: d[0],
              open: parseFloat(d[1]),
              high: parseFloat(d[2]),
              low: parseFloat(d[3]),
              close: parseFloat(d[4])
            }));
            
            let recentTicks: any[] = [];
            if (!beforeTime) {
                try {
                    const tickRows = db.prepare('SELECT * FROM market_history WHERE symbol = ? ORDER BY time DESC LIMIT 1000').all(assetShortName) as any[];
                    recentTicks = tickRows.map(r => ({
                        time: r.time,
                        price: r.close,
                        open: r.open,
                        high: r.high,
                        low: r.low,
                        close: r.close
                    })).reverse();
                } catch(e) {
                    // Ignore DB errors
                }
            }

            socket.emit('asset-history', { 
               asset: assetShortName, 
               timeframe, 
               data: recentTicks, 
               candles: candles,
               isOlder: !!beforeTime
            });
            return;
          }
        } catch (e) {
          console.error(`Binance API error for ${assetShortName}:`, e);
        }
      }
      
      try {
        let timeRangeMs = tfMs * 30000; // Hardcoded to 30000 candles worth of time if no limit provided
        let endTime = beforeTime ? beforeTime : Date.now();
        let startTime = endTime - timeRangeMs;

        let query = `
          WITH Aggregated AS (
            SELECT 
              time - (time % ?) AS candle_time,
              MIN(time) as min_time,
              MAX(time) as max_time,
              MAX(high) AS high,
              MIN(low) AS low
            FROM market_history
            WHERE symbol = ? AND time >= ? AND time < ?
            GROUP BY candle_time
          )
          SELECT 
            a.candle_time as time,
            o.open as open,
            a.high as high,
            a.low as low,
            c.close as close
          FROM Aggregated a
          JOIN market_history o ON o.symbol = ? AND o.time = a.min_time
          JOIN market_history c ON c.symbol = ? AND c.time = a.max_time
          ORDER BY a.candle_time ASC
        `;
        let params: any[] = [tfMs, assetShortName, startTime, endTime, assetShortName, assetShortName];
        
        candles = db.prepare(query).all(...params) as any[];
        console.log(`DB History: found ${candles.length} candles for ${assetShortName} (${startTime} to ${endTime})`);

        // If not enough candles, synthesize history to ensure chart is not empty - increased for professional feel
        if (!beforeTime && candles.length < 2000) {
          const needed = 2000 - candles.length;
          const firstCandle = candles[0];
          const firstTime = firstCandle ? firstCandle.time : Math.floor(Date.now() / tfMs) * tfMs;
          const asset = (assets as any)[assetShortName];
          const volatility = asset ? asset.volatility : 0.0001;
          const startPrice = firstCandle ? firstCandle.open : (asset ? asset.price : 1.0);
          
          const synthetic: any[] = [];
          
          // To make it look extremely professional, we calculate trends properly
          let currentOpen = startPrice;
          let trend = 0;
          
          // Calculate scale based on timeframe to make larger timeframes have proportionally larger candles
          const tfScale = Math.max(1, Math.sqrt(tfMs / 60000));
          
          for (let i = 1; i <= needed; i++) {
            const time = firstTime - (i * tfMs);
            
            // Reversing the trend calculation since we are going background
            trend += (Math.random() - 0.5) * volatility * 0.5;
            trend *= 0.95; // Mean reversion
            
            const isPowerCandle = Math.random() < 0.1;
            const multiplier = isPowerCandle ? (2 + Math.random() * 2) : 1;
            
            // Move represents the distance between open and close.
            const move = (trend + (Math.random() - 0.5) * volatility * 12 * tfScale) * multiplier; 
            
            const close = currentOpen;
            const open = close - move;
            
            const wickScale = volatility * 5 * tfScale;
            // Add wicks using max/min so wicks extend beyond real body
            const high = Math.max(open, close) + Math.random() * wickScale;
            const low = Math.min(open, close) - Math.random() * wickScale;
            
            synthetic.push({ time, open, high, low, close });
            currentOpen = open;
          }
          candles = [...synthetic.reverse(), ...candles];
        }

        if (!beforeTime) {
           // Fetch recent ticks for the line chart
           const tickRows = db.prepare('SELECT * FROM market_history WHERE symbol = ? ORDER BY time DESC LIMIT 1000').all(assetShortName) as any[];
           data = tickRows.map(r => ({
             time: r.time,
             price: r.close,
             open: r.open,
             high: r.high,
             low: r.low,
             close: r.close
           })).reverse();
        }
      } catch (e) {
        console.error('Failed to fetch history from DB:', e);
      }

      socket.emit('asset-history', {
        asset: assetShortName,
        timeframe: timeframe,
        data: data,
        candles: candles,
        isOlder: !!beforeTime
      });
    });

    // Handle Trade Execution
    socket.on('place-trade', (trade) => {
      handleTradePlacement(socket, trade);
    });

    // --- Pending Orders ---
    socket.on('create-pending-order', (order) => {
      try {
        const stmt = db.prepare(`
          INSERT INTO pending_orders (
            email, uid, assetId, assetName, type, triggerValue, 
            profitability, amount, duration, direction, accountType, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
          order.email, order.uid, order.assetId, order.assetName, order.type, 
          order.triggerValue, order.profitability, order.amount, order.duration, 
          order.direction, order.accountType, Date.now()
        );
        
        const newOrder = { ...order, id: result.lastInsertRowid, status: 'PENDING', createdAt: Date.now() };
        socket.emit('pending-order-created', newOrder);
        
        // Refresh orders for user
        const userOrders = db.prepare('SELECT * FROM pending_orders WHERE email = ? ORDER BY createdAt DESC').all(order.email);
        socket.emit('user-pending-orders', userOrders);
        
        // Refresh for admin
        const allPending = db.prepare("SELECT * FROM pending_orders WHERE status = 'PENDING'").all();
        io.to('admin-room').emit('admin-pending-orders', allPending);
      } catch (error) {
        console.error('Error creating pending order:', error);
        socket.emit('trade-error', 'Failed to create pending order.');
      }
    });

    socket.on('cancel-pending-order', (orderId) => {
      try {
        db.prepare("UPDATE pending_orders SET status = 'CANCELLED' WHERE id = ?").run(orderId);
        const order = db.prepare('SELECT * FROM pending_orders WHERE id = ?').get(orderId);
        if (order) {
          const userOrders = db.prepare('SELECT * FROM pending_orders WHERE email = ? ORDER BY createdAt DESC').all(order.email);
          socket.emit('user-pending-orders', userOrders);
        }
        
        const allPending = db.prepare("SELECT * FROM pending_orders WHERE status = 'PENDING'").all();
        io.to('admin-room').emit('admin-pending-orders', allPending);
      } catch (error) {
        console.error('Error cancelling pending order:', error);
      }
    });

    socket.on('get-user-pending-orders', (email) => {
      try {
        const userOrders = db.prepare('SELECT * FROM pending_orders WHERE email = ? ORDER BY createdAt DESC').all(email);
        socket.emit('user-pending-orders', userOrders);
      } catch (error) {
        console.error('Error fetching user pending orders:', error);
      }
    });

    // --- Admin Events ---
    socket.on('get-deposit-settings', () => {
      socket.emit('deposit-settings', globalDepositSettings);
    });

    socket.on('admin-join', (email) => {
      const adminEmails = ['tasmeaykhatun565@gmail.com', 'hasan23@gmail.com', 'mdrajon56@gmail.com'];
      if (email && adminEmails.includes(email.toLowerCase())) {
        // Ensure user is unblocked
        db.prepare('UPDATE users SET status = ? WHERE email = ?').run('ACTIVE', email);
        
        socket.join('admin-room');
        socket.emit('admin-assets', assets);
        socket.emit('admin-trade-settings', globalTradeSettings);
        socket.emit('admin-support-settings', globalSupportSettings);
        socket.emit('admin-tutorials', globalTutorials);
        socket.emit('admin-referral-settings', globalReferralSettings);
        socket.emit('admin-requests', pendingRequests);
        
        try {
          const allNotifications = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100').all();
          socket.emit('admin-notifications', allNotifications);
        } catch (error) {
          console.error('Error fetching admin notifications:', error);
        }
        socket.emit('admin-rewards', globalRewards);
        socket.emit('admin-deposit-settings', globalDepositSettings);
        socket.emit('admin-users', Object.values(connectedUsers));
        socket.emit('admin-stats', platformStats);
        socket.emit('admin-platform-settings', globalPlatformSettings);
        
        try {
          const allAnnouncements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
          socket.emit('admin-announcements', allAnnouncements);
        } catch (error) {
          console.error("Error fetching admin announcements:", error);
        }

        const allDeposits = db.prepare('SELECT * FROM deposits ORDER BY submittedAt DESC').all();
        socket.emit('admin-deposits', allDeposits);
        
        const allUsers = db.prepare('SELECT * FROM users').all();
        socket.emit('admin-all-users', allUsers);
        
        const allWithdrawals = db.prepare('SELECT * FROM withdrawals ORDER BY submittedAt DESC').all();
        socket.emit('admin-withdrawals', allWithdrawals);

        const allPromoCodes = db.prepare('SELECT * FROM promo_codes').all();
        socket.emit('admin-promo-codes', allPromoCodes);
      }
    });

    socket.on('get-promo-codes', () => {
      const allPromoCodes = db.prepare('SELECT * FROM promo_codes').all();
      socket.emit('promo-codes', allPromoCodes);
    });

    socket.on('admin-add-promo-code', (promoData) => {
      try {
        const { code, description, bonusPercentage, minDeposit, turnoverMultiplier, expiresAt, title, icon } = promoData;
        const expiryTimestamp = expiresAt ? new Date(expiresAt).getTime() : null;
        db.prepare(`
          INSERT INTO promo_codes (code, description, bonusPercentage, minDeposit, turnoverMultiplier, expiresAt, title, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(code, description, bonusPercentage, minDeposit, turnoverMultiplier, expiryTimestamp, title, icon);
        
        const allPromoCodes = db.prepare('SELECT * FROM promo_codes').all();
        io.to('admin-room').emit('admin-promo-codes', allPromoCodes);
      } catch (error) {
        console.error('Error adding promo code:', error);
      }
    });

    socket.on('admin-update-promo-code', (promoData) => {
      try {
        const { id, code, description, bonusPercentage, minDeposit, turnoverMultiplier, expiresAt, title, icon } = promoData;
        const expiryTimestamp = expiresAt ? new Date(expiresAt).getTime() : null;
        db.prepare(`
          UPDATE promo_codes 
          SET code = ?, description = ?, bonusPercentage = ?, minDeposit = ?, turnoverMultiplier = ?, expiresAt = ?, title = ?, icon = ?
          WHERE id = ?
        `).run(code, description, bonusPercentage, minDeposit, turnoverMultiplier, expiryTimestamp, title, icon, id);
        
        const allPromoCodes = db.prepare('SELECT * FROM promo_codes').all();
        io.to('admin-room').emit('admin-promo-codes', allPromoCodes);
      } catch (error) {
        console.error('Error updating promo code:', error);
      }
    });

    socket.on('admin-delete-promo-code', (id) => {
      try {
        db.prepare('DELETE FROM promo_codes WHERE id = ?').run(id);
        const allPromoCodes = db.prepare('SELECT * FROM promo_codes').all();
        io.to('admin-room').emit('admin-promo-codes', allPromoCodes);
      } catch (error) {
        console.error('Error deleting promo code:', error);
      }
    });

    socket.on('admin-get-tournaments', () => {
      try {
        const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY createdAt DESC').all();
        socket.emit('admin-tournaments', tournaments);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
    });

    socket.on('admin-create-tournament', (tournamentData) => {
      try {
        const id = Math.random().toString(36).substring(2, 11);
        const { title, description, prizeFund, startTime, endTime, imageUrl, status, isLocked, rules, participants } = tournamentData;
        db.prepare(`
          INSERT INTO tournaments (id, title, description, prizeFund, startTime, endTime, imageUrl, status, isLocked, rules, participants, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, title, description, prizeFund, startTime, endTime, imageUrl, status || 'upcoming', isLocked ? 1 : 0, rules, participants || 0, Date.now());
        
        const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY createdAt DESC').all();
        io.emit('tournaments-updated', tournaments);
        io.to('admin-room').emit('admin-tournaments', tournaments);
      } catch (error) {
        console.error('Error creating tournament:', error);
      }
    });

    socket.on('admin-update-tournament', (tournamentData) => {
      try {
        const { id, title, description, prizeFund, startTime, endTime, imageUrl, status, isLocked, rules, participants } = tournamentData;
        db.prepare(`
          UPDATE tournaments 
          SET title = ?, description = ?, prizeFund = ?, startTime = ?, endTime = ?, imageUrl = ?, status = ?, isLocked = ?, rules = ?, participants = ?
          WHERE id = ?
        `).run(title, description, prizeFund, startTime, endTime, imageUrl, status, isLocked ? 1 : 0, rules, participants, id);
        
        const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY createdAt DESC').all();
        io.emit('tournaments-updated', tournaments);
        io.to('admin-room').emit('admin-tournaments', tournaments);
      } catch (error) {
        console.error('Error updating tournament:', error);
      }
    });

    socket.on('admin-delete-tournament', (id) => {
      try {
        db.prepare('DELETE FROM tournaments WHERE id = ?').run(id);
        const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY createdAt DESC').all();
        io.emit('tournaments-updated', tournaments);
        io.to('admin-room').emit('admin-tournaments', tournaments);
      } catch (error) {
        console.error('Error deleting tournament:', error);
      }
    });

    socket.on('get-tournaments', () => {
      try {
        const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY createdAt DESC').all();
        socket.emit('tournaments-list', tournaments);
      } catch (error) {
        console.error('Error fetching tournaments for user:', error);
      }
    });

    socket.on('admin-get-ads', () => {
      try {
        const ads = db.prepare('SELECT * FROM ads ORDER BY displayOrder ASC, createdAt DESC').all();
        socket.emit('admin-ads', ads);
        // Also emit to client so they initialize
        socket.emit('client-ads', ads);
      } catch (error) {
        console.error('Error fetching ads:', error);
      }
    });

    socket.on('admin-add-ad', (adData) => {
      try {
        const id = Math.random().toString(36).substring(2, 11);
        const { title, imageUrl, linkUrl, displayOrder, status } = adData;
        db.prepare(`
          INSERT INTO ads (id, title, imageUrl, linkUrl, displayOrder, status, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, title, imageUrl, linkUrl, displayOrder || 0, status || 'active', Date.now());
        
        const allAds = db.prepare('SELECT * FROM ads ORDER BY displayOrder ASC, createdAt DESC').all();
        io.to('admin-room').emit('admin-ads', allAds);
        io.emit('client-ads', allAds);
      } catch (error) {
        console.error('Error adding ad:', error);
      }
    });

    socket.on('admin-update-ad', (adData) => {
      try {
        const { id, title, imageUrl, linkUrl, displayOrder, status } = adData;
        db.prepare(`
          UPDATE ads 
          SET title = ?, imageUrl = ?, linkUrl = ?, displayOrder = ?, status = ?
          WHERE id = ?
        `).run(title, imageUrl, linkUrl, displayOrder, status, id);
        
        const allAds = db.prepare('SELECT * FROM ads ORDER BY displayOrder ASC, createdAt DESC').all();
        io.to('admin-room').emit('admin-ads', allAds);
        io.emit('client-ads', allAds);
      } catch (error) {
        console.error('Error updating ad:', error);
      }
    });

    socket.on('admin-delete-ad', (id) => {
      try {
        db.prepare('DELETE FROM ads WHERE id = ?').run(id);
        const allAds = db.prepare('SELECT * FROM ads ORDER BY displayOrder ASC, createdAt DESC').all();
        io.to('admin-room').emit('admin-ads', allAds);
        io.emit('client-ads', allAds);
      } catch (error) {
        console.error('Error deleting ad:', error);
      }
    });

    socket.on('admin-get-announcements', () => {
      try {
        const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
        socket.emit('admin-announcements', announcements);
      } catch (error) {
        console.error('Error getting announcements:', error);
      }
    });

    socket.on('admin-add-announcement', (data) => {
      try {
        const id = Math.random().toString(36).substring(2, 11);
        const { title, message, imageUrl, linkUrl } = data;
        db.prepare(`
          INSERT INTO announcements (id, title, message, imageUrl, linkUrl, createdAt)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, title, message, imageUrl, linkUrl, Date.now());
        
        const allAnnouncements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
        io.to('admin-room').emit('admin-announcements', allAnnouncements);
        io.emit('client-announcements', allAnnouncements);
      } catch (error) {
        console.error('Error adding announcement:', error);
      }
    });

    socket.on('admin-update-announcement', (data) => {
      try {
        const { id, title, message, imageUrl, linkUrl } = data;
        db.prepare(`
          UPDATE announcements SET title = ?, message = ?, imageUrl = ?, linkUrl = ?
          WHERE id = ?
        `).run(title, message, imageUrl, linkUrl, id);
        
        const allAnnouncements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
        io.to('admin-room').emit('admin-announcements', allAnnouncements);
        io.emit('client-announcements', allAnnouncements);
      } catch (error) {
        console.error('Error updating announcement:', error);
      }
    });

    socket.on('admin-delete-announcement', (id) => {
      try {
        db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
        const allAnnouncements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
        io.to('admin-room').emit('admin-announcements', allAnnouncements);
        io.emit('client-announcements', allAnnouncements);
      } catch (error) {
        console.error('Error deleting announcement:', error);
      }
    });

    socket.on('announcement-vote', ({ id, voteType }) => {
      try {
        if (voteType === 'like') {
          db.prepare('UPDATE announcements SET likes = likes + 1 WHERE id = ?').run(id);
        } else if (voteType === 'dislike') {
          db.prepare('UPDATE announcements SET dislikes = dislikes + 1 WHERE id = ?').run(id);
        }
        
        const allAnnouncements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
        io.emit('client-announcements', allAnnouncements);
      } catch (error) {
        console.error('Error voting on announcement:', error);
      }
    });

    socket.on('get-client-ads', () => {
      try {
        const ads = db.prepare("SELECT * FROM ads WHERE status = 'active' ORDER BY displayOrder ASC, createdAt DESC").all();
        socket.emit('client-ads', ads);
      } catch (error) {
        console.error('Error fetching client ads:', error);
      }
    });

    socket.on('get-client-announcements', () => {
      try {
        const announcements = db.prepare('SELECT * FROM announcements ORDER BY createdAt DESC').all();
        socket.emit('client-announcements', announcements);
      } catch (error) {
        console.error('Error fetching client announcements:', error);
      }
    });

    socket.on('admin-update-payout', ({ assetId, payout }) => {
      if (assets[assetId]) {
        assets[assetId].payout = payout;
        saveAssetSettings();
      }
      io.emit('asset-payout-updated', { assetId, payout });
    });

    socket.on('admin-reset-daily-stats', () => {
      platformStats.dailyStats = { trades: 0, volume: 0, profit: 0, loss: 0 };
      io.to('admin-room').emit('admin-stats', platformStats);
    });

    // Send initial support settings to all users
    socket.emit('support-settings', globalSupportSettings);
    socket.emit('tutorials', globalTutorials);
    socket.emit('referral-settings', globalReferralSettings);
    socket.emit('rewards', globalRewards);
    socket.emit('platform-settings', globalPlatformSettings);

    socket.on('user-update', (userData) => {
      if (userData && userData.email) {
        connectedUsers[socket.id] = {
          ...userData,
          socketId: socket.id,
          lastSeen: Date.now()
        };
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      }
    });

    socket.on('submit-request', (request) => {
      const newRequest = {
        ...request,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        status: 'PENDING'
      };
      pendingRequests.push(newRequest);
      io.to('admin-room').emit('admin-requests', pendingRequests);
      // Notify admin
      io.to('admin-room').emit('new-request-notification', newRequest);
    });

    socket.on('admin-update-request-status', ({ requestId, status, message }) => {
      const requestIndex = pendingRequests.findIndex(r => r.id === requestId);
      if (requestIndex !== -1) {
        pendingRequests[requestIndex].status = status;
        pendingRequests[requestIndex].adminMessage = message;
        
        // Notify the specific user if they are connected
        const userEmail = pendingRequests[requestIndex].userEmail;
        emitToUser(userEmail, 'request-status-updated', {
          requestId,
          status,
          message
        });

        const notifyType = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'info';
        sendNotification(
          userEmail,
          `Request ${status}`,
          message || `Your request has been ${status.toLowerCase()}.`,
          notifyType
        );
        
        io.to('admin-room').emit('admin-requests', pendingRequests);
      }
    });

    socket.on('admin-send-notification', (notification) => {
      try {
        const { email, title, message, type } = notification;
        const id = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        
        db.prepare('INSERT INTO notifications (id, email, title, message, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, email, title, message, type, timestamp);
        
        const newNotification = { id, email, title, message, type, timestamp, isRead: 0 };
        
        // Find user socket and emit
        emitToUser(email, 'new-notification', newNotification);
        
        // Update admin list
        const allNotifications = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100').all();
        io.to('admin-room').emit('admin-notifications', allNotifications);
      } catch (error) {
        console.error('Error sending notification:', error);
      }
    });

    socket.on('get-notifications', (email) => {
      try {
        const notifications = db.prepare("SELECT * FROM notifications WHERE email = ? OR email = 'ALL' ORDER BY timestamp DESC LIMIT 50").all(email);
        socket.emit('user-notifications', notifications);
      } catch (error) {
        console.error('Error fetching user notifications:', error);
      }
    });

    socket.on('mark-notification-read', (id) => {
      try {
        db.prepare('UPDATE notifications SET isRead = 1 WHERE id = ?').run(id);
      } catch (error) {
        console.error('Error marking notification read:', error);
      }
    });

    socket.on('admin-update-referral-settings', (settings) => {
      globalReferralSettings = { ...globalReferralSettings, ...settings };
      saveReferralSettings(globalReferralSettings);
      io.emit('referral-settings', globalReferralSettings);
      io.to('admin-room').emit('admin-referral-settings', globalReferralSettings);
    });

    // --- Leaderboard ---
    app.get('/api/leaderboard', (req, res) => {
      try {
        const topTraders = db.prepare(`
          SELECT name, photoURL, balance, totalReferralEarnings 
          FROM users 
          ORDER BY balance DESC 
          LIMIT 10
        `).all();
        res.json(topTraders);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }
    });

    socket.on('join-chat', (email) => {
      socket.join(`chat-${email}`);
      console.log(`User ${email} joined chat room`);
      
      // Fetch existing messages for this user
      try {
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='support_chat'").get();
        if (tableExists) {
          const messages = db.prepare('SELECT * FROM support_chat WHERE email = ? ORDER BY timestamp ASC').all(email);
          socket.emit('chat-history', messages);
        } else {
          console.warn('Table support_chat does not exist, skipping chat history fetch.');
          socket.emit('chat-history', []);
        }

        // Fetch or create session status
        const session = db.prepare('SELECT status FROM chat_sessions WHERE email = ?').get(email);
        if (session) {
          socket.emit('chat-status', session.status);
        } else {
          db.prepare('INSERT INTO chat_sessions (email, status, lastUpdated) VALUES (?, ?, ?)').run(email, 'active', Date.now());
          socket.emit('chat-status', 'active');
        }
      } catch (error) {
        console.error('Error fetching chat history/status:', error);
      }
    });

    socket.on('admin-join-chat', (email) => {
      socket.join(`chat-${email}`);
      console.log(`Admin joined chat room for ${email}`);
      
      // Fetch existing messages for this user
      try {
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='support_chat'").get();
        if (tableExists) {
          const messages = db.prepare('SELECT * FROM support_chat WHERE email = ? ORDER BY timestamp ASC').all(email);
          socket.emit('chat-history', messages);
        } else {
          console.warn('Table support_chat does not exist, skipping chat history fetch for admin.');
          socket.emit('chat-history', []);
        }
      } catch (error) {
        console.error('Error fetching chat history for admin:', error);
      }
    });

    socket.on('chat-message', ({ email, text, sender }) => {
      const id = Math.random().toString(36).substr(2, 9);
      const timestamp = Date.now();
      const message = { id, email, text, sender, timestamp };
      
      try {
        // Ensure session exists and is active
        const session = db.prepare('SELECT status FROM chat_sessions WHERE email = ?').get(email);
        if (!session) {
          db.prepare('INSERT INTO chat_sessions (email, status, lastUpdated) VALUES (?, ?, ?)').run(email, 'active', timestamp);
        } else if (session.status === 'closed') {
          db.prepare('UPDATE chat_sessions SET status = ?, lastUpdated = ? WHERE email = ?').run('active', timestamp, email);
        } else {
          db.prepare('UPDATE chat_sessions SET lastUpdated = ? WHERE email = ?').run(timestamp, email);
        }

        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='support_chat'").get();
        if (tableExists) {
          db.prepare('INSERT INTO support_chat (id, email, text, sender, timestamp) VALUES (?, ?, ?, ?, ?)')
            .run(id, email, text, sender, timestamp);
        } else {
          console.warn('Table support_chat does not exist, skipping message insertion.');
        }

        // Sync to Firestore
        if (canSyncFirestore()) {
          firestore.collection('support_chats').doc(email).collection('messages').doc(id).set(message)
            .catch((e: any) => {
              if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                firestoreDisabledDueToError = true;
                console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during chat sync.');
              } else {
                console.error('Firestore chat sync error:', e);
              }
            });
          
          // Update last message in main doc
          firestore.collection('support_chats').doc(email).set({
            lastUpdated: timestamp,
            lastMessage: text,
            email: email,
            status: 'active'
          }, { merge: true }).catch((e: any) => {
            if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
              firestoreDisabledDueToError = true;
              console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during chat meta sync.');
            } else {
              console.error('Firestore chat meta sync error:', e);
            }
          });
        }
        
        io.to(`chat-${email}`).emit('new-chat-message', message);
        io.to('admin-room').emit('new-chat-message', message);
        
        // Refresh admin chat list for all admins
        const allChats = db.prepare(`
          SELECT 
            s.email, 
            COALESCE(MAX(m.timestamp), s.lastUpdated) as lastUpdated, 
            m.text as lastMessage, 
            s.status 
          FROM chat_sessions s 
          LEFT JOIN support_chat m ON s.email = m.email 
          GROUP BY s.email 
          ORDER BY lastUpdated DESC
        `).all();
        io.to('admin-room').emit('admin-chats', allChats);
      } catch (error) {
        console.error('Error saving chat message:', error);
      }
    });

    socket.on('start-new-chat', (email) => {
      try {
        db.prepare('UPDATE chat_sessions SET status = ?, lastUpdated = ? WHERE email = ?').run('active', Date.now(), email);
        console.log(`User ${email} started a new chat session`);
        
        // Refresh admin chat list
        const allChats = db.prepare(`
          SELECT 
            s.email, 
            COALESCE(MAX(m.timestamp), s.lastUpdated) as lastUpdated, 
            m.text as lastMessage, 
            s.status 
          FROM chat_sessions s 
          LEFT JOIN support_chat m ON s.email = m.email 
          GROUP BY s.email 
          ORDER BY lastUpdated DESC
        `).all();
        io.to('admin-room').emit('admin-chats', allChats);
      } catch (error) {
        console.error('Error starting new chat session:', error);
      }
    });

    socket.on('admin-get-chats', () => {
      try {
        const allChats = db.prepare(`
          SELECT 
            s.email, 
            COALESCE(MAX(m.timestamp), s.lastUpdated) as lastUpdated, 
            m.text as lastMessage, 
            s.status 
          FROM chat_sessions s 
          LEFT JOIN support_chat m ON s.email = m.email 
          GROUP BY s.email 
          ORDER BY lastUpdated DESC
        `).all();
        socket.emit('admin-chats', allChats);
      } catch (error) {
        console.error('Error fetching all chats:', error);
      }
    });

    socket.on('admin-close-chat', (email) => {
      try {
        db.prepare('UPDATE chat_sessions SET status = ?, lastUpdated = ? WHERE email = ?').run('closed', Date.now(), email);
        io.to(`chat-${email}`).emit('chat-closed');
        
        // Refresh admin chat list
        const allChats = db.prepare(`
          SELECT 
            s.email, 
            COALESCE(MAX(m.timestamp), s.lastUpdated) as lastUpdated, 
            m.text as lastMessage, 
            s.status 
          FROM chat_sessions s 
          LEFT JOIN support_chat m ON s.email = m.email 
          GROUP BY s.email 
          ORDER BY lastUpdated DESC
        `).all();
        io.to('admin-room').emit('admin-chats', allChats);
        
        console.log(`Admin closed chat for ${email}`);
      } catch (error) {
        console.error('Error closing chat:', error);
      }
    });

    socket.on('admin-delete-chat-history', async (email) => {
      try {
        // Delete from SQLite
        db.prepare('DELETE FROM support_chat WHERE email = ?').run(email);
        db.prepare('DELETE FROM chat_sessions WHERE email = ?').run(email);
        
        // Delete from Firestore
        if (canSyncFirestore()) {
          const messagesRef = firestore.collection('support_chats').doc(email).collection('messages');
          const snapshot = await messagesRef.get();
          const batch = firestore.batch();
          snapshot.docs.forEach((doc: any) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          await firestore.collection('support_chats').doc(email).delete();
        }
        
        // Notify user to clear their local state if they are online
        io.to(`chat-${email}`).emit('chat-history-deleted');
        
        // Refresh admin chat list
        const allChats = db.prepare(`
          SELECT 
            s.email, 
            COALESCE(MAX(m.timestamp), s.lastUpdated) as lastUpdated, 
            m.text as lastMessage, 
            s.status 
          FROM chat_sessions s 
          LEFT JOIN support_chat m ON s.email = m.email 
          GROUP BY s.email 
          ORDER BY lastUpdated DESC
        `).all();
        io.to('admin-room').emit('admin-chats', allChats);
        
        console.log(`Admin deleted chat history for ${email}`);
      } catch (error) {
        console.error('Error deleting chat history:', error);
      }
    });

    socket.on('admin-chat-message', ({ email, text, sender }) => {
      const id = Math.random().toString(36).substr(2, 9);
      const timestamp = Date.now();
      const message = {
        id,
        text,
        sender,
        timestamp
      };

      // Sync to SQLite
      try {
        const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='support_chat'").get();
        if (tableExists) {
          db.prepare('INSERT INTO support_chat (id, email, text, sender, timestamp) VALUES (?, ?, ?, ?, ?)')
            .run(id, email, text, sender, timestamp);
        }
      } catch (e) {
        console.error('Error saving admin chat message to SQLite:', e);
      }

      // Sync to Firestore
      if (canSyncFirestore()) {
        firestore.collection('support_chats').doc(email).collection('messages').doc(id).set({
          ...message,
          email
        }).catch((e: any) => {
          if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
            firestoreDisabledDueToError = true;
            console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during admin chat sync.');
          } else {
            console.error('Firestore admin chat sync error:', e);
          }
        });

        firestore.collection('support_chats').doc(email).set({
          lastUpdated: timestamp,
          lastMessage: text,
          email: email
        }, { merge: true }).catch((e: any) => {
          if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
            firestoreDisabledDueToError = true;
            console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during admin chat meta sync.');
          } else {
            console.error('Firestore admin chat meta sync error:', e);
          }
        });
      }

      io.to(`chat-${email}`).emit('new-chat-message', message);
    });

    socket.on('admin-get-all-users', () => {
      const allUsers = db.prepare('SELECT * FROM users').all();
      socket.emit('admin-all-users', allUsers);
    });

    socket.on('admin-get-all-logs', () => {
      try {
        const logs = db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200').all();
        socket.emit('admin-all-logs', logs);
      } catch (error) {
        console.error('Error fetching all logs:', error);
      }
    });

    socket.on('admin-update-user-balance', ({ email, balance, type }) => {
      try {
        const parsedBalance = parseFloat(balance);
        if (type === 'REAL') {
          db.prepare('UPDATE users SET balance = ? WHERE email = ?').run(parsedBalance, email);
        } else if (type === 'BONUS') {
          db.prepare('UPDATE users SET bonus_balance = ? WHERE email = ?').run(parsedBalance, email);
        } else {
          db.prepare('UPDATE users SET demoBalance = ? WHERE email = ?').run(parsedBalance, email);
        }
        
        const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(email) as any;
        if (userFromDb && canSyncFirestore() && userFromDb.uid) {
          const updateData = type === 'REAL' ? { balance: parsedBalance } : (type === 'BONUS' ? { bonus_balance: parsedBalance } : { demoBalance: parsedBalance });
          firestore.collection('users').doc(userFromDb.uid).set(updateData, { merge: true })
            .catch((e: any) => {
               if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                  firestoreDisabledDueToError = true;
               } else {
                  console.error('Firestore user balance update error (admin update):', e);
               }
            });
        }
        
        logActivity(email, 'ADMIN_BALANCE_UPDATE', `Admin updated ${type} balance to ${parsedBalance}`);

        // Notify user if connected
        emitUserUpdate(email);
        emitToUser(email, 'balance-updated', { balance: parsedBalance, type });

        sendNotification(
          email,
          'Balance Adjusted',
          `Your ${type.toLowerCase()} balance has been adjusted to ${parsedBalance} by an administrator.`,
          'info'
        );
        
        // Refresh admin user list (only send the updated user)
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      } catch (error) {
        console.error('Update Balance Error:', error);
      }
    });

    socket.on('admin-update-user-details', ({ email, name, isBoosted, allowed_withdrawal_methods }) => {
      try {
        db.prepare('UPDATE users SET name = ?, isBoosted = ?, allowed_withdrawal_methods = ? WHERE email = ?').run(name, isBoosted ? 1 : 0, allowed_withdrawal_methods, email);
        logActivity(email, 'ADMIN_UPDATE_DETAILS', `Admin updated user details`);
        
        // Update Firestore
        if (canSyncFirestore()) {
          const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(email) as any;
          if (userFromDb && userFromDb.uid) {
            firestore.collection('users').doc(userFromDb.uid).set({
              name,
              isBoosted: isBoosted ? 1 : 0,
              allowed_withdrawal_methods
            }, { merge: true }).catch((e: any) => {
              if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                firestoreDisabledDueToError = true;
                console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during user details update.');
              } else {
                console.error('Firestore user details update error:', e);
              }
            });
          }
        }
        
        emitUserUpdate(email);
        emitToUser(email, 'allowed-withdraw-methods-updated', allowed_withdrawal_methods);
        
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      } catch (error) {
        console.error('Error updating user details:', error);
      }
    });

    socket.on('admin-update-user-turnover', ({ email, required, achieved }) => {
      try {
        db.prepare('UPDATE users SET turnover_required = ?, turnover_achieved = ? WHERE email = ?').run(required, achieved, email);
        logActivity(email, 'ADMIN_UPDATE_TURNOVER', `Admin updated turnover requirements`);
        
        // Update Firestore
        if (canSyncFirestore()) {
          const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(email) as any;
          if (userFromDb && userFromDb.uid) {
            firestore.collection('users').doc(userFromDb.uid).set({
              turnover_required: required,
              turnover_achieved: achieved
            }, { merge: true }).catch((e: any) => {
              if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                firestoreDisabledDueToError = true;
                console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during turnover update.');
              } else {
                console.error('Firestore turnover update error:', e);
              }
            });
          }
        }

        emitUserUpdate(email);
        emitToUser(email, 'turnover-updated', { required, achieved });
        
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      } catch (error) {
        console.error('Error updating user turnover:', error);
      }
    });

    socket.on('admin-update-user-kyc', ({ email, status }) => {
      try {
        db.prepare('UPDATE users SET kycStatus = ? WHERE email = ?').run(status, email);
        logActivity(email, 'ADMIN_UPDATE_KYC', `Admin updated KYC status to ${status}`);
        
        // Update Firestore
        if (canSyncFirestore()) {
          const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(email) as any;
          if (userFromDb && userFromDb.uid) {
            firestore.collection('users').doc(userFromDb.uid).set({
              kycStatus: status
            }, { merge: true }).catch((e: any) => console.error('Firestore user kycStatus update error:', e));
          }
        }

        emitUserUpdate(email);
        emitToUser(email, 'kyc-status-updated', { status });
        
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      } catch (error) {
        console.error('Error updating user KYC:', error);
      }
    });

    socket.on('admin-add-deduct-balance', ({ email, amount, type, reason }) => {
      try {
        const user = db.prepare('SELECT balance, bonus_balance, demoBalance, uid FROM users WHERE email = ?').get(email) as any;
        if (!user) return;

        let newBalance = 0;
        if (type === 'REAL') {
          newBalance = user.balance + amount;
          db.prepare('UPDATE users SET balance = ? WHERE email = ?').run(newBalance, email);
        } else if (type === 'BONUS') {
          newBalance = (user.bonus_balance || 0) + amount;
          db.prepare('UPDATE users SET bonus_balance = ? WHERE email = ?').run(newBalance, email);
        } else {
          newBalance = user.demoBalance + amount;
          db.prepare('UPDATE users SET demoBalance = ? WHERE email = ?').run(newBalance, email);
        }
        
        if (canSyncFirestore()) {
          const updateData = type === 'REAL' ? { balance: newBalance } : type === 'BONUS' ? { bonus_balance: newBalance } : { demoBalance: newBalance };
          firestore.collection('users').doc(user.uid).set(updateData, { merge: true })
            .catch((e: any) => {
               if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                  firestoreDisabledDueToError = true;
               } else {
                  console.error('Firestore user balance update error (admin add/deduct):', e);
               }
            });
        }
        
        logActivity(email, 'ADMIN_BALANCE_ADJUST', `Admin ${amount >= 0 ? 'added' : 'deducted'} ${Math.abs(amount)} ${type} balance. Reason: ${reason}`);
        
        const allUsers = db.prepare('SELECT * FROM users').all();
        io.to('admin-room').emit('admin-all-users', allUsers);
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
        
        // Notify user
        emitUserUpdate(email);
        emitToUser(email, 'balance-updated', { balance: newBalance, type });
        emitToUser(email, 'new-notification', {
          id: Date.now().toString(),
          title: 'Balance Adjusted',
          message: `Your ${type} balance has been ${amount >= 0 ? 'credited' : 'debited'} by ${Math.abs(amount)}. Reason: ${reason}`,
          type: 'SYSTEM',
          read: false,
          createdAt: Date.now()
        });
      } catch (error) {
        console.error('Error adjusting user balance:', error);
      }
    });

    socket.on('admin-update-user-status', ({ email, status }) => {
      try {
        db.prepare('UPDATE users SET status = ? WHERE email = ?').run(status, email);
        
        logActivity(email, 'ADMIN_STATUS_UPDATE', `Admin updated status to ${status}`);

        // Notify user if connected
        emitUserUpdate(email);
        emitToUser(email, 'status-updated', status);
        if (status === 'BLOCKED') {
          emitToUser(email, 'force-logout');
        }
        
        // Refresh admin user list
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      } catch (error) {
        console.error('Update Status Error:', error);
      }
    });

    socket.on('admin-send-notification-all', (notification) => {
      try {
        const { title, message, type } = notification;
        const id = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();
        
        db.prepare('INSERT INTO notifications (id, email, title, message, type, timestamp) VALUES (?, ?, ?, ?, ?, ?)')
          .run(id, 'ALL', title, message, type, timestamp);
        
        const newNotification = { id, email: 'ALL', title, message, type, timestamp, isRead: 0 };
        io.emit('new-notification', newNotification);
        
        // Update admin list
        const allNotifications = db.prepare('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100').all();
        io.to('admin-room').emit('admin-notifications', allNotifications);
        
        console.log('Broadcasted notification to all users:', title);
      } catch (error) {
        console.error('Error sending notification all:', error);
      }
    });

    socket.on('get-social-messages', () => {
      try {
        const messages = db.prepare('SELECT * FROM social_chat ORDER BY timestamp DESC LIMIT 50').all();
        socket.emit('social-messages', messages.reverse());
      } catch (error) {
        console.error('Error fetching social messages:', error);
      }
    });

    socket.on('send-social-message', (msg) => {
      try {
        const { email, name, text, photoURL } = msg;
        const timestamp = Date.now();
        db.prepare('INSERT INTO social_chat (email, name, text, photoURL, timestamp) VALUES (?, ?, ?, ?, ?)')
          .run(email, name, text, photoURL, timestamp);
        io.emit('new-social-message', { email, name, text, photoURL, timestamp });
      } catch (error) {
        console.error('Error sending social message:', error);
      }
    });

    socket.on('submit-transfer', async (transferData) => {
      try {
        const { senderEmail, recipientEmail, amount } = transferData;
        
        const sender = db.prepare('SELECT * FROM users WHERE email = ?').get(senderEmail) as any;
        const recipient = db.prepare('SELECT * FROM users WHERE email = ?').get(recipientEmail) as any;
        
        if (!sender) {
          socket.emit('transfer-error', 'Sender not found');
          return;
        }
        if (!recipient) {
          socket.emit('transfer-error', 'Recipient not found');
          return;
        }
        if (sender.balance < amount) {
          socket.emit('transfer-error', 'Insufficient balance');
          return;
        }

        const id = Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now();

        db.transaction(() => {
          db.prepare('UPDATE users SET balance = balance - ? WHERE email = ?').run(amount, senderEmail);
          db.prepare('UPDATE users SET balance = balance + ? WHERE email = ?').run(amount, recipientEmail);
          
          db.prepare('INSERT INTO transfers (id, fromEmail, toEmail, amount, timestamp) VALUES (?, ?, ?, ?, ?)')
            .run(id, senderEmail, recipientEmail, amount, timestamp);
          
          logActivity(senderEmail, 'TRANSFER_SENT', `Sent ${amount} to ${recipientEmail}`);
          logActivity(recipientEmail, 'TRANSFER_RECEIVED', `Received ${amount} from ${senderEmail}`);
        })();

        socket.emit('transfer-success', { newBalance: sender.balance - amount });
        
        emitUserUpdate(senderEmail);
        emitUserUpdate(recipientEmail);
        
        emitToUser(recipientEmail, 'balance-updated', { balance: recipient.balance + amount, type: 'REAL' });
        emitToUser(recipientEmail, 'new-notification', {
          id: Date.now().toString(),
          title: 'Transfer Received',
          message: `You received ${amount} from ${senderEmail}`,
          type: 'SYSTEM',
          read: false,
          createdAt: Date.now()
        });
        
        // Notify admin
        io.to('admin-room').emit('admin-new-transfer', { id, fromEmail: senderEmail, toEmail: recipientEmail, amount, timestamp });
      } catch (error) {
        console.error('Transfer Error:', error);
        socket.emit('transfer-error', 'Transfer failed. Please try again.');
      }
    });

    socket.on('admin-get-transfers', () => {
      try {
        const transfers = db.prepare('SELECT * FROM transfers ORDER BY timestamp DESC LIMIT 100').all();
        socket.emit('admin-transfers', transfers);
      } catch (error) {
        console.error('Error fetching transfers:', error);
      }
    });

    socket.on('admin-delete-user', (email) => {
      try {
        const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(email) as any;
        
        db.prepare('DELETE FROM users WHERE email = ?').run(email);
        db.prepare('DELETE FROM deposits WHERE email = ?').run(email);
        db.prepare('DELETE FROM withdrawals WHERE email = ?').run(email);
        db.prepare('DELETE FROM kyc_submissions WHERE email = ?').run(email);
        
        // Force logout if connected
        emitToUser(email, 'force-logout');
        
        // Refresh admin user list
        const allUsers = db.prepare('SELECT * FROM users').all();
        io.to('admin-room').emit('admin-all-users', allUsers);
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));
      } catch (error) {
        console.error('Delete User Error:', error);
      }
    });

    socket.on('admin-update-deposit-settings', (settings) => {
      globalDepositSettings = settings;
      saveDepositSettings(settings);
      io.emit('deposit-settings', globalDepositSettings);
      io.to('admin-room').emit('admin-deposit-settings', globalDepositSettings);
    });

    socket.on('admin-update-trade-settings', (settings) => {
      globalTradeSettings = { ...globalTradeSettings, ...settings };
      saveTradeSettings(globalTradeSettings);
      io.to('admin-room').emit('admin-trade-settings', globalTradeSettings);
      
      if (settings.payoutPercentage !== undefined) {
        io.emit('global-payout-updated', settings.payoutPercentage);
      }
    });

    socket.on('admin-update-support-settings', (settings) => {
      globalSupportSettings = { ...globalSupportSettings, ...settings };
      io.emit('support-settings', globalSupportSettings);
      io.to('admin-room').emit('admin-support-settings', globalSupportSettings);
      io.emit('support-status-update', globalSupportSettings.supportStatus);
    });

    socket.on('admin-update-platform-settings', (settings) => {
      globalPlatformSettings = { ...globalPlatformSettings, ...settings };
      savePlatformSettings(globalPlatformSettings);
      io.emit('platform-settings', globalPlatformSettings);
      io.to('admin-room').emit('admin-platform-settings', globalPlatformSettings);
    });

    socket.on('admin-update-tutorials', (tutorials) => {
      globalTutorials = tutorials;
      io.emit('tutorials', globalTutorials);
      io.to('admin-room').emit('admin-tutorials', globalTutorials);
    });

    socket.on('admin-add-reward', (reward) => {
      const newReward = {
        ...reward,
        id: Math.random().toString(36).substr(2, 9)
      };
      globalRewards.push(newReward);
      io.emit('rewards', globalRewards);
      io.to('admin-room').emit('admin-rewards', globalRewards);
    });

    socket.on('admin-delete-reward', (id) => {
      globalRewards = globalRewards.filter(r => r.id !== id);
      io.emit('rewards', globalRewards);
      io.to('admin-room').emit('admin-rewards', globalRewards);
    });

    socket.on('admin-set-trend', ({ asset, trend }) => {
      if (assets[asset]) {
        assets[asset].trend = trend;
      }
    });

    socket.on('admin-set-volatility', ({ asset, volatility }) => {
      if (assets[asset]) {
        assets[asset].volatility = volatility;
        saveAssetSettings();
        io.emit('market-assets-updated', assets);
      }
    });

    socket.on('admin-set-win-percentage', ({ asset, winPercentage }) => {
      if (assets[asset]) {
        assets[asset].winPercentage = winPercentage;
        saveAssetSettings();
        io.emit('market-assets-updated', assets);
      }
    });

    socket.on('admin-set-price', ({ asset, price }) => {
      if (assets[asset]) {
        assets[asset].price = price;
        io.emit('market-assets-updated', assets);
      }
    });

    socket.on('admin-set-target', ({ asset, targetPrice }) => {
      if (assets[asset]) {
        assets[asset].targetPrice = targetPrice;
        io.emit('market-assets-updated', assets);
      }
    });

    socket.on('admin-toggle-real-market', ({ asset, isRealMarket }) => {
      if (assets[asset]) {
        assets[asset].isRealMarket = isRealMarket;
        io.emit('market-assets-updated', assets);
      }
    });

    socket.on('admin-toggle-freeze', ({ asset, isFrozen }) => {
      if (assets[asset]) {
        assets[asset].isFrozen = isFrozen;
        io.emit('market-assets-updated', assets);
      }
    });

    // --- Deposit Events ---
    socket.on('get-user-transactions', (email) => {
      try {
        const userDeposits = db.prepare('SELECT * FROM deposits WHERE email = ? ORDER BY submittedAt DESC').all(email);
        const userWithdrawals = db.prepare('SELECT * FROM withdrawals WHERE email = ? ORDER BY submittedAt DESC').all(email);
        socket.emit('user-transactions', { deposits: userDeposits, withdrawals: userWithdrawals });
      } catch (error) {
        console.error('Error fetching user transactions:', error);
      }
    });

    socket.on('get-user-bonuses', (email) => {
      const bonuses = db.prepare(`
        SELECT * FROM deposits 
        WHERE email = ? AND status = 'APPROVED' AND bonusAmount > 0 
        ORDER BY submittedAt DESC
      `).all(email);
      socket.emit('user-bonuses', bonuses);
    });

    socket.on('submit-deposit', (depositData) => {
      console.log('Received submit-deposit request:', depositData);
      if (!globalPlatformSettings.isDepositsEnabled) {
        socket.emit('deposit-error', 'Deposits are currently disabled.');
        return;
      }
      try {
        const { email, amount, currency, method, transactionId, promoCode, screenshot } = depositData;
        console.log(`Processing deposit for ${email}: ${amount} ${currency} via ${method}`);
        
        // Check for existing transactionId
        const existing = db.prepare('SELECT id FROM deposits WHERE transactionId = ?').get(transactionId);
        if (existing) {
          socket.emit('deposit-error', 'This transaction ID has already been submitted.');
          return;
        }
        
        const rate = EXCHANGE_RATES[currency] || 1;
        const amountUSD = amount / rate;
        
        let bonusAmount = 0;
        let turnoverRequired = 0;
        
        if (promoCode) {
          const now = Date.now();
          const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(promoCode) as any;
          if (promo && amountUSD >= promo.minDeposit && (!promo.expiresAt || now <= promo.expiresAt)) {
            bonusAmount = amount * (promo.bonusPercentage / 100);
            turnoverRequired = (amount + bonusAmount) * promo.turnoverMultiplier;
          }
        } else if (amountUSD >= globalDepositSettings.minDepositForBonus) {
          // Default bonus if no promo code
          bonusAmount = amount * (globalDepositSettings.bonusPercentage / 100);
          turnoverRequired = (amount + bonusAmount) * globalDepositSettings.turnoverMultiplier;
        }

        const stmt = db.prepare(`
          INSERT INTO deposits (email, amount, currency, method, transactionId, submittedAt, updatedAt, promoCode, bonusAmount, turnoverRequired, screenshot)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const now = Date.now();
        stmt.run(email, amount, currency, method, transactionId, now, now, promoCode || null, bonusAmount, turnoverRequired, screenshot || null);
        
        socket.emit('deposit-submitted', { status: 'PENDING', bonusAmount });
        
        logActivity(email, 'DEPOSIT_SUBMIT', `Method: ${method}, Amount: ${amount} ${currency}, ID: ${transactionId}`);

        // Notify admins
        io.to('admin-room').emit('new-deposit-notification', { email, amount, method, transactionId, bonusAmount, submittedAt: now });
        
        const allDeposits = db.prepare('SELECT * FROM deposits ORDER BY submittedAt DESC LIMIT 500').all();
        io.to('admin-room').emit('admin-deposits', allDeposits);
        
      } catch (error) {
        console.error('Deposit Submission Error:', error);
        socket.emit('deposit-error', 'Failed to submit deposit. Please try again.');
      }
    });

    socket.on('admin-update-deposit-status', ({ id, status }) => {
      console.log('admin-update-deposit-status', { id, status });
      try {
        const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(id) as any;
        if (!deposit) {
          console.log('Deposit not found:', id);
          return;
        }

        const oldStatus = deposit.status;
        console.log('Old status:', oldStatus, 'New status:', status);
        if (oldStatus === status) return;

        db.prepare('UPDATE deposits SET status = ?, updatedAt = ? WHERE id = ?').run(status, Date.now(), id);

        // If approved, add funds to user balance
        if (status === 'APPROVED' && oldStatus === 'PENDING') {
          console.log('Deposit approved, updating balance for:', deposit.email);
          const user = db.prepare('SELECT * FROM users WHERE email = ?').get(deposit.email) as any;
          if (user) {
            console.log('User found for balance update:', user.email, 'Current Balance:', user.balance);
            const rate = EXCHANGE_RATES[deposit.currency] || 1;
            const depositAmountUSD = deposit.amount / rate;
            const bonusAmountUSD = (deposit.bonusAmount || 0) / rate;
            
            console.log('Deposit Details - Amount:', deposit.amount, 'Currency:', deposit.currency, 'Rate:', rate, 'USD:', depositAmountUSD);

            const newBalance = (parseFloat(user.balance) || 0) + depositAmountUSD;
            const newBonusBalance = (parseFloat(user.bonus_balance) || 0) + bonusAmountUSD;
            console.log('New Balances - Main:', newBalance, 'Bonus:', newBonusBalance);
            
            const newTurnoverRequired = (parseFloat(user.turnover_required) || 0) + (parseFloat(deposit.turnoverRequired) || 0);
            
            db.prepare('UPDATE users SET balance = ?, bonus_balance = ?, turnover_required = ? WHERE email = ?')
              .run(newBalance, newBonusBalance, newTurnoverRequired, deposit.email);
            console.log('SQLite balance updated successfully for:', deposit.email);
            
            // Update Firestore for User
            if (canSyncFirestore() && user.uid) {
              console.log('Attempting Firestore sync for user:', user.uid);
              firestore.collection('users').doc(user.uid).set({
                balance: newBalance,
                bonus_balance: newBonusBalance,
                turnover_required: newTurnoverRequired
              }, { merge: true }).catch((e: any) => {
                 if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                    firestoreDisabledDueToError = true;
                    console.warn('Firestore sync disabled globally due to PERMISSION_DENIED during deposit approval.');
                 } else {
                    console.error('Firestore user balance update error (deposit approval):', e);
                 }
              });
            } else {
              console.log('Firestore sync skipped. canSyncFirestore:', canSyncFirestore(), 'user.uid:', user.uid);
            }
            
            // --- Referral Commission Logic ---
            if (user.referredBy) {
              const referrer = db.prepare('SELECT * FROM users WHERE referralCode = ? OR uid = ? OR email = ? OR UPPER(substr(uid, 1, 8)) = UPPER(?)').get(user.referredBy, user.referredBy, user.referredBy, user.referredBy) as any;
              
              if (referrer) {
                const commissionRate = (globalReferralSettings.referralPercentage || 10) / 100;
                const commissionAmount = depositAmountUSD * commissionRate;
                
                db.prepare('UPDATE users SET referralBalance = referralBalance + ?, totalReferralEarnings = totalReferralEarnings + ? WHERE email = ?')
                  .run(commissionAmount, commissionAmount, referrer.email);
                
                // Record referral event in SQLite
                db.prepare(`
                  INSERT INTO referrals (referrerUid, referredUid, referredEmail, amount, type, timestamp)
                  VALUES (?, ?, ?, ?, ?, ?)
                `).run(referrer.uid, user.uid, user.email, commissionAmount, 'DEPOSIT', Date.now());
                
                // Notify referrer
                emitUserUpdate(referrer.email);
                const referrerSocketIds = Object.keys(connectedUsers).filter(id => connectedUsers[id].email === referrer.email);
                referrerSocketIds.forEach(socketId => {
                  io.to(socketId).emit('referral-commission-received', {
                    amount: commissionAmount,
                    from: user.email,
                    type: 'DEPOSIT'
                  });
                  io.to(socketId).emit('new-notification', {
                    id: Date.now().toString(),
                    title: 'Referral Commission!',
                    message: `You earned USD ${commissionAmount.toFixed(2)} from a referral deposit.`,
                    type: 'success',
                    timestamp: Date.now()
                  });
                });
              }
            }
            // --- End Referral Logic ---

            // Add method to allowed withdrawal methods
            const currentAllowed = user.allowed_withdrawal_methods || '';
            const methods = currentAllowed ? currentAllowed.split(',') : [];
            // Map deposit method to withdrawal method ID
            let withdrawMethodId = '';
            const depMethod = deposit.method ? deposit.method.toLowerCase() : '';
            if (depMethod.includes('bkash')) withdrawMethodId = 'bkash';
            else if (depMethod.includes('nagad')) withdrawMethodId = 'nagad';
            else if (depMethod.includes('rocket')) withdrawMethodId = 'rocket';
            else if (depMethod.includes('upay')) withdrawMethodId = 'upay';
            else if (depMethod.includes('binance')) withdrawMethodId = 'binance';
            else if (depMethod.includes('usdt') || depMethod.includes('bitcoin') || depMethod.includes('crypto')) withdrawMethodId = 'usdt';
            else if (depMethod.includes('card') || depMethod.includes('bank')) withdrawMethodId = 'bank';
            
            if (withdrawMethodId && !methods.includes(withdrawMethodId)) {
              methods.push(withdrawMethodId);
              const updatedAllowed = methods.join(',');
              db.prepare('UPDATE users SET allowed_withdrawal_methods = ? WHERE email = ?').run(updatedAllowed, deposit.email);
              
              // Notify user if connected
              const socketIds = Object.keys(connectedUsers).filter(id => connectedUsers[id].email === deposit.email);
              socketIds.forEach(socketId => {
                if (connectedUsers[socketId]) {
                  connectedUsers[socketId].allowed_withdrawal_methods = updatedAllowed;
                }
                io.to(socketId).emit('allowed-withdraw-methods-updated', updatedAllowed);
              });
            }

            // Update user data across all their connected sockets
            emitUserUpdate(deposit.email);
            
            // Also explicitly emit balance and turnover updates for backward compatibility
            emitToUser(deposit.email, 'balance-updated', { balance: newBalance, type: 'REAL' });
            emitToUser(deposit.email, 'turnover-updated', { required: newTurnoverRequired, achieved: user.turnover_achieved });
          }
        }

        const allDeposits = db.prepare('SELECT * FROM deposits ORDER BY submittedAt DESC LIMIT 500').all();
        io.to('admin-room').emit('admin-deposits', allDeposits);

        // Refresh user list for admin (only send the updated user)
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(deposit.email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));

        const userDeposits = db.prepare('SELECT * FROM deposits WHERE email = ? ORDER BY submittedAt DESC').all(deposit.email);
        const userWithdrawals = db.prepare('SELECT * FROM withdrawals WHERE email = ? ORDER BY submittedAt DESC').all(deposit.email);
        emitToUser(deposit.email, 'user-transactions', { deposits: userDeposits, withdrawals: userWithdrawals });
        
        const notifyType = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'info';
        sendNotification(
          deposit.email,
          `Deposit ${status}`,
          `Your deposit of ${deposit.currency} ${deposit.amount} has been ${status.toLowerCase()}.`,
          notifyType
        );

        emitToUser(deposit.email, 'request-status-updated', {
          requestId: deposit.id,
          status,
          message: `Your deposit of ${deposit.currency} ${deposit.amount} has been ${status.toLowerCase()}.`
        });
      } catch (error) {
        console.error('Error updating deposit status:', error);
      }
    });

    // --- Withdraw Events ---
    socket.on('submit-withdraw', (withdrawData) => {
      if (!globalPlatformSettings.isWithdrawalsEnabled) {
        socket.emit('withdraw-error', 'Withdrawals are currently disabled.');
        return;
      }
      try {
        const { email, amount, currency, method, accountDetails } = withdrawData;
        
        const limits = globalPlatformSettings.minWithdrawalLimits || {};
        const methodIdForLimit = withdrawData.method.toLowerCase();
        // Fallback to global if method limit not set
        const minWithdrawal = limits[methodIdForLimit] || globalPlatformSettings.minWithdrawalAmount || 10;
        
        if (amount < minWithdrawal) {
          socket.emit('withdraw-error', `Minimum withdrawal amount for ${withdrawData.method} is $${minWithdrawal}.`);
          return;
        }
        
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
        if (!user) {
          socket.emit('withdraw-error', 'User not found.');
          return;
        }

        // Validate method
        const allowed = user.allowed_withdrawal_methods || '';
        const allowedList = allowed.split(',');
        const methodId = method.toLowerCase();
        let isAllowed = false;
        if (methodId.includes('bkash') && allowedList.includes('bkash')) isAllowed = true;
        else if (methodId.includes('nagad') && allowedList.includes('nagad')) isAllowed = true;
        else if (methodId.includes('rocket') && allowedList.includes('rocket')) isAllowed = true;
        else if (methodId.includes('upay') && allowedList.includes('upay')) isAllowed = true;
        else if (methodId.includes('usdt') && allowedList.includes('usdt')) isAllowed = true;
        else if (methodId.includes('card') && allowedList.includes('card')) isAllowed = true;

        if (!isAllowed) {
          socket.emit('withdraw-error', 'You can only withdraw via payment methods previously used for deposits.');
          return;
        }

        const rate = EXCHANGE_RATES[currency] || 1;
        const amountUSD = amount / rate;

        // Check user balance
        const totalBalance = (user.balance || 0) + (user.bonus_balance || 0);
        if (totalBalance < amountUSD) {
          socket.emit('withdraw-error', 'Insufficient balance.');
          return;
        }

        // Check if withdrawal involves bonus balance
        const turnoverRequired = user.turnover_required || 0;
        const turnoverAchieved = user.turnover_achieved || 0;
        const turnoverMet = turnoverAchieved >= turnoverRequired;

        if (amountUSD > user.balance && !turnoverMet) {
          const bonusNeeded = amountUSD - user.balance;
          const remainingTurnover = (turnoverRequired - turnoverAchieved).toFixed(2);
          socket.emit('withdraw-error', `You can only withdraw up to your real balance ($${user.balance.toFixed(2)}) without completing turnover. You need $${remainingTurnover} more turnover to withdraw bonus funds.`);
          return;
        }

        // Deduct balance
        let newBalance = user.balance;
        let newBonusBalance = user.bonus_balance || 0;

        if (amountUSD <= user.balance) {
          newBalance -= amountUSD;
        } else {
          const fromBonus = amountUSD - user.balance;
          newBalance = 0;
          newBonusBalance -= fromBonus;
        }

        db.prepare('UPDATE users SET balance = ?, bonus_balance = ? WHERE email = ?').run(newBalance, newBonusBalance, email);

        // Update Firestore for User
        if (canSyncFirestore() && user.uid) {
          firestore.collection('users').doc(user.uid).set({
            balance: newBalance,
            bonus_balance: newBonusBalance
          }, { merge: true }).catch((e: any) => {
             if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                firestoreDisabledDueToError = true;
             } else {
                console.error('Firestore user balance update error (withdraw submit):', e);
             }
          });
        }

        const stmt = db.prepare(`
          INSERT INTO withdrawals (email, amount, currency, method, accountDetails, status, submittedAt, updatedAt, realAmount, bonusAmount)
          VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
        `);
        
        const now = Date.now();
        const info = stmt.run(email, amount, currency, method, accountDetails, now, now, newBalance === 0 ? user.balance : amountUSD, newBalance === 0 ? amountUSD - user.balance : 0);
        const withdrawalId = info.lastInsertRowid;
        
        // Update connected user balance
        emitUserUpdate(email);
        emitToUser(email, 'balance-updated', { balance: newBalance, type: 'REAL' });

        socket.emit('withdraw-submitted', { id: withdrawalId, status: 'PENDING', newBalance });
        
        logActivity(email, 'WITHDRAW_SUBMIT', `Method: ${method}, Amount: ${amount} ${currency}`);

        // Notify admins
        io.to('admin-room').emit('new-withdraw-notification', { id: withdrawalId, email, amount, method, accountDetails, submittedAt: now });
        
        const allWithdrawals = db.prepare('SELECT * FROM withdrawals ORDER BY submittedAt DESC').all();
        io.to('admin-room').emit('admin-withdrawals', allWithdrawals);
        
      } catch (error) {
        console.error('Withdraw Submission Error:', error);
        socket.emit('withdraw-error', 'Failed to submit withdrawal. Please try again.');
      }
    });

    socket.on('cancel-withdrawal', ({ id, email }) => {
      socket.emit('withdraw-error', 'Withdrawal cancellation is disabled. Please contact support.');
    });

    socket.on('admin-update-withdraw-status', ({ id, status, reason }) => {
      console.log('admin-update-withdraw-status', { id, status, reason });
      try {
        const withdrawal = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(id) as any;
        if (!withdrawal) {
          console.log('Withdrawal not found:', id);
          return;
        }

        const oldStatus = withdrawal.status;
        console.log('Old status:', oldStatus, 'New status:', status);
        if (oldStatus === status) return;

        db.prepare('UPDATE withdrawals SET status = ?, updatedAt = ?, rejectionReason = ? WHERE id = ?').run(status, Date.now(), reason || null, id);
        console.log('Withdrawal status updated in SQLite');

        // If cancelled, return funds to user balance
        if (status === 'CANCELLED' && oldStatus === 'PENDING') {
          console.log('Cancelling withdrawal, returning funds');
          const user = db.prepare('SELECT balance FROM users WHERE email = ?').get(withdrawal.email) as any;
          if (user) {
            const newBalance = user.balance + withdrawal.amount;
            db.prepare('UPDATE users SET balance = ? WHERE email = ?').run(newBalance, withdrawal.email);
            console.log('SQLite balance updated (returned funds)');
            
            // Update Firestore for User
            if (canSyncFirestore()) {
              const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(withdrawal.email) as any;
              if (userFromDb && userFromDb.uid) {
                console.log('Syncing to Firestore for user:', userFromDb.uid);
                firestore.collection('users').doc(userFromDb.uid).set({
                  balance: newBalance
                }, { merge: true }).catch((e: any) => {
                   if (e.code === 7 || (e.message && e.message.includes('PERMISSION_DENIED'))) {
                      firestoreDisabledDueToError = true;
                   } else {
                      console.error('Firestore user balance update error (withdrawal cancel):', e);
                   }
                });
              }
            }
            
            emitUserUpdate(withdrawal.email);
            emitToUser(withdrawal.email, 'balance-updated', { balance: newBalance, type: 'REAL' });
          }
        }

        const allWithdrawals = db.prepare('SELECT * FROM withdrawals ORDER BY submittedAt DESC').all();
        io.to('admin-room').emit('admin-withdrawals', allWithdrawals);

        // Refresh user list for admin (only send the updated user)
        const updatedUser = db.prepare('SELECT * FROM users WHERE email = ?').get(withdrawal.email) as any;
        if (updatedUser) {
          io.to('admin-room').emit('admin-user-updated', updatedUser);
        }
        io.to('admin-room').emit('admin-users', Object.values(connectedUsers));

        const userDeposits = db.prepare('SELECT * FROM deposits WHERE email = ? ORDER BY submittedAt DESC').all(withdrawal.email);
        const userWithdrawals = db.prepare('SELECT * FROM withdrawals WHERE email = ? ORDER BY submittedAt DESC').all(withdrawal.email);
        emitToUser(withdrawal.email, 'user-transactions', { deposits: userDeposits, withdrawals: userWithdrawals });
        
        const notifyType = status === 'APPROVED' ? 'success' : (status === 'REJECTED' || status === 'CANCELLED') ? 'error' : 'info';
        sendNotification(
          withdrawal.email,
          `Withdrawal ${status}`,
          `Your withdrawal of ${withdrawal.currency} ${withdrawal.amount} has been ${status.toLowerCase()}. ${reason ? `Reason: ${reason}` : ''}`,
          notifyType
        );

        emitToUser(withdrawal.email, 'request-status-updated', {
          requestId: withdrawal.id,
          status,
          message: `Your withdrawal of ${withdrawal.currency} ${withdrawal.amount} has been ${status.toLowerCase()}.`
        });
      } catch (error) {
        console.error('Error updating withdraw status:', error);
      }
    });

    // --- KYC Events ---
    socket.on('submit-kyc', (kycData) => {
      console.log('KYC Submission Data:', kycData);
      try {
        const { email, documentType, documentNumber, fullName, dateOfBirth, gender, frontImage, backImage, selfieImage } = kycData;
        
        if (!email || !documentType || !documentNumber || !fullName || !dateOfBirth || !gender || !frontImage || !selfieImage) {
          socket.emit('kyc-error', 'Missing required fields.');
          return;
        }
        
        // Check if user already has a pending or verified KYC
        const existing = db.prepare('SELECT status FROM kyc_submissions WHERE email = ? AND (status = \'PENDING\' OR status = \'VERIFIED\')').get(email);
        
        if (existing) {
          socket.emit('kyc-error', 'You already have a pending or verified KYC submission.');
          return;
        }

        const stmt = db.prepare(`
          INSERT INTO kyc_submissions (email, documentType, documentNumber, fullName, dateOfBirth, gender, frontImage, backImage, selfieImage, submittedAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        const now = Date.now();
        const result = stmt.run(email, documentType, documentNumber, fullName, dateOfBirth, gender, frontImage, backImage, selfieImage, now, now);
        
        socket.emit('kyc-submitted', { status: 'PENDING' });
        
        // Sync to Firestore
        if (canSyncFirestore()) {
          const kycId = result.lastInsertRowid.toString();
          firestore.collection('kyc_submissions').doc(kycId).set({
            id: kycId,
            email, documentType, documentNumber, fullName, dateOfBirth, gender, frontImage, backImage, selfieImage, 
            status: 'PENDING',
            submittedAt: now, 
            updatedAt: now
          }).catch((e: any) => handleFirestoreError(e, 'KYC submission sync'));
        }
        
        // Update user status in memory
        const user = Object.values(connectedUsers).find(u => u.email === email);
        if (user) {
          user.kycStatus = 'PENDING';
          io.to(user.socketId).emit('kyc-status-updated', { status: 'PENDING' });
        }

        socket.emit('kyc-submitted', { status: 'PENDING' });
        
        logActivity(email, 'KYC_SUBMIT', `Type: ${documentType}, Name: ${fullName}`);

        // Notify admins
        io.to('admin-room').emit('new-kyc-notification', { email, fullName, submittedAt: now });
        
        // Refresh admin KYC list
        const allKyc = db.prepare('SELECT * FROM kyc_submissions ORDER BY submittedAt DESC').all();
        io.to('admin-room').emit('admin-kyc-list', allKyc);
      } catch (error) {
        console.error('KYC Submission Error:', error);
        socket.emit('kyc-error', 'Failed to submit KYC. Please try again.');
      }
    });

    socket.on('get-kyc-status', (email) => {
      let kyc = db.prepare('SELECT status, rejectionReason FROM kyc_submissions WHERE email = ? ORDER BY submittedAt DESC LIMIT 1').get(email) as any;
      if (!kyc) {
        const user = db.prepare('SELECT kycStatus FROM users WHERE email = ?').get(email) as any;
        if (user && user.kycStatus && user.kycStatus !== 'NONE') {
          kyc = { status: user.kycStatus, rejectionReason: null };
        }
      }
      socket.emit('kyc-status', kyc || { status: 'NOT_SUBMITTED' });
    });

    socket.on('get-allowed-withdraw-methods', (email) => {
      const user = db.prepare('SELECT allowed_withdrawal_methods FROM users WHERE email = ?').get(email) as any;
      socket.emit('allowed-withdraw-methods', user ? user.allowed_withdrawal_methods : '');
    });

    socket.on('admin-get-kyc-list', async () => {
      try {
        let allKyc = db.prepare('SELECT * FROM kyc_submissions ORDER BY submittedAt DESC').all();
        
        // If local list is empty, try to recover from Firestore
        if (allKyc.length === 0 && canSyncFirestore()) {
          const snapshot = await firestore.collection('kyc_submissions').orderBy('submittedAt', 'desc').get();
          if (!snapshot.empty) {
            allKyc = snapshot.docs.map((doc: any) => doc.data());
            // Populate local DB for faster access next time
            allKyc.forEach((kyc: any) => {
              try {
                db.prepare(`
                  INSERT OR IGNORE INTO kyc_submissions (id, email, documentType, documentNumber, fullName, dateOfBirth, frontImage, backImage, selfieImage, status, submittedAt, updatedAt, rejectionReason)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(kyc.id, kyc.email, kyc.documentType, kyc.documentNumber, kyc.fullName, kyc.dateOfBirth, kyc.frontImage, kyc.backImage, kyc.selfieImage, kyc.status, kyc.submittedAt, kyc.updatedAt, kyc.rejectionReason || null);
              } catch (e) {}
            });
          }
        }
        
        socket.emit('admin-kyc-list', allKyc);
      } catch (error) {
        console.error('Error fetching KYC list:', error);
      }
    });

    socket.on('admin-update-kyc-status', ({ id, status, reason }) => {
      try {
        const now = Date.now();
        db.prepare('UPDATE kyc_submissions SET status = ?, rejectionReason = ?, updatedAt = ? WHERE id = ?')
          .run(status, reason || null, now, id);
        
        // Update Firestore KYC submission
        if (canSyncFirestore()) {
          firestore.collection('kyc_submissions').doc(id.toString()).set({
            status,
            rejectionReason: reason || null,
            updatedAt: now
          }, { merge: true }).catch((e: any) => handleFirestoreError(e, 'KYC submission status update'));
        }

        const kyc = db.prepare('SELECT email FROM kyc_submissions WHERE id = ?').get(id) as any;
        
        if (kyc) {
          // Update the users table
          db.prepare('UPDATE users SET kycStatus = ? WHERE email = ?').run(status, kyc.email);
          
          // Update Firestore
          if (canSyncFirestore()) {
            const userFromDb = db.prepare('SELECT uid FROM users WHERE email = ?').get(kyc.email) as any;
            if (userFromDb && userFromDb.uid) {
              firestore.collection('users').doc(userFromDb.uid).set({
                kycStatus: status
              }, { merge: true }).catch((e: any) => console.error('Firestore user kycStatus update error:', e));
            }
          }

          // Notify the user if connected
          emitUserUpdate(kyc.email);
          emitToUser(kyc.email, 'kyc-status-updated', { status, reason });

          const notifyType = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'error' : 'info';
          sendNotification(
            kyc.email,
            `Verification ${status}`,
            `Your account verification (KYC) has been ${status.toLowerCase()}.${reason ? ` Reason: ${reason}` : ''}`,
            notifyType
          );
        }
        
        // Refresh admin KYC list
        const allKyc = db.prepare('SELECT * FROM kyc_submissions ORDER BY submittedAt DESC').all();
        io.to('admin-room').emit('admin-kyc-list', allKyc);
      } catch (error) {
        console.error('Admin KYC Update Error:', error);
      }
    });

    socket.on('admin-pump-dump', ({ asset, amount }) => {
      if (assets[asset]) {
        assets[asset].price += amount;
      }
    });

    socket.on('admin-force-trade', ({ tradeId, result }) => {
      if (activeTrades[tradeId]) {
        activeTrades[tradeId].forcedResult = result; // 'WIN' or 'LOSS'
        
        // Immediately manipulate price if forced manually
        const activeTrade = activeTrades[tradeId];
        const assetKey = activeTrade.assetShortName || activeTrade.asset;
        const asset = assets[assetKey as keyof typeof assets];
        if (asset) {
          const isUp = activeTrade.type === 'UP';
          const shouldWin = result === 'WIN';
          const needsUp = (isUp && shouldWin) || (!isUp && !shouldWin);
          const offset = asset.volatility * 2;
          
          const currentPrice = asset.price;
          let target = activeTrade.entryPrice + (needsUp ? offset : -offset);
          
          if (needsUp && currentPrice < activeTrade.entryPrice) {
             target = activeTrade.entryPrice + Math.abs(activeTrade.entryPrice - currentPrice) + offset;
          } else if (!needsUp && currentPrice > activeTrade.entryPrice) {
             target = activeTrade.entryPrice - Math.abs(activeTrade.entryPrice - currentPrice) - offset;
          }
          
          asset.targetPrice = target;
        }
      }
    });

    socket.on('generate-2fa-secret', async (email: string) => {
      try {
        const secret = generateSecret();
        const otpauth = generateURI({
          issuer: 'Trading Platform',
          label: email,
          secret
        });
        const qrCodeUrl = await QRCode.toDataURL(otpauth);
        
        socket.emit('2fa-secret-generated', { secret, qrCodeUrl });
      } catch (error) {
        console.error('Error generating 2FA secret:', error);
        socket.emit('2fa-error', 'Failed to generate 2FA secret');
      }
    });

    socket.on('enable-2fa', async ({ email, secret, code }: { email: string, secret: string, code: string }) => {
      try {
        const result = await verify({ token: code, secret });
        if (result.valid) {
          db.prepare('UPDATE users SET twoFactorSecret = ?, twoFactorEnabled = 1 WHERE email = ?').run(secret, email);
          socket.emit('2fa-enabled-success');
          
          // Log activity
          db.prepare('INSERT INTO activity_logs (email, action, details, timestamp) VALUES (?, ?, ?, ?)')
            .run(email, '2FA_ENABLED', 'Two-factor authentication enabled', Date.now());
        } else {
          socket.emit('2fa-error', 'Invalid verification code');
        }
      } catch (error) {
        console.error('Error enabling 2FA:', error);
        socket.emit('2fa-error', 'Failed to enable 2FA');
      }
    });

    socket.on('disable-2fa', async ({ email, code }: { email: string, code: string }) => {
      try {
        const user = db.prepare('SELECT twoFactorSecret FROM users WHERE email = ?').get(email);
        if (!user || !user.twoFactorSecret) {
          socket.emit('2fa-error', '2FA is not enabled');
          return;
        }

        const result = await verify({ token: code, secret: user.twoFactorSecret });
        if (result.valid) {
          db.prepare('UPDATE users SET twoFactorSecret = NULL, twoFactorEnabled = 0 WHERE email = ?').run(email);
          socket.emit('2fa-disabled-success');
          
          // Log activity
          db.prepare('INSERT INTO activity_logs (email, action, details, timestamp) VALUES (?, ?, ?, ?)')
            .run(email, '2FA_DISABLED', 'Two-factor authentication disabled', Date.now());
        } else {
          socket.emit('2fa-error', 'Invalid verification code');
        }
      } catch (error) {
        console.error('Error disabling 2FA:', error);
        socket.emit('2fa-error', 'Failed to disable 2FA');
      }
    });

    socket.on('check-2fa-status', (email: string) => {
      const user = db.prepare('SELECT twoFactorEnabled FROM users WHERE email = ?').get(email);
      socket.emit('2fa-status', !!user?.twoFactorEnabled);
    });

    socket.on('admin-get-user-logs', async (email) => {
      try {
        const activityLogs = db.prepare('SELECT * FROM activity_logs WHERE email = ? ORDER BY timestamp DESC').all(email);
        const deposits = db.prepare('SELECT * FROM deposits WHERE email = ? ORDER BY submittedAt DESC').all(email);
        const withdrawals = db.prepare('SELECT * FROM withdrawals WHERE email = ? ORDER BY submittedAt DESC').all(email);
        const kyc = db.prepare('SELECT * FROM kyc_submissions WHERE email = ? ORDER BY submittedAt DESC').all(email);
        
        // Fetch trades from Local DB (Super Fast)
        let trades: any[] = [];
        const userFromDb = db.prepare('SELECT trades FROM users WHERE email = ?').get(email) as any;
        if (userFromDb && userFromDb.trades) {
            try {
                trades = JSON.parse(userFromDb.trades);
            } catch (e) {
                trades = [];
            }
        }
        
        socket.emit('admin-user-logs', { 
            email, 
            activityLogs, 
            trades: trades.filter((t: any) => t.accountType === 'REAL'), 
            deposits, 
            withdrawals, 
            kyc 
        });
      } catch (error) {
        console.error('Get Logs Error:', error);
      }
    });
  }); // Close io.on('connection')

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite in middleware mode...');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware applied');
    } catch (viteError) {
      console.error('Vite initialization error:', viteError);
    }
  } else {
    console.log('Running in production mode, serving dist folder...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error('Server error:', e);
    }
  });

  const port = process.env.PORT || 3000;
  const host = '0.0.0.0';

  httpServer.listen(Number(port), host, () => {
    console.log(`Server is running on http://${host}:${port}`);
  });
}

function updateDailyStats(amount: number, profit: number, isWin: boolean) {
  const date = new Date().toISOString().split('T')[0];
  const stats = db.prepare('SELECT * FROM trade_stats WHERE date = ?').get(date) as any;
  
  const userProfit = isWin ? profit : 0;
  const userLoss = isWin ? 0 : amount;
  const houseNet = userLoss - userProfit;

  if (stats) {
    db.prepare(`
      UPDATE trade_stats 
      SET total_trades = total_trades + 1,
          total_volume = total_volume + ?,
          total_user_profit = total_user_profit + ?,
          total_user_loss = total_user_loss + ?,
          house_net = house_net + ?
      WHERE date = ?
    `).run(amount, userProfit, userLoss, houseNet, date);
  } else {
    db.prepare(`
      INSERT INTO trade_stats (date, total_trades, total_volume, total_user_profit, total_user_loss, house_net)
      VALUES (?, 1, ?, ?, ?, ?)
    `).run(date, amount, userProfit, userLoss, houseNet);
  }
}

function saveTradeSettings(settings: any) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('trade_settings', JSON.stringify(settings));
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
