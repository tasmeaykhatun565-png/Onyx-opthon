import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageCircle, ChevronRight, Globe, Phone, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from './utils';
import { motion } from 'motion/react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'admin' | 'system';
  timestamp: number;
};

type Country = {
  id: string;
  name: string;
  language: string;
  flag: string;
  greeting: string;
};

const COUNTRIES: Country[] = [
  { 
    id: 'bd', 
    name: 'Bangladesh', 
    language: 'Bengali', 
    flag: '🇧🇩',
    greeting: 'OnyxTrade এ আপনাকে স্বাগতম! এটি বিশ্বের সবচেয়ে নিরাপদ এবং দ্রুততম ট্রেডিং প্ল্যাটফর্ম। আমাদের সাপোর্ট টিম ২৪/৭ আপনার পাশে আছে। আজ আপনাকে কিভাবে সাহায্য করতে পারি?'
  },
  { 
    id: 'in', 
    name: 'India', 
    language: 'Hindi', 
    flag: '🇮🇳',
    greeting: 'OnyxTrade में आपका स्वागत है! यह दुनिया का सबसे सुरक्षित और सबसे तेज़ ट्रेडिंग प्लेटफॉर्म है। हमारी सहायता टीम 24/7 आपके साथ है। आज हम आपकी कैसे मदद कर सकते हैं?'
  },
  { 
    id: 'pk', 
    name: 'Pakistan', 
    language: 'Urdu', 
    flag: '🇵🇰',
    greeting: 'OnyxTrade میں خوش آمدید! یہ دنیا کا سب سے محفوظ اور تیز ترین ٹریڈنگ پلیٹ فارم ہے۔ ہماری سپورٹ ٹیم 24/7 آپ کے ساتھ ہے۔ آج ہم آپ کی کیسے مدد کر سکتے ہیں؟'
  },
   { 
    id: 'id', 
    name: 'Indonesia', 
    language: 'Indonesian', 
    flag: '🇮🇩',
    greeting: 'Selamat datang di OnyxTrade! Ini adalah platform perdagangan teraman dan tercepat di dunia. Tim dukungan kami ada di sini untuk Anda 24/7. Bagaimana kami dapat membantu Anda hari ini?'
  },
  { 
    id: 'vn', 
    name: 'Vietnam', 
    language: 'Vietnamese', 
    flag: '🇻🇳',
    greeting: 'Chào mừng bạn đến với OnyxTrade! Đây là nền tảng giao dịch an toàn và nhanh nhất thế giới. Đội ngũ hỗ trợ của chúng tôi luôn bên bạn 24/7. Hôm nay chúng tôi có thể giúp gì cho bạn?'
  },
  { 
    id: 'br', 
    name: 'Brazil', 
    language: 'Portuguese', 
    flag: '🇧🇷',
    greeting: 'Bem-vindo ao OnyxTrade! Esta é a plataforma de negociação mais segura e rápida do mundo. Nossa equipe de suporte está aqui para você 24/7. Como podemos ajudá-lo hoje?'
  },
  { 
    id: 'global', 
    name: 'Global (English)', 
    language: 'English', 
    flag: '🌍',
    greeting: 'Welcome to OnyxTrade! This is the world\'s most secure and fastest trading platform. Our support team is here for you 24/7. How can we help you today?'
  },
];

interface SupportChatProps {
  onClose: () => void;
  supportSettings: { telegram: string; whatsapp: string; email: string; supportStatus?: 'online' | 'offline' };
  socket: any;
  userEmail: string;
  chatBackground?: string | null;
}

