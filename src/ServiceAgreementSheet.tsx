import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import BottomSheet from './BottomSheet';

interface ServiceAgreementProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export default function ServiceAgreement({ isOpen, onClose, onAccept }: ServiceAgreementProps) {
  const content = (
    <div className="flex flex-col h-full bg-[#1c1c1e] text-white border-r border-white/5 shadow-2xl">
      {/* Header */}
      <div className="flex flex-col px-6 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Service Agreement</h2>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-6 overflow-y-auto custom-scrollbar">
        <div className="space-y-5 text-[14px] text-white/80 leading-relaxed font-medium pb-6 pt-2">
          <p>
            Trading signals provided by the Company are an automated buy/sell
            signal system based on popular technical indicators (MA, RSI, etc) and
            famous mathematical modes (Multiple Linear Regression, ARIMA, etc).
          </p>

          <p>
            The Client acknowledges that the trading signals do not guarantee
            profitable trades and are provided to the Client for informational purposes and
            "as is". The Client makes all decisions independently at his/her own initiative
            and acknowledges all risks associated with trading in financial instruments.
          </p>

          <p>
            The Client also acknowledges that the trading signals may contain
            predetermined trade conditions, which the Client shall assess and apply
            independently and at the Client's own risk.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 pt-4 flex flex-col gap-3">
        <button
          onClick={onAccept}
          className="w-full bg-[#00ff00] hover:bg-[#00e600] text-black font-bold py-3.5 rounded-xl transition-colors text-[15px]"
        >
          Accept and Continue
        </button>
        <button
          onClick={onClose}
          className="w-full bg-[#3d3f44] hover:bg-[#4d4f54] text-white font-bold py-3.5 rounded-xl transition-colors text-[15px]"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="md:hidden">
        <BottomSheet isOpen={isOpen} onClose={onClose} className="h-[90vh] bg-[#1c1c1e]">
           {content}
        </BottomSheet>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.aside 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="hidden md:block h-full relative z-30"
          >
            {content}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
