import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, ArrowDown, Clock, TrendingUp, TrendingDown, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CrosshairMode, CandlestickSeries, AreaSeries, BarSeries, LineSeries, HistogramSeries, LineStyle } from 'lightweight-charts';
import { deepEqual, safeStringify, getTimeFrameInMs } from './utils';
import { SMA, EMA, WMA, BollingerBands, MACD, RSI, CCI, ATR, PSAR, WilliamsR, ADX, AwesomeOscillator, ROC, Stochastic } from 'technicalindicators';

interface Trade {
  id: string;
  type: 'UP' | 'DOWN';
  entryPrice: number;
  startTime: number;
  endTime: number;
  amount: number;
  status: 'ACTIVE' | 'WIN' | 'LOSS';
  asset: string;
  payout: number;
}

interface OHLCData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

import { IndicatorConfig } from './types';

interface TradingChartProps {
  data: OHLCData[];
  trades: Trade[];
  assetName: string;
  currentTime: number;
  chartType: string;
  chartTimeFrame: string;
  isLoading?: boolean;
  isConnected?: boolean;
  timezoneOffset?: number;
  serverTimeOffset?: number;
  activeIndicators?: IndicatorConfig[];
  currencySymbol?: string;
  exchangeRate?: number;
  onVisibleTimeRangeChange?: (range: { from: number; to: number }) => void;
  onLoadMoreHistory?: () => void;
}

interface Drawing {
  id: string;
  type: string;
  points: { time: number; price: number }[];
  color: string;
}

import { DRAWING_TOOLS } from './constants';