export default function SupportChat({ onClose, supportSettings, socket, userEmail, chatBackground }: SupportChatProps) {
  const [chatStep, setChatStep] = useState<'country' | 'chat'>('country');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [chatStatus, setChatStatus] = useState<'active' | 'closed'>('active');
  const [supportStatus, setSupportStatus] = useState<'online' | 'offline'>(supportSettings.supportStatus || 'online');
  const [connectionError, setConnectionError] = useState<boolean>(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);

  const QUICK_REPLIES = [
    { id: 'verify', text: 'How to verify account?' },
    { id: 'deposit', text: 'Minimum deposit amount?' },
    { id: 'withdraw', text: 'Withdrawal time?' },
    { id: 'bonus', text: 'How to get bonuses?' },
  ];

  const handleQuickReply = (text: string) => {
    setInputText(text);
    // We'll trigger the send in the next tick or just call handleSendMessage with the text
    setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as any;
        handleSendMessage(text);
    }, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, chatStep]);

  useEffect(() => {
    // SupportChat mounted
    if (chatStep === 'chat' && socket && userEmail) {
      socket.emit('join-chat', userEmail);
      
      const handleNewMessage = (message: any) => {
        setMessages(prev => [...prev, message]);
        setIsTyping(false);
      };

      const handleChatHistory = (history: any[]) => {
        if (history && history.length > 0) {
          setMessages(history);
        } else if (selectedCountry) {
          // Add initial greeting if no messages
          setMessages([{
            id: 'welcome',
            text: selectedCountry.greeting,
            sender: 'support',
            timestamp: Date.now()
          }]);
        }
      };

      const handleChatClosed = () => {
        setChatStatus('closed');
      };

      const handleChatHistoryDeleted = () => {
        setMessages([]);
        setChatStep('country');
        setChatStatus('active');
      };

      const handleChatStatus = (status: 'active' | 'closed') => {
        setChatStatus(status);
      };

      const handleSupportStatusUpdate = (status: 'online' | 'offline') => {
        setSupportStatus(status);
      };

      socket.on('new-chat-message', handleNewMessage);
      socket.on('chat-history', handleChatHistory);
      socket.on('chat-closed', handleChatClosed);
      socket.on('chat-history-deleted', handleChatHistoryDeleted);
      socket.on('chat-status', handleChatStatus);
      socket.on('support-status-update', handleSupportStatusUpdate);

      return () => {
        socket.off('new-chat-message', handleNewMessage);
        socket.off('chat-history', handleChatHistory);
        socket.off('chat-closed', handleChatClosed);
        socket.off('chat-history-deleted', handleChatHistoryDeleted);
        socket.off('chat-status', handleChatStatus);
        socket.off('support-status-update', handleSupportStatusUpdate);
      };
    }
  }, [userEmail, chatStep, selectedCountry, socket]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };


  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setChatStep('chat');
    setChatStatus('active');
  };

  const handleSendMessage = (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim() || !socket || chatStatus === 'closed') return;

    if (!overrideText) setInputText('');
    setIsTyping(true);

    socket.emit('chat-message', {
      email: userEmail,
      text: textToSend,
      sender: 'user'
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:p-4 pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full h-full sm:w-[400px] sm:h-[650px] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-[var(--bg-primary)] sm:rounded-2xl shadow-2xl overflow-hidden border border-[#2a2b30] pointer-events-auto shrink-0 relative"
      >
        {/* Header - Advanced Zendesk/Intercom style */}
        <div className="bg-gradient-to-r from-[#1a1b20] to-[#25262c] text-white px-5 py-6 sm:rounded-t-2xl shadow-md border-b border-[#333] relative overflow-hidden">
          {/* Subtle bg glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />

          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-black tracking-tight text-white/90">OnyxTrade Support</h2>
                <div className="bg-blue-500/20 text-blue-400 text-[10px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-sm">Premium</div>
              </div>
              <p className="text-sm font-medium text-white/60 mb-4">We usually reply in under 2 minutes.</p>
              
              {/* Agent avatars */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#1a1b20] bg-blue-600 flex items-center justify-center text-[10px] font-bold shadow-md">OS</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#1a1b20] bg-emerald-600 flex items-center justify-center text-[10px] font-bold shadow-md z-10">JM</div>
                  <div className="w-8 h-8 rounded-full border-2 border-[#1a1b20] bg-rose-600 flex items-center justify-center text-[10px] font-bold shadow-md z-20">AT</div>
                </div>
                <div className="flex items-center gap-1.5 bg-black/20 rounded-full px-2.5 py-1 backdrop-blur-md border border-white/5">
                   <div className={cn("w-2 h-2 rounded-full", supportStatus === 'online' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-red-500")} />
                   <span className="text-[11px] font-bold text-white/80">{supportStatus === 'online' ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/50 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 overflow-y-auto bg-[#0f1117] touch-pan-y relative"
          style={{ 
            backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {chatBackground && <div className="absolute inset-0 bg-[#0f1117]/80 backdrop-blur-sm pointer-events-none" />}
          
          {connectionError && (
            <div className="absolute inset-0 z-50 bg-[#0f1117]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle size={48} className="text-rose-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Connection Issue</h3>
              <p className="text-sm text-gray-400 mb-6">We're having trouble connecting to the chat. Please check your internet or try again.</p>
              <button 
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
              >
                Retry Connection
              </button>
            </div>
          )}

          <div className="relative z-10 min-h-full flex flex-col justify-end">
            {chatStep === 'country' ? (
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-white/90 mb-1">Select your region</h3>
                  <p className="text-xs text-white/50">To connect you with the right support team</p>
                </div>
                <div className="grid gap-2">
                  {COUNTRIES.map((country) => (
                    <motion.button
                      key={country.id}
                      onClick={() => handleCountrySelect(country)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex border items-center justify-between p-3.5 bg-[#1a1b20] hover:bg-[#20222a] border-[#2a2b30] hover:border-blue-500/50 rounded-xl transition-all group shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl drop-shadow-md">{country.flag}</span>
                        <div className="text-left">
                          <div className="text-white/90 font-semibold text-sm">{country.name}</div>
                          <div className="text-[11px] text-white/40">{country.language}</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/20 group-hover:text-blue-500 transition-colors" />
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-5">
                {/* Messages */}
                {messages.map((msg, idx) => {
                  const isSupport = msg.sender === 'support' || msg.sender === 'admin';
                  const showAvatar = isSupport && (idx === 0 || messages[idx - 1].sender === 'user');
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex w-full gap-2",
                        msg.sender === 'user' ? "justify-end" : msg.sender === 'system' ? "justify-center" : "justify-start"
                      )}
                    >
                      {msg.sender === 'system' ? (
                        <div className="bg-[#1a1b20] border border-[#2a2b30] px-4 py-1 rounded-full text-[10px] font-black tracking-widest text-white/40 uppercase shadow-sm">
                          {msg.text}
                        </div>
                      ) : (
                        <>
                          {isSupport && (
                            <div className="w-7 shrink-0 flex items-end">
                              {showAvatar ? (
                                <div className="w-7 h-7 rounded-full bg-blue-600 flex flex-col items-center justify-center text-white shadow-md shadow-blue-900/20">
                                  <span className="text-[10px] font-bold">OS</span>
                                </div>
                              ) : <div className="w-7 h-7" />}
                            </div>
                          )}
                          <div 
                            className={cn(
                              "max-w-[80%] rounded-[18px] px-4 py-3 leading-relaxed shadow-sm relative text-[13px] md:text-sm font-medium",
                              msg.sender === 'user' 
                                ? "bg-blue-600 text-white rounded-br-sm shadow-blue-600/20" 
                                : "bg-[#1a1b20] text-gray-200 rounded-bl-sm border border-[#2a2b30]"
                            )}
                          >
                            {msg.text}
                            <div 
                              className={cn(
                                "mt-1 opacity-60 text-[9px] font-bold text-right",
                                msg.sender === 'user' ? "text-blue-200" : "text-gray-500"
                              )}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                
                {isTyping && (
                  <div className="flex w-full gap-2 justify-start">
                    <div className="w-7 shrink-0 flex items-end">
                       <div className="w-7 h-7 rounded-full bg-blue-600 flex flex-col items-center justify-center text-white shadow-md"><span className="text-[10px] font-bold">OS</span></div>
                    </div>
                    <div className="bg-[#1a1b20] rounded-[18px] rounded-bl-sm px-4 py-3 border border-[#2a2b30] text-gray-400">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                    </div>
                  </div>
                )}
                
                {/* Quick Replies */}
                {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'support' && (
                  <div className="flex flex-wrap gap-2 pt-2 ml-9">
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply.text)}
                        className="text-[11px] font-semibold bg-transparent text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-full hover:bg-blue-500/10 hover:border-blue-500 transition active:scale-95 shadow-sm"
                      >
                        {reply.text}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        {chatStep === 'chat' && (
          <div className="bg-[#1a1b20] p-4 border-t border-[#2a2b30] z-20">
            {chatStatus === 'closed' ? (
              <div className="text-center py-2">
                <button 
                  onClick={() => {
                    setChatStep('country');
                    setMessages([]);
                    setChatStatus('active');
                    if (socket && userEmail) socket.emit('start-new-chat', userEmail);
                  }}
                  className="w-full bg-[#2a2b30] hover:bg-[#32343a] text-white py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <div className="flex items-center bg-[#0f1117] rounded-full p-1.5 pr-2 border border-[#2a2b30] focus-within:border-blue-500/50 transition">
                <button className="p-2 text-gray-500 hover:text-gray-300 transition shrink-0"><Globe size={18} /></button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write a message..."
                  className="flex-1 bg-transparent text-white placeholder-gray-600 focus:outline-none text-[13px] px-2 font-medium"
                />
                <button 
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isTyping}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 disabled:bg-[#2a2b30] disabled:text-gray-500 transition shrink-0 shadow-sm"
                >
                  {isTyping ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="relative left-[1px]" />}
                </button>
              </div>
            )}
            
            <div className="text-center mt-3 flex justify-center items-center gap-1">
              <Phone size={10} className="text-gray-600" />
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Secured by OnyxGuard 256-bit</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
