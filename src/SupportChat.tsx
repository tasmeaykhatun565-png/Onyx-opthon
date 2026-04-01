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
  supportSettings: { telegram: string; whatsapp: string; email: string };
  socket: any;
  userEmail: string;
  chatBackground?: string | null;
}

export default function SupportChat({ onClose, supportSettings, socket, userEmail, chatBackground }: SupportChatProps) {
  const [chatStep, setChatStep] = useState<'country' | 'chat'>('country');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [chatStatus, setChatStatus] = useState<'active' | 'closed'>('active');
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
    console.log('SupportChat mounted, socket:', socket, 'userEmail:', userEmail, 'chatStep:', chatStep);
    if (chatStep === 'chat' && socket && userEmail) {
      socket.emit('join-chat', userEmail);
      
      const handleNewMessage = (message: any) => {
        console.log('New message received:', message);
        setMessages(prev => [...prev, message]);
        setIsTyping(false);
      };

      const handleChatHistory = (history: any[]) => {
        console.log('Chat history received:', history);
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

      socket.on('new-chat-message', handleNewMessage);
      socket.on('chat-history', handleChatHistory);
      socket.on('chat-closed', handleChatClosed);
      socket.on('chat-history-deleted', handleChatHistoryDeleted);
      socket.on('chat-status', handleChatStatus);

      return () => {
        socket.off('new-chat-message', handleNewMessage);
        socket.off('chat-history', handleChatHistory);
        socket.off('chat-closed', handleChatClosed);
        socket.off('chat-history-deleted', handleChatHistoryDeleted);
        socket.off('chat-status', handleChatStatus);
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
    <motion.div 
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-[var(--bg-primary)] flex flex-col h-full w-full md:max-w-md md:right-0 md:left-auto md:border-l md:border-[var(--border-color)] shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white">
              <MessageCircle size={20} />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--bg-secondary)] rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">Onyx Support</h3>
            <p className="text-xs text-green-400 font-medium">Online</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.location.hash = '#help-center'}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded-full transition"
            title="Help Center"
          >
            <BookOpen size={20} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        className="flex-1 overflow-y-auto bg-[var(--bg-primary)] touch-pan-y select-none relative"
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {chatBackground && (
          <div className="absolute inset-0 bg-black/40 pointer-events-none" />
        )}
        {connectionError && (
          <div className="absolute inset-0 z-10 bg-[var(--bg-primary)]/90 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle size={48} className="text-rose-500 mb-4" />
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Connection Issue</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">We're having trouble connecting to the chat. Please check your internet or try again.</p>
            <button 
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95"
            >
              Retry Connection
            </button>
          </div>
        )}
        {chatStep === 'country' ? (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-3 mb-8">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto text-blue-500 mb-4">
                <Globe size={32} />
              </div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Welcome to OnyxTrade</h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                The world's most trusted trading platform. Experience fast withdrawals and 24/7 premium support.
              </p>
              <p className="text-[var(--text-primary)] font-medium pt-2">Please select your country to continue:</p>
            </div>
            
            <div className="space-y-3">
              {COUNTRIES.map((country) => (
                <motion.button
                  key={country.id}
                  onClick={() => handleCountrySelect(country)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-between p-4 bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] hover:border-blue-500/30 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{country.flag}</span>
                    <div className="text-left">
                      <div className="text-[var(--text-primary)] font-medium">{country.name}</div>
                      <div className="text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-secondary)]/80 transition-colors">{country.language}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
                </motion.button>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)]">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-4 text-center">Or contact us directly</p>
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={supportSettings.telegram} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/80 transition group"
                >
                  <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition">
                    <Send size={20} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Telegram</span>
                </a>
                <a 
                  href={supportSettings.whatsapp} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/80 transition group"
                >
                  <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 group-hover:scale-110 transition">
                    <Phone size={20} />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 min-h-full flex flex-col justify-end">
             {/* Messages */}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex w-full",
                  msg.sender === 'user' ? "justify-end" : msg.sender === 'system' ? "justify-center" : "justify-start"
                )}
              >
                {msg.sender === 'system' ? (
                  <div className="bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] px-4 py-1.5 rounded-full text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest my-2">
                    {msg.text}
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-3 leading-relaxed transition-all duration-75 ease-out shadow-sm",
                      msg.sender === 'user' 
                        ? "bg-blue-600 text-white rounded-br-none" 
                        : "bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-none border border-[var(--border-color)]"
                    )}
                  >
                    {msg.text}
                    <div 
                      className={cn(
                        "mt-1 opacity-50 transition-all duration-75 ease-out",
                        msg.sender === 'user' ? "text-blue-100" : "text-[var(--text-secondary)]"
                      )}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start w-full">
                <div className="bg-[var(--bg-secondary)] rounded-2xl rounded-bl-none px-4 py-2 border border-[var(--border-color)] flex items-center gap-2 text-[var(--text-secondary)]">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="text-xs font-medium">
                    {selectedCountry?.id === 'bd' ? 'সাপোর্ট টাইপ করছে...' : 
                     selectedCountry?.id === 'in' ? 'सपोर्ट टाइप कर रहा है...' :
                     selectedCountry?.id === 'pk' ? 'سپورٹ ٹائپ کر رہا ہے...' :
                     selectedCountry?.id === 'id' ? 'Dukungan sedang mengetik...' :
                     selectedCountry?.id === 'vn' ? 'Hỗ trợ đang soạn tin...' :
                     selectedCountry?.id === 'br' ? 'Suporte está digitando...' :
                     'Support is typing...'}
                  </span>
                </div>
              </div>
            )}
            {/* Quick Replies */}
            {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'support' && (
              <div className="flex flex-wrap gap-2 pt-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleQuickReply(reply.text)}
                    className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition active:scale-95"
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

      {/* Input Area - Only show in chat mode */}
      {chatStep === 'chat' && (
        <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
          {chatStatus === 'closed' ? (
            <div className="text-center py-2">
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-3">This session has ended</p>
              <button 
                onClick={() => {
                  setChatStep('country');
                  setMessages([]);
                  setChatStatus('active');
                  if (socket && userEmail) {
                    socket.emit('start-new-chat', userEmail);
                  }
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[var(--bg-primary)] rounded-xl px-4 py-2 border border-[var(--border-color)] focus-within:border-blue-500/50 transition">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none text-sm"
              />
              <button 
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                className="p-2 text-blue-500 hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
