import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Paperclip, ChevronRight, Globe, Phone, AlertCircle, Smile, ShieldCheck, CheckCheck } from 'lucide-react';
import { cn } from './utils';
import { motion, AnimatePresence } from 'motion/react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'support' | 'admin' | 'system';
  timestamp: number;
};



const AGENTS = [
  { id: '1', initials: 'OS', name: 'Olivia S.', role: 'Account Manager', color: 'from-blue-500 to-indigo-600' },
  { id: '2', initials: 'JM', name: 'James M.', role: 'Tech Support', color: 'from-emerald-500 to-teal-600' },
  { id: '3', initials: 'AT', name: 'Alicia T.', role: 'Payments', color: 'from-rose-500 to-pink-600' },
];

interface SupportChatProps {
  onClose: () => void;
  supportSettings: { telegram: string; whatsapp: string; email: string; supportStatus?: 'online' | 'offline' };
  socket: any;
  userEmail: string;
  chatBackground?: string | null;
}

export default function SupportChat({ onClose, supportSettings, socket, userEmail, chatBackground }: SupportChatProps) {
  const [chatStatus, setChatStatus] = useState<'active' | 'closed'>('active');
  const [supportStatus, setSupportStatus] = useState<'online' | 'offline'>(supportSettings.supportStatus || 'online');
  const [connectionError, setConnectionError] = useState<boolean>(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [activeAgent] = useState(AGENTS[0]); // Primary agent taking the chat

  const QUICK_REPLIES = [
    { id: 'verify', text: 'How to verify account?' },
    { id: 'deposit', text: 'Minimum deposit amount?' },
    { id: 'withdraw', text: 'Withdrawal delays' },
    { id: 'bonus', text: 'Promo codes' },
  ];

  const handleQuickReply = (text: string) => {
    setInputText(text);
    setTimeout(() => {
        handleSendMessage(text);
    }, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (socket && userEmail) {
      socket.emit('join-chat', userEmail);
      
      const handleNewMessage = (message: any) => {
        setMessages(prev => [...prev, message]);
        setIsTyping(false);
      };

      const handleChatHistory = (history: any[]) => {
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          setMessages([{
            id: 'welcome',
            text: 'Welcome to OnyxTrade! This is the world\'s most secure and fastest trading platform. Our support team is here for you 24/7. How can we help you today?',
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
  }, [userEmail, socket]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
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
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:p-4 sm:pt-20 pointer-events-none">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full h-full sm:w-[420px] sm:h-[700px] sm:max-h-[calc(100vh-6rem)] flex flex-col bg-bg-primary sm:rounded-[24px] shadow-2xl overflow-hidden border border-border-color pointer-events-auto shrink-0 relative"
      >
        {/* Header - Premium Zendesk/Intercom style */}
        <div className="bg-bg-secondary text-text-primary px-5 py-4 sm:rounded-t-[24px] shadow-sm border-b border-border-color relative overflow-hidden shrink-0">
          {/* Subtle bg glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex justify-between items-start relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold tracking-tight text-text-primary">OnyxTrade Support</h2>
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[9px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md flex items-center gap-1">
                  <ShieldCheck size={10} />
                  VIP
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                   <div className={cn("w-1.5 h-1.5 rounded-full", supportStatus === 'online' ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" : "bg-red-500")} />
                   <span className="text-xs font-semibold text-text-secondary">{supportStatus === 'online' ? 'We are online 24/7' : 'Offline'}</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary bg-bg-tertiary hover:bg-border-color rounded-full transition-colors backdrop-blur-sm shadow-sm"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 overflow-y-auto bg-bg-primary touch-pan-y relative flex flex-col"
          style={{ 
            backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {chatBackground && <div className="absolute inset-0 bg-bg-primary/90 backdrop-blur-md pointer-events-none" />}
          
          {connectionError && (
            <div className="absolute inset-0 z-50 bg-bg-primary/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle size={48} className="text-rose-500 mb-4" />
              <h3 className="text-lg font-bold text-text-primary mb-2">Connection Issue</h3>
              <p className="text-sm text-text-secondary/70 mb-6">We're having trouble connecting to the chat. Please check your internet or try again.</p>
              <button 
                onClick={handleRetry}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Retry Connection
              </button>
            </div>
          )}

          <div className="relative z-10 min-h-full flex flex-col justify-end p-5">
              <div className="space-y-6 flex-1 flex flex-col justify-end">
                {/* Initial Status Message */}
                <div className="flex justify-center mb-4">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-bg-secondary text-text-secondary px-3 py-1 rounded-full border border-border-color">
                    Today
                  </span>
                </div>

                {/* Messages */}
                {messages.map((msg, idx) => {
                  const isSupport = msg.sender === 'support' || msg.sender === 'admin';
                  const showAvatar = isSupport && (idx === 0 || messages[idx - 1].sender === 'user' || messages[idx - 1].sender === 'system');
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={cn(
                        "flex w-full gap-2.5",
                        msg.sender === 'user' ? "justify-end" : msg.sender === 'system' ? "justify-center" : "justify-start"
                      )}
                    >
                      {msg.sender === 'system' ? (
                        <div className="bg-bg-secondary border border-border-color px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider text-text-secondary uppercase shadow-sm my-2">
                          {msg.text}
                        </div>
                      ) : (
                        <>
                          {isSupport && (
                            <div className="w-8 shrink-0 flex items-end mb-1">
                              {showAvatar ? (
                                <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex flex-col items-center justify-center text-white shadow-md text-[10px] font-bold", activeAgent.color)}>
                                  {activeAgent.initials}
                                </div>
                              ) : <div className="w-8 h-8" />}
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[75%] flex flex-col relative",
                              msg.sender === 'user' ? "items-end" : "items-start"
                            )}
                          >
                            <div 
                              className={cn(
                                "px-4 py-3 leading-relaxed relative text-[13.5px] md:text-[14.5px] font-medium shadow-sm transition-all duration-200",
                                msg.sender === 'user' 
                                  ? "bg-blue-600 text-white rounded-t-2xl rounded-bl-2xl rounded-br-sm" 
                                  : "bg-bg-secondary text-text-primary rounded-t-2xl rounded-br-2xl rounded-bl-sm border border-border-color hover:border-text-secondary/20"
                              )}
                            >
                              {msg.text}
                            </div>
                            <div className="flex items-center gap-1 mt-1 px-1">
                              <span className="opacity-60 text-[10px] font-semibold text-text-secondary">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.sender === 'user' && (
                                <CheckCheck size={12} className="text-blue-500" />
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex w-full gap-2.5 justify-start"
                  >
                    <div className="w-8 shrink-0 flex items-end mb-1">
                       <div className={cn("w-8 h-8 rounded-full bg-gradient-to-br flex flex-col items-center justify-center text-white shadow-md text-[10px] font-bold", activeAgent.color)}>
                         {activeAgent.initials}
                       </div>
                    </div>
                    <div className="bg-bg-secondary rounded-t-2xl rounded-br-2xl rounded-bl-sm px-4 py-4 border border-border-color flex items-center gap-1 shadow-sm h-[44px]">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-text-secondary/60" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-text-secondary/60" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-text-secondary/60" />
                    </div>
                  </motion.div>
                )}
                
                {/* Quick Replies */}
                {!isTyping && messages.length > 0 && messages[messages.length - 1].sender === 'support' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-wrap gap-2 pt-2 ml-[42px]"
                  >
                    {QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply.text)}
                        className="text-[12px] font-medium bg-bg-secondary hover:bg-bg-tertiary text-text-primary border border-border-color px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm hover:border-blue-500/40"
                      >
                        {reply.text}
                      </button>
                    ))}
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>
          </div>
        </div>

        {/* Input Area */}
          <div className="bg-bg-primary p-4 border-t border-border-color z-20 shrink-0">
            {chatStatus === 'closed' ? (
              <div className="text-center py-2">
                <button 
                  onClick={() => {
                    setMessages([]);
                    setChatStatus('active');
                    if (socket && userEmail) socket.emit('start-new-chat', userEmail);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  Start New Conversation
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-end bg-bg-secondary rounded-2xl p-2 border border-border-color focus-within:border-blue-500/50 shadow-sm transition-all relative">
                  <button className="p-2 text-text-secondary hover:text-text-primary transition shrink-0 rounded-full hover:bg-bg-tertiary">
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    rows={1}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="flex-1 bg-transparent text-text-primary placeholder-text-secondary/50 focus:outline-none text-[14px] px-2 py-2 resize-none min-h-[40px] max-h-[120px] font-medium"
                  />
                  <div className="flex items-center gap-1">
                    <button className="p-2 text-text-secondary hover:text-text-primary transition shrink-0 rounded-full hover:bg-bg-tertiary hidden sm:flex">
                      <Smile size={20} />
                    </button>
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim() || isTyping}
                      className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 disabled:bg-bg-tertiary disabled:text-text-secondary/50 transition-all shrink-0 shadow-md transform active:scale-90"
                    >
                      {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="relative left-[1px] translate-y-[-1px]" />}
                    </button>
                  </div>
                </div>
                
                <div className="text-center flex justify-center items-center gap-1.5 opacity-70">
                  <ShieldCheck size={12} className="text-text-secondary" />
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">Secured by OnyxGuard</span>
                </div>
              </div>
            )}
          </div>
      </motion.div>
    </div>
  );
}

