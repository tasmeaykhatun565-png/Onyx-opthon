import React from 'react';
import { Activity, BarChart2, CandlestickChart, LineChart } from 'lucide-react';
import { TIME_FRAMES, CHART_TYPES } from './constants';
import BottomSheet from './BottomSheet';
import { cn } from './utils';

interface ChartSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentTimeFrame: string;
  onTimeFrameChange: (tf: string) => void;
  currentChartType: string;
  onChartTypeChange: (type: string) => void;
  isOTC: boolean;
}

export default function ChartSettingsSheet({ 
  isOpen, 
  onClose, 
  currentTimeFrame, 
  onTimeFrameChange,
  currentChartType,
  onChartTypeChange,
  isOTC
}: ChartSettingsSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="pb-8 pt-2">
        {/* Time Frame Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 px-4 mb-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Candle Time Frame</h3>
            <div className="w-4 h-4 rounded-full border border-[var(--color-text-secondary)] flex items-center justify-center text-[10px] text-text-secondary">?</div>
          </div>
          
          <div className="overflow-x-auto scrollbar-hide px-4">
            <div className="flex items-center gap-2 w-max">
              {TIME_FRAMES.filter(tf => {
                  const tooLong = ['15m', '30m', '1h', '4h', '1d', '7d', '1M'];
                  if (tooLong.includes(tf)) return false;
                  return true;
              }).map((tf) => (
                <button
                  key={tf}
                  onClick={() => onTimeFrameChange(tf)}
                  className={cn(
                    "min-w-[50px] h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all active:scale-95",
                    currentTimeFrame === tf 
                      ? "bg-bg-tertiary text-text-primary border border-border-color" 
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Type Section */}
        <div>
          <h3 className="px-4 text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Chart Type</h3>
          
          <div className="overflow-x-auto scrollbar-hide px-4">
            <div className="flex items-center gap-3 w-max">
              {CHART_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => onChartTypeChange(type.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all active:scale-95",
                    currentChartType === type.id
                      ? "bg-bg-tertiary border-border-color text-text-primary"
                      : "border-transparent text-text-secondary hover:text-text-primary"
                  )}
                >
                  <type.icon size={20} />
                  <span className="text-sm font-bold whitespace-nowrap">{type.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
