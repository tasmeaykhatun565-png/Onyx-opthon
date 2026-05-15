import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, MessageCircle, Users, Globe } from 'lucide-react';
import { cn } from './utils';
import { motion } from 'motion/react';
import { auth } from './firebase';

type Message = {
  id: string;
  text: string;
  senderEmail: string;
  name: string;
  photoURL?: string;
  timestamp: number;
};

interface SocialChatProps {
  onClose: () => void;
  userEmail: string;
  chatBackground?: string | null;
  socket: any;
}

export default function SocialChat({ onClose, userEmail, chatBackground, socket }: SocialChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get-social-messages');

    const handleInitialMessages = (msgs: any[]) => {
      setMessages(msgs.map(m => ({
        id: m.id.toString(),
        text: m.text,
        senderEmail: m.email,
        name: m.name,
        photoURL: m.photoURL,
        timestamp: m.timestamp
      })));
    };

    const handleNewMessage = (m: any) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: m.text,
        senderEmail: m.email,
        name: m.name,
        photoURL: m.photoURL,
        timestamp: m.timestamp
      }]);
    };

    socket.on('social-messages', handleInitialMessages);
    socket.on('new-social-message', handleNewMessage);

    return () => {
      socket.off('social-messages', handleInitialMessages);
      socket.off('new-social-message', handleNewMessage);
    };
  }, [socket]);

  const handleSendMessage = () => {
    if (!inputText.trim() || isSending || !socket) return;

    setIsSending(true);
    const textToSend = inputText;
    setInputText('');

    socket.emit('send-social-message', {
      email: userEmail,
      name: userEmail.split('@')[0],
      text: textToSend,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`
    });
    
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-bg-primary flex flex-col h-full w-full md:max-w-md md:left-20 md:right-auto md:border-r md:border-border-color shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-color bg-bg-secondary">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-accent-color flex items-center justify-center text-white">
              <Users size={20} />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success border-2 border-[var(--color-bg-secondary)] rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Social Chat</h3>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Globe size={10} />
              Global Community
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-[var(--color-text-primary)]/5 rounded-full transition"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-bg-primary touch-pan-y select-none relative"
        style={{ 
          WebkitTapHighlightColor: 'transparent',
          backgroundImage: chatBackground ? `url(${chatBackground})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {chatBackground && (
          <div className="absolute inset-0 bg-black/10 dark:bg-black/40 pointer-events-none" />
        )}
        
        <div className="p-4 space-y-4 min-h-full flex flex-col justify-end bg-transparent">
          {messages.map((msg) => {
            const isMe = msg.senderEmail === auth.currentUser?.email;
            return (
              <div 
                key={msg.id} 
                className={cn(
                  "flex w-full flex-col",
                  isMe ? "items-end" : "items-start"
                )}
              >
                {!isMe && (
                  <span className="text-[10px] font-bold text-text-secondary mb-1 ml-1">
                    {msg.name || msg.senderEmail.split('@')[0]}
                  </span>
                )}
                <div 
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm relative transition-all",
                    isMe 
                      ? "bg-accent-color text-white rounded-br-none shadow-md" 
                      : "bg-bg-secondary text-text-primary rounded-bl-none border border-border-color shadow-sm dark:shadow-none"
                  )}
                >
                  <p className="text-sm font-medium tracking-tight">{msg.text}</p>
                  <div 
                    className={cn(
                      "text-[9px] mt-1 opacity-70 text-right font-bold",
                      isMe ? "text-white/80" : "text-text-secondary"
                    )}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-bg-secondary border-t border-border-color">
        <div className="flex items-center gap-2 bg-bg-primary rounded-xl px-4 py-2 border border-border-color focus-within:border-indigo-500/50 transition">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts..."
            className="flex-1 bg-transparent text-text-primary placeholder-[var(--color-text-secondary)] focus:outline-none text-sm"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isSending}
            className="p-2 text-accent-color hover:text-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