const ChartSkeleton = () => (
  <div className="absolute inset-0 bg-[#101114] flex flex-col items-center justify-center z-50 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center gap-6"
    >
      <div className="relative w-16 h-16">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-full h-full border-4 border-[#22c55e]/20 border-t-[#22c55e] rounded-full"
        />
        <div className="absolute inset-2 border-4 border-[#22c55e]/10 border-b-[#22c55e]/50 rounded-full animate-pulse" />
      </div>
    </motion.div>
  </div>
);

/* removed local getTimeFrameInMs */

export const TradingChart: React.FC<TradingChartProps> = ({ 
  data, 
  trades, 
  assetName,
  currentTime,
  chartType,
  chartTimeFrame,
  isLoading,
  isConnected = true,
  timezoneOffset = 0,
  serverTimeOffset = 0,
  activeIndicators = [],
  currencySymbol = '$',
  exchangeRate = 1,
  onLoadMoreHistory,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorsRef = useRef<Record<string, ISeriesApi<any>>>({});
  const verticalLineRef = useRef<HTMLDivElement>(null);
  const horizontalLineRef = useRef<HTMLDivElement>(null);
  const priceDotRef = useRef<HTMLDivElement>(null);
  const bubbleGroupRef = useRef<HTMLDivElement>(null);
  const timerBubbleRef = useRef<HTMLDivElement>(null);
  const priceBubbleRef = useRef<HTMLDivElement>(null);
  const prevAssetRef = useRef<string>(assetName);
  const isInitializedRef = useRef(false);
  const tradesRef = useRef<Trade[]>(trades);
  const dataRef = useRef<OHLCData[]>(data);
  const latestChartCandleRef = useRef<any>(null);
  const [tradeCoords, setTradeCoords] = useState<Array<{ id: string; y: number; price: number; type: 'UP' | 'DOWN'; amount: number; startTime: number; endTime: number }>>([]);
  const timerStringRef = useRef<string>('');
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Load drawings when asset changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`drawings_${assetName}`);
      setDrawings(saved ? JSON.parse(saved) : []);
      setSelectedDrawingId(null);
    } catch (e) {
      setDrawings([]);
    }
  }, [assetName]);

  // Save drawings when they change
  useEffect(() => {
    if (!assetName) return;
    try {
      localStorage.setItem(`drawings_${assetName}`, safeStringify(drawings));
    } catch (e) {
      console.error('Failed to save drawings', e);
    }
  }, [drawings, assetName]);

  const [draggingPoint, setDraggingPoint] = useState<{ drawingId: string; pointIndex: number } | null>(null);
  const draggingPointRef = useRef<{ drawingId: string; pointIndex: number } | null>(null);

  useEffect(() => {
    draggingPointRef.current = draggingPoint;
  }, [draggingPoint]);

  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const currentDrawingRef = useRef<Drawing | null>(null);
  const drawingModeRef = useRef<string | null>(null);
  const [drawingMode, setDrawingMode] = useState<string | null>(null);
  const [drawingCoords, setDrawingCoords] = useState<any[]>([]);

  useEffect(() => {
    currentDrawingRef.current = currentDrawing;
  }, [currentDrawing]);

  useEffect(() => {
    drawingModeRef.current = drawingMode;
  }, [drawingMode]);

  const updateTradeCoords = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;
    
    const series = seriesRef.current;
    const currentAssetTrades = tradesRef.current.filter(t => t.asset === assetName);
    
    const coords = currentAssetTrades.map(trade => {
        const y = series.priceToCoordinate(trade.entryPrice);
        
        // Find DOM element for this trade using ID, and update it directly
        // This avoids React state updates for every high-frequency scroll/zoom tick
        const entryEl = document.getElementById(`trade-entry-${trade.id}`);
        const resultEl = document.getElementById(`trade-result-${trade.id}`);
        
        let entryX: number | null = null;
        let exitX: number | null = null;

        if (entryEl || resultEl) {
            entryX = chartRef.current?.timeScale().timeToCoordinate((trade.startTime / 1000) as Time) ?? null;
            if (entryX === null && trade.status === 'ACTIVE' && dataRef.current.length > 0) {
                entryX = chartRef.current?.timeScale().timeToCoordinate((dataRef.current[dataRef.current.length - 1].time / 1000) as Time) ?? null;
            }
            if (trade.status !== 'ACTIVE') {
                 exitX = chartRef.current?.timeScale().timeToCoordinate((trade.endTime / 1000) as Time) ?? null;
            }
        }

        if (entryEl) {
            if (y !== null) {
                entryEl.style.top = `${y}px`;
                entryEl.style.left = entryX !== null ? `${entryX}px` : '100%';
                entryEl.style.visibility = (entryX === null && trade.status !== 'ACTIVE') ? 'hidden' : 'visible';
            } else {
                entryEl.style.visibility = 'hidden';
            }
        }

        if (resultEl) {
            if (y !== null && exitX !== null && exitX > 0) {
                 resultEl.style.top = `${y}px`;
                 resultEl.style.left = `${exitX}px`;
                 resultEl.style.visibility = 'visible';
            } else {
                 resultEl.style.visibility = 'hidden';
            }
        }

        return {
            id: trade.id,
            price: trade.entryPrice,
            type: trade.type,
            amount: trade.amount,
            endTime: trade.endTime,
            startTime: trade.startTime,
            y: y ?? -100 // Fallback y position if not visible
        };
    });
    
    // We only need to trigger a re-render if the trades themselves change 
    setTradeCoords(prev => {
      if (prev.length !== coords.length) return coords;
      for (let i = 0; i < prev.length; i++) {
         if (prev[i].id !== coords[i].id) {
             return coords;
         }
      }
      return prev;
    });
  }, [assetName]);

  const updateLatestCoords = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || !latestChartCandleRef.current) return;
    // Snap updateLatestCoords to use the exact candle lightweight-charts just painted
    const series = seriesRef.current;
    const lastCandle = latestChartCandleRef.current;
    
    // Safety check fallback to zero-value check for edge cases
    const price = lastCandle.close !== undefined ? lastCandle.close : lastCandle.value;
    if (price === undefined) return;

    // Use guaranteed candle time for the precise coordinates
    // lightweight-charts returns null for projected future timestamps not in the data series
    const xBase = chartRef.current.timeScale().timeToCoordinate(lastCandle.time as Time);
    
    const y = series.priceToCoordinate(price);
    
    // Direct DOM updates for zero-lag positioning
    if (verticalLineRef.current && y !== null) {
        if (xBase !== null) {
            verticalLineRef.current.style.left = `${xBase}px`;
            verticalLineRef.current.style.top = `0px`;
            verticalLineRef.current.style.height = `${y}px`;
            verticalLineRef.current.style.display = 'block';
        } else {
            verticalLineRef.current.style.display = 'none';
        }
    }
    
    if (horizontalLineRef.current && y !== null) {
        horizontalLineRef.current.style.top = `${y}px`;
        horizontalLineRef.current.style.left = xBase !== null ? `${xBase}px` : '0px';
        horizontalLineRef.current.style.display = 'block';
    }
    
    if (priceDotRef.current && y !== null) {
        if (xBase !== null) {
            priceDotRef.current.style.left = `${xBase}px`;
            priceDotRef.current.style.top = `${y}px`;
            priceDotRef.current.style.display = 'block';
        } else {
            priceDotRef.current.style.display = 'none';
        }
    }
    
    if (bubbleGroupRef.current && y !== null) {
        bubbleGroupRef.current.style.top = `${y - 12}px`;
        // Keep bubble visible and aligned with the price line
        bubbleGroupRef.current.style.display = 'flex';
        
        if (priceBubbleRef.current) priceBubbleRef.current.innerText = price < 10 ? price.toFixed(5) : price.toFixed(3);
    }

    // No state update here to avoid infinite re-render loops. 
    // We use refs for all high-frequency updates.
  }, [assetName, chartTimeFrame]);

  const updateTradeCoordsRef = useRef(updateTradeCoords);
  const updateLatestCoordsRef = useRef(updateLatestCoords);

  const updateDrawingCoords = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;
    
    const allDrawings = currentDrawingRef.current ? [...drawings, currentDrawingRef.current] : drawings;
    const coords = allDrawings.map(drawing => {
      const points = drawing.points.map(p => {
        const x = chartRef.current?.timeScale().timeToCoordinate(p.time as Time);
        const y = seriesRef.current?.priceToCoordinate(p.price);
        return { x, y };
      });
      return { ...drawing, coords: points };
    });
    
    if (coords.length === 0) {
       setDrawingCoords(prev => prev.length > 0 ? [] : prev);
       return;
    }

    setDrawingCoords(prev => {
        if (prev.length !== coords.length) return coords;
        let isDifferent = false;
        for (let i = 0; i < prev.length; i++) {
            if (prev[i].id !== coords[i].id) {
                isDifferent = true;
                break;
            }
            if (prev[i].coords.length !== coords[i].coords.length) {
                 isDifferent = true;
                 break;
            }
            for (let j = 0; j < prev[i].coords.length; j++) {
                // Reduced threshold for better precision
                if (Math.abs((prev[i].coords[j].x || 0) - (coords[i].coords[j].x || 0)) > 0.5 ||
                    Math.abs((prev[i].coords[j].y || 0) - (coords[i].coords[j].y || 0)) > 0.5) {
                    isDifferent = true;
                    break;
                }
            }
        }
        return isDifferent ? coords : prev;
    });
  }, [drawings]);

  const updateDrawingCoordsRef = useRef(updateDrawingCoords);

  useEffect(() => {
    updateTradeCoordsRef.current = updateTradeCoords;
    updateLatestCoordsRef.current = updateLatestCoords;
    updateDrawingCoordsRef.current = updateDrawingCoords;
  }, [updateTradeCoords, updateLatestCoords, updateDrawingCoords]);

  // Handle Drawing Mode from activeIndicators
  useEffect(() => {
    const activeDrawingTool = activeIndicators.find(ind => DRAWING_TOOLS.includes(ind.id));
    const newMode = activeDrawingTool ? activeDrawingTool.id : null;
    if (drawingMode !== newMode) {
      setDrawingMode(newMode);
      
      // Update chart options to disable scrolling while drawing
      if (chartRef.current) {
        const isDrawing = !!newMode;
        chartRef.current.applyOptions({
          handleScroll: {
            mouseWheel: !isDrawing,
            pressedMouseMove: !isDrawing,
            horzTouchDrag: !isDrawing,
            vertTouchDrag: false,
          },
          handleScale: {
            mouseWheel: !isDrawing,
            pinch: !isDrawing,
            axisPressedMouseMove: {
              time: !isDrawing,
              price: false,
            },
          },
        });
      }
    }
  }, [activeIndicators, drawingMode]);

  // Handle Mouse Events for Drawing
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !chartRef.current) return;

    const startDrawing = (clientX: number, clientY: number) => {
      const mode = drawingModeRef.current;
      if (!mode || !chartRef.current) return;
      
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const time = chartRef.current.timeScale().coordinateToTime(x) as number;
      const price = seriesRef.current?.coordinateToPrice(y) as number;
      
      if (time && price) {
        setCurrentDrawing({
          id: Math.random().toString(36).substr(2, 9),
          type: mode,
          points: [{ time, price }, { time, price }],
          color: '#ffffff'
        });
      }
    };

    const moveDrawing = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      
      const time = chartRef.current?.timeScale().coordinateToTime(x) as number;
      const price = seriesRef.current?.coordinateToPrice(y) as number;
      
      if (!time || !price) return;

      const dragging = draggingPointRef.current;
      if (dragging) {
          setDrawings(prev => prev.map(d => {
              if (d.id === dragging.drawingId) {
                  const newPoints = [...d.points];
                  newPoints[dragging.pointIndex] = { time, price };
                  return { ...d, points: newPoints };
              }
              return d;
          }));
          return;
      }

      const drawing = currentDrawingRef.current;
      if (!drawing || !chartRef.current) return;
      
      const newPoints = [...drawing.points];
      newPoints[1] = { time, price };
      setCurrentDrawing({ ...drawing, points: newPoints });
    };

    const endDrawing = () => {
      if (draggingPointRef.current) {
          setDraggingPoint(null);
          return;
      }
      const drawing = currentDrawingRef.current;
      if (drawing) {
        setDrawings(prev => [...prev, drawing]);
        setCurrentDrawing(null);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
        const mode = drawingModeRef.current;
        if (!mode) {
           // If not in drawing mode, allow clicking to deselect
           const target = e.target as HTMLElement;
           const isHandle = target.classList.contains('cursor-move');
           const isDrawingButton = target.closest('button');
           const isDrawingGroup = target.closest('[id^="drawing-group-"]');
           
           if (!isHandle && !isDrawingButton && !isDrawingGroup) {
               setSelectedDrawingId(null);
           }
           return;
        }
        startDrawing(e.clientX, e.clientY);
    };
    const handleMouseMove = (e: MouseEvent) => moveDrawing(e.clientX, e.clientY);
    const handleMouseUp = () => endDrawing();

    const handleTouchStart = (e: TouchEvent) => {
      if (drawingModeRef.current) {
        e.preventDefault();
        startDrawing(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (currentDrawingRef.current) {
        e.preventDefault();
        moveDrawing(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (currentDrawingRef.current) {
        endDrawing();
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    window.addEventListener('touchend', handleTouchEnd, { capture: true });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
    };
  }, []);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Clear existing chart instance if any
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
      indicatorsRef.current = {};
    }

    const getThemeColors = () => {
      const style = getComputedStyle(document.documentElement);
      const getVar = (name: string) => style.getPropertyValue(name).trim();
      
      return {
        background: getVar('--bg-primary') || getVar('--color-bg-primary') || '#101114',
        text: getVar('--text-primary') || getVar('--color-text-primary') || '#ffffff',
        secondaryText: getVar('--text-secondary') || getVar('--color-text-secondary') || '#9ca3af',
        border: getVar('--border-color') || getVar('--color-border-color') || 'rgba(255, 255, 255, 0.05)',
        tertiary: getVar('--bg-tertiary') || getVar('--color-bg-tertiary') || '#2a2e39',
      };
    };

    const colors = getThemeColors();

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.secondaryText,
      },
      localization: {
        timeFormatter: (time: number) => {
          const date = new Date((time * 1000) + (timezoneOffset * 60 * 60 * 1000));
          return date.toISOString().replace('T', ' ').substring(0, 19);
        },
      },
      grid: {
        vertLines: { color: colors.border, style: 2 },
        horzLines: { color: colors.border, style: 2 },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: colors.border,
        fixLeftEdge: false,
        fixRightEdge: false,
        minBarSpacing: 0.5,
        maxBarSpacing: 50,
        barSpacing: 8,
        shiftVisibleRangeOnNewBar: true,
        rightOffset: 20,
        uniformDistribution: false,
        tickMarkFormatter: (time: number) => {
          const date = new Date((time * 1000) + (timezoneOffset * 60 * 60 * 1000));
          const hours = date.getUTCHours().toString().padStart(2, '0');
          const minutes = date.getUTCMinutes().toString().padStart(2, '0');
          const seconds = date.getUTCSeconds().toString().padStart(2, '0');
          return `${hours}:${minutes}:${seconds}`;
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: {
          top: 0.1, 
          bottom: 0.1, 
        },
        visible: true,
        borderVisible: false,
        textColor: colors.secondaryText,
        autoScale: true,
        alignLabels: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(59, 130, 246, 0.4)',
          width: 1 as any,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.4)',
          width: 1 as any,
          style: 2,
          labelBackgroundColor: '#3b82f6',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: false,
        },
        mouseWheel: true,
        pinch: true,
      },
      kineticScroll: {
        touch: true,
        mouse: true,
      },
    });

    const commonOptions = {
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: {
        type: 'price' as const,
        precision: 5,
        minMove: 0.00001,
      },
    };

    const getSeries = () => {
      switch (chartType) {
        case 'Area':
          return chart.addSeries(AreaSeries, {
            ...commonOptions,
            lineColor: '#3b82f6',
            topColor: 'rgba(59, 130, 246, 0.4)',
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineWidth: 2,
          });
        case 'Bar':
          return chart.addSeries(BarSeries, {
            ...commonOptions,
            upColor: '#0ecb81',
            downColor: '#f6465d',
          });
        case 'Heikin Ashi':
          return chart.addSeries(CandlestickSeries, {
            ...commonOptions,
            upColor: '#0ecb81',
            downColor: '#f6465d',
            borderVisible: true,
            borderUpColor: '#0ecb81',
            borderDownColor: '#f6465d',
            wickUpColor: '#0ecb81',
            wickDownColor: '#f6465d',
          });
        case 'Candlestick':
        default:
          return chart.addSeries(CandlestickSeries, {
            ...commonOptions,
            upColor: '#0ecb81',
            downColor: '#f6465d',
            borderVisible: true,
            borderUpColor: '#0ecb81',
            borderDownColor: '#f6465d',
            wickUpColor: '#0ecb81',
            wickDownColor: '#f6465d',
          });
      }
    };

    const series = getSeries();

    chartRef.current = chart;
    seriesRef.current = series;
    isInitializedRef.current = true;

    // Set initial data if available
    if (data.length > 0) {
        // ... (data formatting logic) ...
        // I will re-use the logic from the data update useEffect here
        updateChartData(series, data, chartType);
    }

    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.3,
      },
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };

    window.addEventListener('resize', handleResize);

    const isLoadingHistoryRef = { current: false };

    let rAF: number | null = null;
    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (rAF) cancelAnimationFrame(rAF);
        rAF = requestAnimationFrame(() => {
            updateTradeCoordsRef.current();
            updateLatestCoordsRef.current();
            updateDrawingCoordsRef.current();
            
            if (logicalRange && logicalRange.from < 2000 && onLoadMoreHistory && !isLoadingHistoryRef.current) {
                isLoadingHistoryRef.current = true;
                onLoadMoreHistory();
                setTimeout(() => { isLoadingHistoryRef.current = false; }, 2000);
            }
            rAF = null;
        });
    });

    const observer = new MutationObserver(() => {
        const newColors = getThemeColors();
        chart.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: newColors.background },
                textColor: newColors.secondaryText,
            },
            grid: {
                vertLines: { color: newColors.border },
                horzLines: { color: newColors.border },
            },
            timeScale: {
                borderColor: newColors.border,
            },
            rightPriceScale: {
                borderColor: newColors.border,
                textColor: newColors.secondaryText,
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      isInitializedRef.current = false;
      indicatorsRef.current = {};
      lastDataLengthRef.current = 0;
    };
  }, [assetName, chartType]); // Recreate chart when asset or type changes

  const lastDataLengthRef = useRef(0);
  const lastDataFirstTimeRef = useRef(0);
  const lastAssetRef = useRef(assetName);
  const lastTimeFrameRef = useRef(chartTimeFrame);
  const lastChartTypeRef = useRef(chartType);
  const haDataRef = useRef<any[]>([]);
  const lastIndicatorConfigsRef = useRef<string>(JSON.stringify(activeIndicators));

  const updateChartData = useCallback((series: ISeriesApi<any>, chartData: OHLCData[], type: string) => {
    const isIncremental = lastDataLengthRef.current > 0 && 
                          chartData.length >= lastDataLengthRef.current &&
                          chartData.length > 0 &&
                          chartData[0].time === lastDataFirstTimeRef.current;

    if (isIncremental) {
      const diff = chartData.length - lastDataLengthRef.current;
      const startIndex = Math.max(0, chartData.length - diff - 1);
      
      for (let i = startIndex; i < chartData.length; i++) {
        const d = chartData[i];
        const base = {
          time: (d.time / 1000) as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        };
        
        let formatted: any = base;
        if (type === 'Area') {
          formatted = { time: base.time, value: base.close };
        } else if (type === 'Heikin Ashi') {
          let prevHA = i > 0 ? haDataRef.current[i - 1] : null;
          const haClose = (base.open + base.high + base.low + base.close) / 4;
          const haOpen = prevHA ? (prevHA.open + prevHA.close) / 2 : (base.open + base.close) / 2;
          const haHigh = Math.max(base.high, haOpen, haClose);
          const haLow = Math.min(base.low, haOpen, haClose);
          formatted = { time: base.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
          haDataRef.current[i] = formatted;
        }
        
        series.update(formatted);
        if (i === chartData.length - 1) {
          latestChartCandleRef.current = formatted;
        }
      }
    } else {
      let prevHA: any = null;
      haDataRef.current = [];
      const formattedData = chartData.map((d, i) => {
        const base = {
          time: (d.time / 1000) as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        };
        
        if (type === 'Area') return { time: base.time, value: base.close };
        
        if (type === 'Heikin Ashi') {
          const haClose = (base.open + base.high + base.low + base.close) / 4;
          const haOpen = prevHA ? (prevHA.open + prevHA.close) / 2 : (base.open + base.close) / 2;
          const haHigh = Math.max(base.high, haOpen, haClose);
          const haLow = Math.min(base.low, haOpen, haClose);
          const haCandle = { time: base.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
          prevHA = haCandle;
          haDataRef.current[i] = haCandle;
          return haCandle;
        }
        
        return base;
      });
      if (formattedData.length > 0) {
        latestChartCandleRef.current = formattedData[formattedData.length - 1];
        
        // Save current logical range before setData
        const timeScale = chartRef.current?.timeScale();
        const currentRange = timeScale?.getVisibleLogicalRange();
        
        series.setData(formattedData);
        
        // Restore logical range shifted by the number of prepended items
        if (currentRange && lastDataLengthRef.current > 0 && chartData.length > lastDataLengthRef.current) {
          const diff = chartData.length - lastDataLengthRef.current;
          timeScale?.setVisibleLogicalRange({
            from: currentRange.from + diff,
            to: currentRange.to + diff
          });
        }
      }
    }
    
    lastDataLengthRef.current = chartData.length;
    if (chartData.length > 0) {
      lastDataFirstTimeRef.current = chartData[0].time;
    }
  }, []);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    
    // We want to force center the chart anytime the asset, timeframe, or chart type changes.
    const isMajorChange = 
      lastAssetRef.current !== assetName || 
      lastTimeFrameRef.current !== chartTimeFrame ||
      lastChartTypeRef.current !== chartType;

    updateChartData(seriesRef.current, data, chartType);
    
    if (isMajorChange) {
      const timeScale = chartRef.current?.timeScale();
      if (timeScale && data.length > 0) {
        // Move to the latest bar, leaving some padding on the right for the current candle to draw.
        // This prevents the chart from being weirdly constrained when history length varies.
        timeScale.scrollToRealTime();
      }
      lastAssetRef.current = assetName;
      lastTimeFrameRef.current = chartTimeFrame;
      lastChartTypeRef.current = chartType;
    }
    
    // Only update latest tick UI, not all trades/drawings (save for range changes)
    updateLatestCoordsRef.current();
  }, [data, chartType, assetName, chartTimeFrame, updateChartData]);

  // Keep refs updated and trigger coordinate updates on data change
  useEffect(() => {
    tradesRef.current = trades;
    dataRef.current = data;
    updateTradeCoords();
  }, [trades, data, updateTradeCoords]);

  useEffect(() => {
    updateDrawingCoords();
  }, [drawings, updateDrawingCoords]);

  // Handle Indicators
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const chart = chartRef.current;
    
    // Limit data for indicators to improve performance
    const indicatorData = data.length > 10000 ? data.slice(-10000) : data;
    const closePrices = indicatorData.map(d => d.close);
    const highPrices = indicatorData.map(d => d.high);
    const lowPrices = indicatorData.map(d => d.low);
    const times = indicatorData.map(d => (d.time / 1000) as Time);

    // Check if we need to recreate indicators (active list changed or chart instance changed)
    const currentIndicatorKeys = Object.keys(indicatorsRef.current);
    const SUPPORTED_INDICATORS = [
      'SMA', 'EMA', 'WMA', 'BollingerBands', 'ParabolicSAR', 'Volumes', 
      'RSI', 'MACD', 'CCI', 'ATR', 'WilliamsR', 'AverageDirectionalIndex', 
      'AwesomeOscillator', 'RateOfChange', 'Stochastic', 'Momentum',
      'JapanesePearl', 'JapaneseTrend', 'Reflection', 'RelativeStrengthLaw',
      'SlidingOnAverages', 'AverageIntersection', 'ChasingTheTrend',
      'SmartRSI15', 'SmartRSI30', 'SmartRSI60'
    ];

    const expectedKeys = activeIndicators
      .filter(ind => SUPPORTED_INDICATORS.includes(ind.id))
      .flatMap(ind => {
        if (ind.id === 'BollingerBands') return ['BBUpper', 'BBLower', 'BBMiddle'];
        if (ind.id === 'MACD') return ['MACDLine', 'MACDSignal', 'MACDHist'];
        if (ind.id === 'AverageDirectionalIndex') return ['ADX', 'PDI', 'MDI'];
        if (ind.id === 'Stochastic') return ['StochK', 'StochD'];
        if (ind.id === 'Volumes') return ['Volumes'];
        if (ind.id === 'JapanesePearl') return ['JP_SMA1', 'JP_SMA2', 'JP_RSI'];
        if (ind.id === 'JapaneseTrend') return ['JT_SMA1', 'JT_SMA2'];
        if (ind.id === 'Reflection') return ['Ref_SMA1', 'Ref_SMA2', 'Ref_MACDLine', 'Ref_MACDSignal', 'Ref_MACDHist'];
        if (ind.id === 'RelativeStrengthLaw') return ['RSL_RSI1', 'RSL_RSI2'];
        if (ind.id === 'SlidingOnAverages') return ['SoA_SMA1', 'SoA_SMA2'];
        if (ind.id === 'AverageIntersection') return ['AI_SMA1', 'AI_SMA2'];
        if (ind.id === 'ChasingTheTrend') return ['CtT_EMA1', 'CtT_EMA2', 'CtT_MACDLine', 'CtT_MACDSignal', 'CtT_MACDHist'];
        if (ind.id === 'SmartRSI15') return ['SRSI15_RSI'];
        if (ind.id === 'SmartRSI30') return ['SRSI30_RSI'];
        if (ind.id === 'SmartRSI60') return ['SRSI60_RSI'];
        return [ind.id];
      });

    // Check if we need to recreate indicators
    // We recreate if:
    // 1. The set of indicator IDs changed
    // 2. Any parameter or color changed
    const currentConfigsStr = JSON.stringify(activeIndicators);
    const needsRecreate = currentIndicatorKeys.length !== expectedKeys.length || 
                         !expectedKeys.every(key => currentIndicatorKeys.includes(key)) ||
                         lastIndicatorConfigsRef.current !== currentConfigsStr;

    if (needsRecreate) {
        lastIndicatorConfigsRef.current = currentConfigsStr;
        // Helper to clear indicators
        const clearIndicators = () => {
          Object.values(indicatorsRef.current).forEach(series => {
            try {
              chart.removeSeries(series);
            } catch (e) {}
          });
          indicatorsRef.current = {};
        };
        
        clearIndicators();
      
      const hasOscillators = activeIndicators.some(ind => 
        ['RSI', 'MACD', 'CCI', 'ATR', 'WilliamsR', 'AverageDirectionalIndex', 'AwesomeOscillator', 'RateOfChange', 'Stochastic', 'JapanesePearl', 'Reflection', 'RelativeStrengthLaw', 'ChasingTheTrend', 'SmartRSI15', 'SmartRSI30', 'SmartRSI60'].includes(ind.id)
      );

      activeIndicators.forEach(indicator => {
        const commonLineOptions = {
          lineWidth: 2 as any,
          crosshairMarkerVisible: false,
          priceLineVisible: false,
          lastValueVisible: false,
        };

        const oscillatorOptions = {
          ...commonLineOptions,
          priceScaleId: 'oscillators',
        };

        switch (indicator.id) {
          case 'SMA':
            indicatorsRef.current[`SMA_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#2962FF', 
              lineWidth: 2,
              title: 'SMA',
            });
            break;
          case 'EMA':
            indicatorsRef.current[`EMA_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#FF6D00', 
              lineWidth: 2, 
              lineStyle: LineStyle.Solid,
              title: 'EMA'
            });
            break;
          case 'WMA':
            indicatorsRef.current[`WMA_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#E91E63', 
              lineWidth: 2, 
              lineStyle: LineStyle.Dashed,
              title: 'WMA'
            });
            break;
          case 'BollingerBands':
            indicatorsRef.current[`BBUpper_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#2196F3', 
              lineWidth: 1,
              title: 'BB Upper'
            });
            indicatorsRef.current[`BBLower_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#2196F3', 
              lineWidth: 1,
              title: 'BB Lower'
            });
            indicatorsRef.current[`BBMiddle_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || 'rgba(33, 150, 243, 0.5)', 
              lineWidth: 1, 
              lineStyle: LineStyle.Dashed,
              title: 'BB Basis'
            });
            break;
          case 'ParabolicSAR':
            indicatorsRef.current[`ParabolicSAR_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#00BCD4', 
              lineWidth: 2,
              lineStyle: LineStyle.Dotted,
              title: 'PSAR'
            });
            break;
          case 'Volumes':
            indicatorsRef.current[`Volumes_${indicator.instanceId}`] = chart.addSeries(HistogramSeries, {
              priceFormat: {
                type: 'volume',
              },
              priceScaleId: 'volume',
            });
            chart.priceScale('volume').applyOptions({
              scaleMargins: {
                top: 0.8,
                bottom: 0,
              },
            });
            break;
          case 'RSI':
            const rsiSeries = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#9C27B0',
              lineWidth: 2,
              title: 'RSI'
            });
            rsiSeries.createPriceLine({
              price: 70,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: '70',
            });
            rsiSeries.createPriceLine({
              price: 30,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: '30',
            });
            indicatorsRef.current[`RSI_${indicator.instanceId}`] = rsiSeries;
            break;
          case 'MACD':
            indicatorsRef.current[`MACDLine_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#2196F3', 
              lineWidth: 2,
              title: 'MACD'
            });
            indicatorsRef.current[`MACDSignal_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#FF5252', 
              lineWidth: 2,
              title: 'Signal'
            });
            indicatorsRef.current[`MACDHist_${indicator.instanceId}`] = chart.addSeries(HistogramSeries, { 
              priceScaleId: 'oscillators',
              priceLineVisible: false,
              lastValueVisible: false,
              title: 'Histogram'
            });
            break;
          case 'CCI':
            const cciSeries = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#FFEB3B', 
              lineStyle: LineStyle.Solid,
              lineWidth: 2,
              title: 'CCI'
            });
            cciSeries.createPriceLine({
              price: 100,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: '100',
            });
            cciSeries.createPriceLine({
              price: -100,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: '-100',
            });
            indicatorsRef.current[`CCI_${indicator.instanceId}`] = cciSeries;
            break;
          case 'ATR':
            indicatorsRef.current[`ATR_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#607D8B', 
              lineWidth: 2,
              title: 'ATR'
            });
            break;
          case 'WilliamsR':
            const wrSeries = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#F44336',
              lineWidth: 2,
              title: 'Williams %R'
            });
            wrSeries.createPriceLine({
              price: -20,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
            });
            wrSeries.createPriceLine({
              price: -80,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
            });
            indicatorsRef.current[`WilliamsR_${indicator.instanceId}`] = wrSeries;
            break;
          case 'AverageDirectionalIndex':
            indicatorsRef.current[`ADX_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#FF9800', 
              lineWidth: 3,
              title: 'ADX'
            });
            indicatorsRef.current[`PDI_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#4CAF50', 
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: '+DI'
            });
            indicatorsRef.current[`MDI_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#F44336', 
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              title: '-DI'
            });
            break;
          case 'AwesomeOscillator':
            indicatorsRef.current[`AwesomeOscillator_${indicator.instanceId}`] = chart.addSeries(HistogramSeries, { 
              priceScaleId: 'oscillators',
              priceLineVisible: false,
              lastValueVisible: false,
              title: 'Awesome Osc'
            });
            break;
          case 'RateOfChange':
            indicatorsRef.current[`RateOfChange_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#00BCD4',
              title: 'ROC'
            });
            break;
          case 'Momentum':
            indicatorsRef.current[`Momentum_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#E91E63',
              title: 'Mom'
            });
            break;
          case 'Stochastic':
            const stochSeries = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: indicator.color || '#2196F3', 
              lineWidth: 2,
              title: '%K'
            });
            stochSeries.createPriceLine({
              price: 80,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
            });
            stochSeries.createPriceLine({
              price: 20,
              color: 'rgba(255, 255, 255, 0.2)',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
            });
            indicatorsRef.current[`StochK_${indicator.instanceId}`] = stochSeries;
            indicatorsRef.current[`StochD_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#FF9800', 
              lineWidth: 2,
              lineStyle: LineStyle.Dashed,
              title: '%D'
            });
            break;
          case 'JapanesePearl':
            indicatorsRef.current[`JP_SMA1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#4CAF50', 
              lineWidth: 1, 
              title: 'JP SMA10' 
            });
            indicatorsRef.current[`JP_SMA2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#FF9800', 
              lineWidth: 1, 
              title: 'JP SMA20' 
            });
            indicatorsRef.current[`JP_RSI_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#9C27B0', 
              lineWidth: 2, 
              title: 'JP RSI' 
            });
            break;
          case 'JapaneseTrend':
            indicatorsRef.current[`JT_SMA1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#2196F3', 
              lineWidth: 1, 
              title: 'JT SMA5' 
            });
            indicatorsRef.current[`JT_SMA2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#FF9800', 
              lineWidth: 1, 
              title: 'JT SMA20' 
            });
            break;
          case 'Reflection':
            indicatorsRef.current[`Ref_SMA1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#4CAF50', 
              lineWidth: 1, 
              title: 'Ref SMA10' 
            });
            indicatorsRef.current[`Ref_SMA2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#FF9800', 
              lineWidth: 1, 
              title: 'Ref SMA20' 
            });
            indicatorsRef.current[`Ref_MACDLine_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#2196F3', 
              title: 'Ref MACD Line' 
            });
            indicatorsRef.current[`Ref_MACDSignal_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#FF5252', 
              title: 'Ref Signal' 
            });
            indicatorsRef.current[`Ref_MACDHist_${indicator.instanceId}`] = chart.addSeries(HistogramSeries, { 
              priceScaleId: 'oscillators', 
              priceLineVisible: false, 
              lastValueVisible: false, 
              title: 'Ref Histogram' 
            });
            break;
          case 'RelativeStrengthLaw':
            indicatorsRef.current[`RSL_RSI1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#9C27B0', 
              lineWidth: 2, 
              title: 'RSL RSI5' 
            });
            indicatorsRef.current[`RSL_RSI2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#FF9800', 
              lineWidth: 1, 
              lineStyle: LineStyle.Dashed, 
              title: 'RSL RSI14' 
            });
            break;
          case 'SlidingOnAverages':
            indicatorsRef.current[`SoA_SMA1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#2196F3', 
              lineWidth: 1, 
              title: 'SoA SMA4' 
            });
            indicatorsRef.current[`SoA_SMA2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#9C27B0', 
              lineWidth: 1, 
              lineStyle: LineStyle.Dotted, 
              title: 'SoA SMA60' 
            });
            break;
          case 'AverageIntersection':
            indicatorsRef.current[`AI_SMA1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#4CAF50', 
              lineWidth: 2, 
              title: 'AI SMA5' 
            });
            indicatorsRef.current[`AI_SMA2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#FF9800', 
              lineWidth: 2, 
              title: 'AI SMA20' 
            });
            break;
          case 'ChasingTheTrend':
            indicatorsRef.current[`CtT_EMA1_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#2196F3', 
              lineWidth: 2, 
              title: 'CtT EMA10' 
            });
            indicatorsRef.current[`CtT_EMA2_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: '#FF9800', 
              lineWidth: 2, 
              title: 'CtT EMA20' 
            });
            indicatorsRef.current[`CtT_MACDLine_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#2196F3', 
              title: 'CtT MACD Line' 
            });
            indicatorsRef.current[`CtT_MACDSignal_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#FF5252', 
              title: 'CtT Signal' 
            });
            indicatorsRef.current[`CtT_MACDHist_${indicator.instanceId}`] = chart.addSeries(HistogramSeries, { 
              priceScaleId: 'oscillators', 
              priceLineVisible: false, 
              lastValueVisible: false, 
              title: 'CtT Histogram' 
            });
            break;
          case 'SmartRSI15':
            indicatorsRef.current[`SRSI15_RSI_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#9C27B0', 
              lineWidth: 2, 
              title: 'SRSI 15' 
            });
            break;
          case 'SmartRSI30':
            indicatorsRef.current[`SRSI30_RSI_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#E91E63', 
              lineWidth: 2, 
              title: 'SRSI 30' 
            });
            break;
          case 'SmartRSI60':
            indicatorsRef.current[`SRSI60_RSI_${indicator.instanceId}`] = chart.addSeries(LineSeries, { 
              ...oscillatorOptions, 
              color: '#673AB7', 
              lineWidth: 2, 
              title: 'SRSI 60' 
            });
            break;
        }
      });

      if (hasOscillators) {
        chart.priceScale('oscillators').applyOptions({
          scaleMargins: {
            top: 0.75,
            bottom: 0.05,
          },
          visible: false,
        });
      }
    }

    // Update Data for each active indicator
    activeIndicators.forEach(indicator => {
      const instId = indicator.instanceId;
      try {
        if (indicator.id === 'SMA' && indicatorsRef.current[`SMA_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = SMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const smaData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`SMA_${instId}`].setData(smaData);
        }

        if (indicator.id === 'EMA' && indicatorsRef.current[`EMA_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = EMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const emaData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`EMA_${instId}`].setData(emaData);
        }

        if (indicator.id === 'WMA' && indicatorsRef.current[`WMA_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = WMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const wmaData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`WMA_${instId}`].setData(wmaData);
        }

        if (indicator.id === 'BollingerBands' && indicatorsRef.current[`BBUpper_${instId}`]) {
          const period = indicator.params.period || 20;
          const stdDev = indicator.params.stdDev || 2;
          const result = BollingerBands.calculate({ period, stdDev, values: closePrices });
          const offset = closePrices.length - result.length;
          
          const upperData = result.map((val, idx) => ({ time: times[idx + offset], value: val.upper }));
          const lowerData = result.map((val, idx) => ({ time: times[idx + offset], value: val.lower }));
          const middleData = result.map((val, idx) => ({ time: times[idx + offset], value: val.middle }));
          
          indicatorsRef.current[`BBUpper_${instId}`].setData(upperData);
          indicatorsRef.current[`BBLower_${instId}`].setData(lowerData);
          indicatorsRef.current[`BBMiddle_${instId}`].setData(middleData);
        }

        if (indicator.id === 'ParabolicSAR' && indicatorsRef.current[`ParabolicSAR_${instId}`]) {
          const step = indicator.params.step || 0.02;
          const max = indicator.params.max || 0.2;
          const result = PSAR.calculate({ step, max, high: highPrices, low: lowPrices });
          const offset = closePrices.length - result.length;
          const sarData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`ParabolicSAR_${instId}`].setData(sarData);
        }

        if (indicator.id === 'RSI' && indicatorsRef.current[`RSI_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = RSI.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const rsiData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`RSI_${instId}`].setData(rsiData);
        }

        if (indicator.id === 'MACD' && indicatorsRef.current[`MACDLine_${instId}`]) {
          const fastPeriod = indicator.params.fastPeriod || 12;
          const slowPeriod = indicator.params.slowPeriod || 26;
          const signalPeriod = indicator.params.signalPeriod || 9;
          const result = MACD.calculate({ 
            fastPeriod, 
            slowPeriod, 
            signalPeriod, 
            SimpleMAOscillator: false, 
            SimpleMASignal: false, 
            values: closePrices 
          });
          const offset = closePrices.length - result.length;
          
          const macdData = result.map((val, idx) => ({ time: times[idx + offset], value: val.MACD || 0 }));
          const signalData = result.map((val, idx) => ({ time: times[idx + offset], value: val.signal || 0 }));
          const histData = result.map((val, idx) => ({ 
            time: times[idx + offset], 
            value: val.histogram || 0,
            color: (val.histogram || 0) >= 0 ? '#0ecb81' : '#f6465d'
          }));

          indicatorsRef.current[`MACDLine_${instId}`].setData(macdData);
          indicatorsRef.current[`MACDSignal_${instId}`].setData(signalData);
          indicatorsRef.current[`MACDHist_${instId}`].setData(histData);
        }

        if (indicator.id === 'CCI' && indicatorsRef.current[`CCI_${instId}`]) {
          const period = indicator.params.period || 20;
          const result = CCI.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          const cciData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`CCI_${instId}`].setData(cciData);
        }

        if (indicator.id === 'ATR' && indicatorsRef.current[`ATR_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = ATR.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          const atrData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`ATR_${instId}`].setData(atrData);
        }

        if (indicator.id === 'WilliamsR' && indicatorsRef.current[`WilliamsR_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = WilliamsR.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          const wrData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`WilliamsR_${instId}`].setData(wrData);
        }

        if (indicator.id === 'AverageDirectionalIndex' && indicatorsRef.current[`ADX_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = ADX.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          
          const adxData = result.map((val, idx) => ({ time: times[idx + offset], value: val.adx }));
          const pdiData = result.map((val, idx) => ({ time: times[idx + offset], value: val.pdi }));
          const mdiData = result.map((val, idx) => ({ time: times[idx + offset], value: val.mdi }));
          
          indicatorsRef.current[`ADX_${instId}`].setData(adxData);
          indicatorsRef.current[`PDI_${instId}`].setData(pdiData);
          indicatorsRef.current[`MDI_${instId}`].setData(mdiData);
        }

        if (indicator.id === 'AwesomeOscillator' && indicatorsRef.current[`AwesomeOscillator_${instId}`]) {
          const fastPeriod = indicator.params.fastPeriod || 5;
          const slowPeriod = indicator.params.slowPeriod || 34;
          const result = AwesomeOscillator.calculate({ fastPeriod, slowPeriod, high: highPrices, low: lowPrices });
          const offset = closePrices.length - result.length;
          
          const aoData = result.map((val, idx) => ({ 
            time: times[idx + offset], 
            value: (val as any), // technicalindicators output can be tricky
            color: (val as any) >= (idx > 0 ? (result[idx - 1] as any) : 0) ? '#0ecb81' : '#f6465d'
          }));
          
          indicatorsRef.current[`AwesomeOscillator_${instId}`].setData(aoData);
        }

        if (indicator.id === 'RateOfChange' && indicatorsRef.current[`RateOfChange_${instId}`]) {
          const period = indicator.params.period || 14;
          const result = ROC.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const rocData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`RateOfChange_${instId}`].setData(rocData);
        }

        if (indicator.id === 'Momentum' && indicatorsRef.current[`Momentum_${instId}`]) {
          const period = indicator.params.period || 14;
          const result: number[] = [];
          for (let i = period; i < closePrices.length; i++) {
            result.push(closePrices[i] - closePrices[i - period]);
          }
          const offset = closePrices.length - result.length;
          const momData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current[`Momentum_${instId}`].setData(momData);
        }

        if (indicator.id === 'Volumes' && indicatorsRef.current[`Volumes_${instId}`]) {
          const volumeData = data.map(d => ({
            time: (d.time / 1000) as Time,
            value: d.volume || Math.random() * 1000, 
            color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
          }));
          indicatorsRef.current[`Volumes_${instId}`].setData(volumeData);
        }

        if (indicator.id === 'Stochastic' && indicatorsRef.current[`StochK_${instId}`]) {
          const period = indicator.params.period || 14;
          const signalPeriod = indicator.params.signalPeriod || 3;
          const result = Stochastic.calculate({ period, signalPeriod, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          
          const stochKData = result.map((val, idx) => ({ time: times[idx + offset], value: val.k }));
          const stochDData = result.map((val, idx) => ({ time: times[idx + offset], value: val.d }));
          
          indicatorsRef.current[`StochK_${instId}`].setData(stochKData);
          indicatorsRef.current[`StochD_${instId}`].setData(stochDData);
        }

        if (indicator.id === 'JapanesePearl' && indicatorsRef.current[`JP_SMA1_${instId}`]) {
          const sma1 = SMA.calculate({ period: 10, values: closePrices });
          const sma2 = SMA.calculate({ period: 20, values: closePrices });
          const rsi = RSI.calculate({ period: 14, values: closePrices });
          
          indicatorsRef.current[`JP_SMA1_${instId}`].setData(sma1.map((val, idx) => ({ time: times[idx + closePrices.length - sma1.length], value: val })));
          indicatorsRef.current[`JP_SMA2_${instId}`].setData(sma2.map((val, idx) => ({ time: times[idx + closePrices.length - sma2.length], value: val })));
          indicatorsRef.current[`JP_RSI_${instId}`].setData(rsi.map((val, idx) => ({ time: times[idx + closePrices.length - rsi.length], value: val })));
        }

        if (indicator.id === 'JapaneseTrend' && indicatorsRef.current[`JT_SMA1_${instId}`]) {
          const sma1 = SMA.calculate({ period: 5, values: closePrices });
          const sma2 = SMA.calculate({ period: 20, values: closePrices });
          
          indicatorsRef.current[`JT_SMA1_${instId}`].setData(sma1.map((val, idx) => ({ time: times[idx + closePrices.length - sma1.length], value: val })));
          indicatorsRef.current[`JT_SMA2_${instId}`].setData(sma2.map((val, idx) => ({ time: times[idx + closePrices.length - sma2.length], value: val })));
        }

        if (indicator.id === 'Reflection' && indicatorsRef.current[`Ref_SMA1_${instId}`]) {
          const sma1 = SMA.calculate({ period: 10, values: closePrices });
          const sma2 = SMA.calculate({ period: 20, values: closePrices });
          const macd = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false, values: closePrices });
          
          indicatorsRef.current[`Ref_SMA1_${instId}`].setData(sma1.map((val, idx) => ({ time: times[idx + closePrices.length - sma1.length], value: val })));
          indicatorsRef.current[`Ref_SMA2_${instId}`].setData(sma2.map((val, idx) => ({ time: times[idx + closePrices.length - sma2.length], value: val })));
          indicatorsRef.current[`Ref_MACDLine_${instId}`].setData(macd.map((val, idx) => ({ time: times[idx + closePrices.length - macd.length], value: val.MACD || 0 })));
          indicatorsRef.current[`Ref_MACDSignal_${instId}`].setData(macd.map((val, idx) => ({ time: times[idx + closePrices.length - macd.length], value: val.signal || 0 })));
          indicatorsRef.current[`Ref_MACDHist_${instId}`].setData(macd.map((val, idx) => ({ time: times[idx + closePrices.length - macd.length], value: val.histogram || 0, color: (val.histogram || 0) >= 0 ? '#0ecb81' : '#f6465d' })));
        }

        if (indicator.id === 'RelativeStrengthLaw' && indicatorsRef.current[`RSL_RSI1_${instId}`]) {
          const rsi1 = RSI.calculate({ period: 5, values: closePrices });
          const rsi2 = RSI.calculate({ period: 14, values: closePrices });
          
          indicatorsRef.current[`RSL_RSI1_${instId}`].setData(rsi1.map((val, idx) => ({ time: times[idx + closePrices.length - rsi1.length], value: val })));
          indicatorsRef.current[`RSL_RSI2_${instId}`].setData(rsi2.map((val, idx) => ({ time: times[idx + closePrices.length - rsi2.length], value: val })));
        }

        if (indicator.id === 'SlidingOnAverages' && indicatorsRef.current[`SoA_SMA1_${instId}`]) {
          const sma1 = SMA.calculate({ period: 4, values: closePrices });
          const sma2 = SMA.calculate({ period: 60, values: closePrices });
          
          indicatorsRef.current[`SoA_SMA1_${instId}`].setData(sma1.map((val, idx) => ({ time: times[idx + closePrices.length - sma1.length], value: val })));
          indicatorsRef.current[`SoA_SMA2_${instId}`].setData(sma2.map((val, idx) => ({ time: times[idx + closePrices.length - sma2.length], value: val })));
        }

        if (indicator.id === 'AverageIntersection' && indicatorsRef.current[`AI_SMA1_${instId}`]) {
          const sma1 = SMA.calculate({ period: 5, values: closePrices });
          const sma2 = SMA.calculate({ period: 20, values: closePrices });
          
          indicatorsRef.current[`AI_SMA1_${instId}`].setData(sma1.map((val, idx) => ({ time: times[idx + closePrices.length - sma1.length], value: val })));
          indicatorsRef.current[`AI_SMA2_${instId}`].setData(sma2.map((val, idx) => ({ time: times[idx + closePrices.length - sma2.length], value: val })));
        }

        if (indicator.id === 'ChasingTheTrend' && indicatorsRef.current[`CtT_EMA1_${instId}`]) {
          const ema1 = EMA.calculate({ period: 10, values: closePrices });
          const ema2 = EMA.calculate({ period: 20, values: closePrices });
          const macd = MACD.calculate({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false, values: closePrices });
          
          indicatorsRef.current[`CtT_EMA1_${instId}`].setData(ema1.map((val, idx) => ({ time: times[idx + closePrices.length - ema1.length], value: val })));
          indicatorsRef.current[`CtT_EMA2_${instId}`].setData(ema2.map((val, idx) => ({ time: times[idx + closePrices.length - ema2.length], value: val })));
          indicatorsRef.current[`CtT_MACDLine_${instId}`].setData(macd.map((val, idx) => ({ time: times[idx + closePrices.length - macd.length], value: val.MACD || 0 })));
          indicatorsRef.current[`CtT_MACDSignal_${instId}`].setData(macd.map((val, idx) => ({ time: times[idx + closePrices.length - macd.length], value: val.signal || 0 })));
          indicatorsRef.current[`CtT_MACDHist_${instId}`].setData(macd.map((val, idx) => ({ time: times[idx + closePrices.length - macd.length], value: val.histogram || 0, color: (val.histogram || 0) >= 0 ? '#0ecb81' : '#f6465d' })));
        }

        if (indicator.id === 'SmartRSI15' && indicatorsRef.current[`SRSI15_RSI_${instId}`]) {
          const rsi = RSI.calculate({ period: 15, values: closePrices });
          indicatorsRef.current[`SRSI15_RSI_${instId}`].setData(rsi.map((val, idx) => ({ time: times[idx + closePrices.length - rsi.length], value: val })));
        }

        if (indicator.id === 'SmartRSI30' && indicatorsRef.current[`SRSI30_RSI_${instId}`]) {
          const rsi = RSI.calculate({ period: 30, values: closePrices });
          indicatorsRef.current[`SRSI30_RSI_${instId}`].setData(rsi.map((val, idx) => ({ time: times[idx + closePrices.length - rsi.length], value: val })));
        }

        if (indicator.id === 'SmartRSI60' && indicatorsRef.current[`SRSI60_RSI_${instId}`]) {
          const rsi = RSI.calculate({ period: 60, values: closePrices });
          indicatorsRef.current[`SRSI60_RSI_${instId}`].setData(rsi.map((val, idx) => ({ time: times[idx + closePrices.length - rsi.length], value: val })));
        }
      } catch (e) {
        console.error(`Error updating indicator ${indicator}:`, e);
      }
    });
  }, [data, activeIndicators, chartType]);

  const tfMs = getTimeFrameInMs(chartTimeFrame);

  // Smooth local timer updates that bypass React's render cycle
  useEffect(() => {
    let animationFrameId: number;
    const updateTimer = () => {
      const now = Date.now() + serverTimeOffset;
      const currentTFStart = Math.floor(now / tfMs) * tfMs;
      const nextTFStart = currentTFStart + tfMs;
      const remainingMs = nextTFStart - now;
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
      
      const h = Math.floor(remainingSeconds / 3600);
      const m = Math.floor((remainingSeconds % 3600) / 60);
      const s = remainingSeconds % 60;

      let timerString = '';
      if (h > 0) {
        timerString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else {
        timerString = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
      
      timerStringRef.current = timerString;
      if (timerBubbleRef.current) {
          timerBubbleRef.current.innerText = timerString;
      }
      animationFrameId = requestAnimationFrame(updateTimer);
    };
    updateTimer();
    return () => cancelAnimationFrame(animationFrameId);
  }, [tfMs, serverTimeOffset]);

  const isStalled = !isConnected;
  
  // Trigger DOM updates once React finishes rendering the wrappers
  useEffect(() => {
     const timer = setTimeout(() => {
        updateTradeCoordsRef.current();
        updateDrawingCoordsRef.current();
     }, 100);
     return () => clearTimeout(timer);
  }, [tradeCoords.length, drawingCoords.length]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--bg-primary)] flex-1 min-h-[300px] group">
        {/* Gimbal UI Overlays - High Precision Glass & Depth */}
        <div className="absolute inset-0 pointer-events-none z-[45] bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.15)_100%)]" />
        <div className="absolute inset-0 pointer-events-none z-[45] shadow-[inset_0_0_80px_rgba(0,0,0,0.25)]" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/5 z-[45] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/5 z-[45] pointer-events-none" />
        
        {/* Subtitle Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none z-[46] opacity-[0.03] overflow-hidden">
            <div className="absolute inset-0 h-2 w-full bg-white/30 animate-[scanline_8s_linear_infinite]" 
                 style={{ 
                    backgroundImage: 'linear-gradient(to bottom, transparent, currentColor, transparent)',
                    animationName: 'scanline'
                 }} 
            />
        </div>

        <style>
            {`
                @keyframes scanline {
                    0% { transform: translateY(-100vh); }
                    100% { transform: translateY(100vh); }
                }
            `}
        </style>

        <AnimatePresence mode="wait">
            {(isLoading || data.length === 0 || isStalled) && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 bg-[var(--bg-primary)] flex items-center justify-center backdrop-blur-md"
                >
                    <ChartSkeleton />
                </motion.div>
            )}
        </AnimatePresence>
        
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ 
                opacity: (isLoading || data.length === 0 || isStalled) ? 0 : 1,
            }}
            transition={{ duration: 0.3 }}
            className="w-full h-full absolute inset-0"
        >
            <div ref={chartContainerRef} className="w-full h-full" />
            {/* Drawings Overlay */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50">
                {drawings.length > 0 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setDrawings([]); }}
                        className="bg-[#1a1b1e]/80 backdrop-blur-md border border-white/10 text-white p-2 rounded-full shadow-xl hover:bg-red-500/20 transition-colors pointer-events-auto"
                        title="Clear all drawings"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {drawingCoords.map(drawing => {
                if (drawing.coords.some((c: any) => c.x === null || c.y === null)) return null;
                
                const p1 = drawing.coords[0];
                const p2 = drawing.coords[1];
                const isSelected = selectedDrawingId === drawing.id;
                
                const deleteButton = isSelected && (
                    <button 
                        className="absolute z-[60] bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center pointer-events-auto shadow-lg transition-transform active:scale-90"
                        style={{ left: p1.x - 12, top: p1.y - 30 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setDrawings(prev => prev.filter(d => d.id !== drawing.id));
                            setSelectedDrawingId(null);
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                );

                const handles = isSelected && drawing.coords.map((p: any, idx: number) => (
                    <div 
                        key={idx}
                        className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-[55] pointer-events-auto cursor-move shadow-md hover:scale-125 transition-transform"
                        style={{ left: p.x, top: p.y, transform: 'translate(-50%, -50%)' }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingPoint({ drawingId: drawing.id, pointIndex: idx });
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                            setDraggingPoint({ drawingId: drawing.id, pointIndex: idx });
                        }}
                    />
                ));
                
                switch (drawing.type) {
                    case 'TrendLine':
                        return (
                            <div id={`drawing-group-${drawing.id}`} key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <svg className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" onClick={() => setSelectedDrawingId(drawing.id)}>
                                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isSelected ? '#3b82f6' : drawing.color} strokeWidth={isSelected ? "3" : "2"} />
                                </svg>
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'Ray':
                        // Calculate ray end point (far away)
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const length = Math.sqrt(dx*dx + dy*dy) || 1;
                        const rayX = p1.x + (dx / length) * 10000;
                        const rayY = p1.y + (dy / length) * 10000;
                        return (
                            <div id={`drawing-group-${drawing.id}`} key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <svg className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" onClick={() => setSelectedDrawingId(drawing.id)}>
                                    <line x1={p1.x} y1={p1.y} x2={rayX} y2={rayY} stroke={isSelected ? '#3b82f6' : drawing.color} strokeWidth={isSelected ? "3" : "2"} />
                                </svg>
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'HorizontalLine':
                        return (
                            <div 
                                id={`drawing-group-${drawing.id}`} 
                                key={drawing.id} 
                                className="absolute inset-0 pointer-events-auto z-10 cursor-pointer"
                                onClick={() => setSelectedDrawingId(drawing.id)}
                            >
                                <div 
                                    className="absolute left-0 right-0 h-[2px]"
                                    style={{ 
                                        top: p1.y, 
                                        backgroundColor: isSelected ? '#3b82f6' : drawing.color, 
                                        transform: 'translateY(-50%)',
                                        height: isSelected ? '3px' : '2px'
                                    }}
                                />
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'VerticalLine':
                        return (
                            <div 
                                id={`drawing-group-${drawing.id}`} 
                                key={drawing.id} 
                                className="absolute inset-0 pointer-events-auto z-10 cursor-pointer"
                                onClick={() => setSelectedDrawingId(drawing.id)}
                            >
                                <div 
                                    className="absolute top-0 bottom-0 w-[2px]"
                                    style={{ 
                                        left: p1.x, 
                                        backgroundColor: isSelected ? '#3b82f6' : drawing.color, 
                                        transform: 'translateX(-50%)',
                                        width: isSelected ? '3px' : '2px'
                                    }}
                                />
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'Rectangle':
                        return (
                            <div 
                                id={`drawing-group-${drawing.id}`} 
                                key={drawing.id} 
                                className="absolute inset-0 pointer-events-auto z-10 cursor-pointer"
                                onClick={() => setSelectedDrawingId(drawing.id)}
                            >
                                <div 
                                    className="absolute border-2"
                                    style={{ 
                                        left: Math.min(p1.x, p2.x),
                                        top: Math.min(p1.y, p2.y),
                                        width: Math.abs(p2.x - p1.x),
                                        height: Math.abs(p2.y - p1.y),
                                        borderColor: isSelected ? '#3b82f6' : drawing.color,
                                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : `${drawing.color}22`,
                                        borderWidth: isSelected ? '3px' : '2px'
                                    }}
                                />
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'FibonacciLevels':
                        const fibDiff = p1.y - p2.y;
                        const levels = [
                            { val: 0, label: '0%' },
                            { val: 0.236, label: '23.6%' },
                            { val: 0.382, label: '38.2%' },
                            { val: 0.5, label: '50.0%' },
                            { val: 0.618, label: '61.8%' },
                            { val: 0.786, label: '78.6%' },
                            { val: 1, label: '100%' }
                        ];
                        return (
                            <div 
                                id={`drawing-group-${drawing.id}`} 
                                key={drawing.id} 
                                className="absolute inset-0 pointer-events-auto z-10 cursor-pointer"
                                onClick={() => setSelectedDrawingId(drawing.id)}
                            >
                                {levels.map(level => {
                                    const y = p1.y - fibDiff * level.val;
                                    return (
                                        <div key={level.val} className="absolute left-0 right-0 flex items-center" style={{ top: y }}>
                                            <div className={`flex-1 h-[1px] ${isSelected ? "bg-blue-500" : "bg-white/40"}`} />
                                            <span className="text-[10px] text-white font-mono px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-sm border border-white/10 ml-2">
                                                {level.label}
                                            </span>
                                        </div>
                                    );
                                })}
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'FibonacciFan':
                        const fanLevels = [0.382, 0.5, 0.618];
                        return (
                            <div id={`drawing-group-${drawing.id}`} key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <svg className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" onClick={() => setSelectedDrawingId(drawing.id)}>
                                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isSelected ? '#3b82f6' : drawing.color} strokeWidth="1" strokeDasharray="4" />
                                    {fanLevels.map(level => {
                                        const targetY = p1.y + (p2.y - p1.y) * level;
                                        const fanDx = p2.x - p1.x;
                                        const fanDy = targetY - p1.y;
                                        const fanLength = Math.sqrt(fanDx*fanDx + fanDy*fanDy) || 1;
                                        const rayX = p1.x + (fanDx / fanLength) * 10000;
                                        const rayY = p1.y + (fanDy / fanLength) * 10000;
                                        return (
                                            <line key={level} x1={p1.x} y1={p1.y} x2={rayX} y2={rayY} stroke={isSelected ? '#3b82f6' : drawing.color} strokeWidth="1" opacity={isSelected ? 0.8 : 0.5} />
                                        );
                                    })}
                                </svg>
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    case 'ParallelChannel':
                        const chDx = p2.x - p1.x;
                        const chDy = p2.y - p1.y;
                        const chOffset = drawing.points.length > 2 ? 
                            (seriesRef.current?.priceToCoordinate(drawing.points[2].price) || p1.y + 40) - p1.y : 40;
                        
                        return (
                            <div id={`drawing-group-${drawing.id}`} key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <svg className="absolute inset-0 w-full h-full pointer-events-auto cursor-pointer" onClick={() => setSelectedDrawingId(drawing.id)}>
                                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={isSelected ? '#3b82f6' : drawing.color} strokeWidth="2" />
                                    <line x1={p1.x} y1={p1.y + chOffset} x2={p2.x} y2={p2.y + chOffset} stroke={isSelected ? '#3b82f6' : drawing.color} strokeWidth="2" opacity="0.6" />
                                    <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p2.x} ${p2.y + chOffset} L ${p1.x} ${p1.y + chOffset} Z`} fill={isSelected ? '#3b82f6' : drawing.color} fillOpacity="0.1" />
                                </svg>
                                {deleteButton}
                                {handles}
                            </div>
                        );
                    default:
                        return null;
                }
            })}

            {/* Custom Trade Overlays */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                {/* Horizontal Line to Price Scale - Thin and Professional (Candle to Right) */}
                <div 
                    ref={horizontalLineRef}
                    className="absolute right-0 h-[1px] bg-white pointer-events-none z-20 hidden"
                    style={{ 
                        boxShadow: '0 0 5px rgba(255,255,255,0.7)',
                        opacity: 0.6
                    }}
                />
                
                {/* Vertical Line at current candle - Dotted line style */}
                <div 
                    ref={verticalLineRef}
                    className="absolute top-0 w-[1px] border-l border-white/40 border-dashed pointer-events-none z-20 hidden"
                />
                
                {/* Current Price Dot on Candle - Precise with Pulse */}
                <div className="absolute z-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(255,255,255,1)] pointer-events-none hidden"
                        ref={priceDotRef}
                        style={{ width: '6px', height: '6px' }}>
                    <div className="absolute inset-0 rounded-full animate-ping bg-white opacity-60" />
                </div>

                {/* Timer and Price Bubbles - Always present in DOM, controlled via refs */}
                <div 
                    ref={bubbleGroupRef}
                    className="absolute flex items-center pointer-events-none z-50 hidden"
                    style={{ right: 0 }}
                >
                    {/* Timer Bubble (Dark) - Olymp Style */}
                    <div 
                        ref={timerBubbleRef}
                        className="bg-[#1a1b1e] text-white text-[11px] font-bold px-2 py-1 rounded-md border border-white/10 mr-1 shadow-xl whitespace-nowrap"
                    >
                        {timerStringRef.current}
                    </div>
                    
                    {/* Price Bubble (White/Accent) - Olymp Style */}
                    <div 
                        ref={priceBubbleRef}
                        className="bg-white text-black text-[12px] font-bold px-3 py-1 rounded-l-md shadow-2xl min-w-[70px] text-center border-y border-l border-white/20"
                    >
                        --
                    </div>
                </div>

             {tradeCoords.map(coord => {
                const trade = trades.find(t => t.id === coord.id);
                if (!trade) return null;

                const isUp = trade.type === 'UP';
                const color = isUp ? '#0ecb81' : '#f6465d';
                const isFaded = trade.status !== 'ACTIVE';

                return (
                    <div key={coord.id} className="absolute inset-0 pointer-events-none" style={{ opacity: isFaded ? 0.4 : 1 }}>
                                {/* Entry Point Marker - Professional Style (Yellow Tag & Line) */}
                                <div 
                                    id={`trade-entry-${trade.id}`}
                                    className="absolute z-40 flex items-center flex-row-reverse"
                                    style={{ 
                                        left: '-999px',
                                        top: '-999px',
                                        transform: 'translate(-100%, -50%)',
                                        visibility: 'hidden'
                                    }}
                                >
                                    <div 
                                        className="relative flex items-center flex-row-reverse"
                                    >
                                        {/* Circle at Entry Point */}
                                        <div className="w-4 h-4 bg-[#ffeb3b] rounded-full border-2 border-[#101114] shadow-[0_0_10px_rgba(255,235,59,0.6)] z-10" />
                                        
                                        {/* Line and Tag to the Left */}
                                        <div className="flex items-center flex-row-reverse">
                                            <div className="w-8 h-[2.5px] bg-[#ffeb3b] shadow-[0_0_10px_rgba(255,235,59,0.4)]" />
                                            <div 
                                                className="bg-[#ffeb3b] text-black font-black px-2 py-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,235,59,0.5)] rounded-l-md"
                                                style={{
                                                    minWidth: '50px',
                                                    height: '24px',
                                                    fontSize: '11px',
                                                    letterSpacing: '-0.5px',
                                                    clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)',
                                                    paddingRight: '10px'
                                                }}
                                            >
                                                {currencySymbol}{Math.round(trade.amount * exchangeRate)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                        {/* Exit Point Marker (if finished) - Olymp Style Result Bubble */}
                        {trade.status !== 'ACTIVE' && (
                            <div 
                                id={`trade-result-${trade.id}`}
                                className="absolute z-40 flex flex-col items-center"
                                style={{ 
                                    left: '-999px',
                                    top: '-999px',
                                    transform: 'translate(-50%, -50%)',
                                    visibility: 'hidden'
                                }}
                            >
                                {/* Result Bubble */}
                                <div 
                                    className="mb-1 px-2 py-1 rounded-md text-[11px] font-black text-white shadow-2xl border border-white/20 whitespace-nowrap flex items-center gap-1.5"
                                    style={{ 
                                        backgroundColor: trade.status === 'WIN' ? '#0ecb81' : '#f6465d',
                                        boxShadow: `0 4px 15px ${trade.status === 'WIN' ? '#0ecb8144' : '#f6465d44'}`
                                    }}
                                >
                                    {trade.status === 'WIN' ? (
                                        <TrendingUp size={12} strokeWidth={3} />
                                    ) : (
                                        <TrendingDown size={12} strokeWidth={3} />
                                    )}
                                    {trade.status === 'WIN' ? `+${currencySymbol}${Math.round(trade.amount * (trade.payout / 100) * exchangeRate)}` : `-${currencySymbol}${Math.round(trade.amount * exchangeRate)}`}
                                </div>
                                
                                {/* Exit Dot with Pulse */}
                                <div className="relative">
                                    <div 
                                        className="w-4 h-4 rounded-full border-2 border-[#101114] shadow-2xl flex items-center justify-center z-10 relative"
                                        style={{ backgroundColor: trade.status === 'WIN' ? '#0ecb81' : '#f6465d' }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                    </div>
                                    <div 
                                        className="absolute inset-0 rounded-full animate-ping opacity-30"
                                        style={{ backgroundColor: trade.status === 'WIN' ? '#0ecb81' : '#f6465d' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        </motion.div>
    </div>
  );
};
