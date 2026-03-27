import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, ArrowDown, Clock, TrendingUp, TrendingDown, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CrosshairMode, CandlestickSeries, AreaSeries, BarSeries, LineSeries, HistogramSeries } from 'lightweight-charts';
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
  timezoneOffset?: number;
  activeIndicators?: IndicatorConfig[];
  currencySymbol?: string;
  exchangeRate?: number;
  onVisibleTimeRangeChange?: (range: { from: number; to: number }) => void;
}

interface Drawing {
  id: string;
  type: string;
  points: { time: number; price: number }[];
  color: string;
}

const DRAWING_TOOLS = ['TrendLine', 'HorizontalLine', 'VerticalLine', 'Rectangle', 'Ray', 'FibonacciLevels', 'FibonacciFan', 'ParallelChannel'];

const ChartSkeleton = () => (
  <div className="absolute inset-0 bg-[var(--bg-primary)] flex items-center justify-center z-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      <span className="text-sm font-medium text-[var(--text-secondary)] animate-pulse">Loading chart data...</span>
    </div>
  </div>
);

const getTimeFrameInMs = (tf: string): number => {
  const value = parseInt(tf);
  const unit = tf.replace(String(value), '');
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
};

export const TradingChart: React.FC<TradingChartProps> = ({ 
  data, 
  trades, 
  assetName,
  currentTime,
  chartType,
  chartTimeFrame,
  isLoading,
  timezoneOffset = 0,
  activeIndicators = [],
  currencySymbol = '$',
  exchangeRate = 1,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorsRef = useRef<Record<string, ISeriesApi<any>>>({});
  const verticalLineRef = useRef<HTMLDivElement>(null);
  const horizontalLineRef = useRef<HTMLDivElement>(null);
  const priceDotRef = useRef<HTMLDivElement>(null);
  const bubbleGroupRef = useRef<HTMLDivElement>(null);
  const prevAssetRef = useRef<string>(assetName);
  const isInitializedRef = useRef(false);
  const tradesRef = useRef<Trade[]>(trades);
  const dataRef = useRef<OHLCData[]>(data);
  const [tradeCoords, setTradeCoords] = useState<Array<{ id: string; y: number; price: number; type: 'UP' | 'DOWN'; amount: number }>>([]);
  const [latestCoords, setLatestCoords] = useState<{ x: number; y: number; price: number } | null>(null);
  const [drawings, setDrawings] = useState<Drawing[]>(() => {
    try {
      const saved = localStorage.getItem(`drawings_${assetName}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`drawings_${assetName}`, JSON.stringify(drawings));
    } catch (e) {
      console.error('Failed to save drawings', e);
    }
  }, [drawings, assetName]);

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
    // Filter trades for the current asset
    const currentAssetTrades = trades.filter(t => t.asset === assetName);
    
    const coords = currentAssetTrades.map(trade => {
        const y = series.priceToCoordinate(trade.entryPrice);
        return {
            id: trade.id,
            y: y !== null ? y : -100,
            price: trade.entryPrice,
            type: trade.type,
            amount: trade.amount,
            endTime: trade.endTime,
            startTime: trade.startTime
        };
    });
    
    setTradeCoords(prev => {
      if (JSON.stringify(prev) === JSON.stringify(coords)) return prev;
      return coords;
    });
  }, [assetName, trades]);

  const updateLatestCoords = useCallback(() => {
    if (!chartRef.current || !seriesRef.current || dataRef.current.length === 0) return;
    const series = seriesRef.current;
    const lastCandle = dataRef.current[dataRef.current.length - 1];
    const x = chartRef.current.timeScale().timeToCoordinate((lastCandle.time / 1000) as Time);
    const y = series.priceToCoordinate(lastCandle.close);
    
    // Update state for text content only if changed significantly
    setLatestCoords(prev => {
      const newCoords = { x: x || 0, y: y || 0, price: lastCandle.close };
      if (prev && prev.x === newCoords.x && prev.y === newCoords.y && prev.price === newCoords.price) {
        return prev;
      }
      return newCoords;
    });

    // Direct DOM updates for zero-lag positioning
    if (verticalLineRef.current) {
        verticalLineRef.current.style.display = x !== null ? 'block' : 'none';
        if (x !== null) verticalLineRef.current.style.left = `${x}px`;
    }
    if (horizontalLineRef.current) {
        horizontalLineRef.current.style.display = (x !== null && y !== null) ? 'block' : 'none';
        if (y !== null) horizontalLineRef.current.style.top = `${y}px`;
        if (x !== null) horizontalLineRef.current.style.left = `${x}px`;
    }
    if (priceDotRef.current) {
        priceDotRef.current.style.display = (x !== null && y !== null) ? 'block' : 'none';
        if (x !== null && y !== null) {
            priceDotRef.current.style.left = `${x}px`;
            priceDotRef.current.style.top = `${y}px`;
        }
    }
    if (bubbleGroupRef.current) {
        bubbleGroupRef.current.style.display = y !== null ? 'flex' : 'none';
        if (y !== null) bubbleGroupRef.current.style.top = `${y - 10}px`;
    }
  }, []);

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
    
    setDrawingCoords(prev => {
      if (JSON.stringify(prev) === JSON.stringify(coords)) return prev;
      return coords;
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
    }
  }, [activeIndicators, drawingMode]);

  // Handle Mouse Events for Drawing
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !chartRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      const mode = drawingModeRef.current;
      console.log('MouseDown', mode);
      if (!mode || !chartRef.current) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const time = chartRef.current.timeScale().coordinateToTime(x) as number;
      const price = seriesRef.current?.coordinateToPrice(y) as number;
      
      console.log('Time/Price', time, price);
      
      if (time && price) {
        setCurrentDrawing({
          id: Math.random().toString(36).substr(2, 9),
          type: mode,
          points: [{ time, price }, { time, price }],
          color: '#ffffff'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const drawing = currentDrawingRef.current;
      if (!drawing || !chartRef.current) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const time = chartRef.current.timeScale().coordinateToTime(x) as number;
      const price = seriesRef.current?.coordinateToPrice(y) as number;
      
      if (time && price) {
        setCurrentDrawing(prev => {
          if (!prev) return null;
          const newPoints = [...prev.points];
          newPoints[1] = { time, price };
          return { ...prev, points: newPoints };
        });
      }
    };

    const handleMouseUp = () => {
      const drawing = currentDrawingRef.current;
      if (drawing) {
        setDrawings(prev => [...prev, drawing]);
        setCurrentDrawing(null);
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 1. Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        vertLines: { color: colors.border },
        horzLines: { color: colors.border },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: colors.border,
        fixLeftEdge: true,
        fixRightEdge: false, // Allow pulling the candle to the middle
        minBarSpacing: 5,
        maxBarSpacing: 50,
        shiftVisibleRangeOnNewBar: true,
        rightOffset: 45,
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
      },
      crosshair: {
        mode: CrosshairMode.Hidden,
      },
      handleScroll: true,
      handleScale: {
        axisPressedMouseMove: {
            price: false, // Disable manual price scaling to keep the "system" stable
            time: false,  // Disable manual time scaling to prevent distortion
        },
        mouseWheel: true,
        pinch: true,
        axisDoubleClickReset: true,
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

    // Initial data load
    if (data.length > 0) {
      let prevHA: any = null;
      const formattedData = data.map(d => {
        const base = {
          time: (d.time / 1000) as Time,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
        };
        
        if (chartType === 'Area') return { time: base.time, value: base.close };
        
        if (chartType === 'Heikin Ashi') {
          const haClose = (base.open + base.high + base.low + base.close) / 4;
          const haOpen = prevHA ? (prevHA.open + prevHA.close) / 2 : (base.open + base.close) / 2;
          const haHigh = Math.max(base.high, haOpen, haClose);
          const haLow = Math.min(base.low, haOpen, haClose);
          const haCandle = { time: base.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
          prevHA = haCandle;
          return haCandle;
        }
        
        return base;
      });
      series.setData(formattedData);
    }

    chart.priceScale('right').applyOptions({
      scaleMargins: {
        top: 0.1,
        bottom: 0.3,
      },
    });

    // We'll configure oscillators scale only when needed to avoid "incorrect ID" error

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };

    window.addEventListener('resize', handleResize);

    // Update trade coordinates on scroll/zoom
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        updateTradeCoordsRef.current();
        updateLatestCoordsRef.current();
        updateDrawingCoordsRef.current();
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
      isInitializedRef.current = false;
      indicatorsRef.current = {};
    };
  }, [chartType]); // Recreate chart when type changes

  // Keep refs updated
  useEffect(() => {
    tradesRef.current = trades;
    dataRef.current = data;
  }, [trades, data]);

  // Handle Indicators
  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const chart = chartRef.current;
    const closePrices = data.map(d => d.close);
    const highPrices = data.map(d => d.high);
    const lowPrices = data.map(d => d.low);
    const times = data.map(d => (d.time / 1000) as Time);

    // Helper to clear indicators
    const clearIndicators = () => {
      Object.values(indicatorsRef.current).forEach(series => {
        try {
          chart.removeSeries(series);
        } catch (e) {}
      });
      indicatorsRef.current = {};
    };

    // Check if we need to recreate indicators (active list changed or chart instance changed)
    const currentIndicatorKeys = Object.keys(indicatorsRef.current);
    const SUPPORTED_INDICATORS = [
      'SMA', 'EMA', 'WMA', 'BollingerBands', 'ParabolicSAR', 'Volumes', 
      'RSI', 'MACD', 'CCI', 'ATR', 'WilliamsR', 'AverageDirectionalIndex', 
      'AwesomeOscillator', 'RateOfChange', 'Stochastic'
    ];

    const expectedKeys = activeIndicators
      .filter(ind => SUPPORTED_INDICATORS.includes(ind.id))
      .flatMap(ind => {
        if (ind.id === 'BollingerBands') return ['BBUpper', 'BBLower', 'BBMiddle'];
        if (ind.id === 'MACD') return ['MACDLine', 'MACDSignal', 'MACDHist'];
        if (ind.id === 'AverageDirectionalIndex') return ['ADX', 'PDI', 'MDI'];
        if (ind.id === 'Stochastic') return ['StochK', 'StochD'];
        if (ind.id === 'Volumes') return ['Volumes'];
        return [ind.id];
      });

    const needsRecreate = currentIndicatorKeys.length !== expectedKeys.length || 
                         !expectedKeys.every(key => currentIndicatorKeys.includes(key));

    if (needsRecreate) {
      clearIndicators();
      
      const hasOscillators = activeIndicators.some(ind => 
        ['RSI', 'MACD', 'CCI', 'ATR', 'WilliamsR', 'AverageDirectionalIndex', 'AwesomeOscillator', 'RateOfChange', 'Stochastic'].includes(ind.id)
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
            indicatorsRef.current['SMA'] = chart.addSeries(LineSeries, { ...commonLineOptions, color: indicator.color || '#2962FF' });
            break;
          case 'EMA':
            indicatorsRef.current['EMA'] = chart.addSeries(LineSeries, { ...commonLineOptions, color: indicator.color || '#FF6D00' });
            break;
          case 'WMA':
            indicatorsRef.current['WMA'] = chart.addSeries(LineSeries, { ...commonLineOptions, color: indicator.color || '#E91E63' });
            break;
          case 'BollingerBands':
            indicatorsRef.current['BBUpper'] = chart.addSeries(LineSeries, { ...commonLineOptions, color: indicator.color || 'rgba(41, 98, 255, 0.4)', lineWidth: 1 as any });
            indicatorsRef.current['BBLower'] = chart.addSeries(LineSeries, { ...commonLineOptions, color: indicator.color || 'rgba(41, 98, 255, 0.4)', lineWidth: 1 as any });
            indicatorsRef.current['BBMiddle'] = chart.addSeries(LineSeries, { ...commonLineOptions, color: indicator.color || 'rgba(41, 98, 255, 0.2)', lineWidth: 1 as any, lineStyle: 2 as any });
            break;
          case 'ParabolicSAR':
            indicatorsRef.current['ParabolicSAR'] = chart.addSeries(LineSeries, { 
              ...commonLineOptions, 
              color: indicator.color || '#00BCD4', 
              lineWidth: 2 as any,
              lineStyle: 2 as any,
            });
            break;
          case 'Volumes':
            indicatorsRef.current['Volumes'] = chart.addSeries(HistogramSeries, {
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
            indicatorsRef.current['RSI'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#9C27B0' });
            break;
          case 'MACD':
            indicatorsRef.current['MACDLine'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#2196F3' });
            indicatorsRef.current['MACDSignal'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: '#FF5252' });
            indicatorsRef.current['MACDHist'] = chart.addSeries(HistogramSeries, { 
              priceScaleId: 'oscillators',
              priceLineVisible: false,
              lastValueVisible: false,
            });
            break;
          case 'CCI':
            indicatorsRef.current['CCI'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#FFEB3B' });
            break;
          case 'ATR':
            indicatorsRef.current['ATR'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#607D8B' });
            break;
          case 'WilliamsR':
            indicatorsRef.current['WilliamsR'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#F44336' });
            break;
          case 'AverageDirectionalIndex':
            indicatorsRef.current['ADX'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#FF9800' });
            indicatorsRef.current['PDI'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: '#4CAF50', lineWidth: 1 as any });
            indicatorsRef.current['MDI'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: '#F44336', lineWidth: 1 as any });
            break;
          case 'AwesomeOscillator':
            indicatorsRef.current['AwesomeOscillator'] = chart.addSeries(HistogramSeries, { 
              priceScaleId: 'oscillators',
              priceLineVisible: false,
              lastValueVisible: false,
            });
            break;
          case 'RateOfChange':
            indicatorsRef.current['RateOfChange'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#00BCD4' });
            break;
          case 'Stochastic':
            indicatorsRef.current['StochK'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: indicator.color || '#2196F3' });
            indicatorsRef.current['StochD'] = chart.addSeries(LineSeries, { ...oscillatorOptions, color: '#FF9800' });
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
      try {
        if (indicator.id === 'SMA' && indicatorsRef.current['SMA']) {
          const period = indicator.params.period || 14;
          const result = SMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const smaData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['SMA'].setData(smaData);
        }

        if (indicator.id === 'EMA' && indicatorsRef.current['EMA']) {
          const period = indicator.params.period || 14;
          const result = EMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const emaData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['EMA'].setData(emaData);
        }

        if (indicator.id === 'WMA' && indicatorsRef.current['WMA']) {
          const period = indicator.params.period || 14;
          const result = WMA.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const wmaData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['WMA'].setData(wmaData);
        }

        if (indicator.id === 'BollingerBands' && indicatorsRef.current['BBUpper']) {
          const period = indicator.params.period || 20;
          const stdDev = indicator.params.stdDev || 2;
          const result = BollingerBands.calculate({ period, stdDev, values: closePrices });
          const offset = closePrices.length - result.length;
          
          const upperData = result.map((val, idx) => ({ time: times[idx + offset], value: val.upper }));
          const lowerData = result.map((val, idx) => ({ time: times[idx + offset], value: val.lower }));
          const middleData = result.map((val, idx) => ({ time: times[idx + offset], value: val.middle }));
          
          indicatorsRef.current['BBUpper'].setData(upperData);
          indicatorsRef.current['BBLower'].setData(lowerData);
          indicatorsRef.current['BBMiddle'].setData(middleData);
        }

        if (indicator.id === 'ParabolicSAR' && indicatorsRef.current['ParabolicSAR']) {
          const step = indicator.params.step || 0.02;
          const max = indicator.params.max || 0.2;
          const result = PSAR.calculate({ step, max, high: highPrices, low: lowPrices });
          const offset = closePrices.length - result.length;
          const sarData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['ParabolicSAR'].setData(sarData);
        }

        if (indicator.id === 'RSI' && indicatorsRef.current['RSI']) {
          const period = indicator.params.period || 14;
          const result = RSI.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const rsiData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['RSI'].setData(rsiData);
        }

        if (indicator.id === 'MACD' && indicatorsRef.current['MACDLine']) {
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

          indicatorsRef.current['MACDLine'].setData(macdData);
          indicatorsRef.current['MACDSignal'].setData(signalData);
          indicatorsRef.current['MACDHist'].setData(histData);
        }

        if (indicator.id === 'CCI' && indicatorsRef.current['CCI']) {
          const period = indicator.params.period || 20;
          const result = CCI.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          const cciData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['CCI'].setData(cciData);
        }

        if (indicator.id === 'ATR' && indicatorsRef.current['ATR']) {
          const period = indicator.params.period || 14;
          const result = ATR.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          const atrData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['ATR'].setData(atrData);
        }

        if (indicator.id === 'WilliamsR' && indicatorsRef.current['WilliamsR']) {
          const period = indicator.params.period || 14;
          const result = WilliamsR.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          const wrData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['WilliamsR'].setData(wrData);
        }

        if (indicator.id === 'AverageDirectionalIndex' && indicatorsRef.current['ADX']) {
          const period = indicator.params.period || 14;
          const result = ADX.calculate({ period, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          
          const adxData = result.map((val, idx) => ({ time: times[idx + offset], value: val.adx }));
          const pdiData = result.map((val, idx) => ({ time: times[idx + offset], value: val.pdi }));
          const mdiData = result.map((val, idx) => ({ time: times[idx + offset], value: val.mdi }));
          
          indicatorsRef.current['ADX'].setData(adxData);
          indicatorsRef.current['PDI'].setData(pdiData);
          indicatorsRef.current['MDI'].setData(mdiData);
        }

        if (indicator.id === 'AwesomeOscillator' && indicatorsRef.current['AwesomeOscillator']) {
          const fastPeriod = indicator.params.fastPeriod || 5;
          const slowPeriod = indicator.params.slowPeriod || 34;
          const result = AwesomeOscillator.calculate({ fastPeriod, slowPeriod, high: highPrices, low: lowPrices });
          const offset = closePrices.length - result.length;
          
          const aoData = result.map((val, idx) => ({ 
            time: times[idx + offset], 
            value: val,
            color: val >= (idx > 0 ? result[idx - 1] : 0) ? '#0ecb81' : '#f6465d'
          }));
          
          indicatorsRef.current['AwesomeOscillator'].setData(aoData);
        }

        if (indicator.id === 'RateOfChange' && indicatorsRef.current['RateOfChange']) {
          const period = indicator.params.period || 14;
          const result = ROC.calculate({ period, values: closePrices });
          const offset = closePrices.length - result.length;
          const rocData = result.map((val, idx) => ({ time: times[idx + offset], value: val }));
          indicatorsRef.current['RateOfChange'].setData(rocData);
        }

        if (indicator.id === 'Volumes' && indicatorsRef.current['Volumes']) {
          const volumeData = data.map(d => ({
            time: (d.time / 1000) as Time,
            value: d.volume || Math.random() * 1000, // Fallback to random if no volume provided
            color: d.close >= d.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
          }));
          indicatorsRef.current['Volumes'].setData(volumeData);
        }

        if (indicator.id === 'Stochastic' && indicatorsRef.current['StochK']) {
          const period = indicator.params.period || 14;
          const signalPeriod = indicator.params.signalPeriod || 3;
          const result = Stochastic.calculate({ period, signalPeriod, high: highPrices, low: lowPrices, close: closePrices });
          const offset = closePrices.length - result.length;
          
          const stochKData = result.map((val, idx) => ({ time: times[idx + offset], value: val.k }));
          const stochDData = result.map((val, idx) => ({ time: times[idx + offset], value: val.d }));
          
          indicatorsRef.current['StochK'].setData(stochKData);
          indicatorsRef.current['StochD'].setData(stochDData);
        }
      } catch (e) {
        console.error(`Error updating indicator ${indicator}:`, e);
      }
    });
  }, [data, activeIndicators, chartType]);

  const prevHARef = useRef<any>(null);

  // 2. Update Data
  useEffect(() => {
    if (!seriesRef.current || !isInitializedRef.current) return;

    const series = seriesRef.current;
    
    // Check if asset changed, first load, or data length changed significantly (full reset)
    const currentSeriesData = series.data();
    const assetChanged = prevAssetRef.current !== assetName;
    
    if (data.length === 0) {
      if (assetChanged) {
        series.setData([]);
        prevAssetRef.current = assetName;
      }
      return;
    }

    const shouldFullReset = 
      assetChanged || 
      currentSeriesData.length === 0 ||
      Math.abs(data.length - currentSeriesData.length) > 5; // Increased threshold to avoid reset on small updates

    if (shouldFullReset) {
       if (assetChanged) {
          series.setData([]); // Explicitly clear old asset data
       }
       
       let prevHA: any = null;
       const formattedData = data.map(d => {
         const base = {
           time: (d.time / 1000) as Time,
           open: d.open,
           high: d.high,
           low: d.low,
           close: d.close,
         };
         
         if (chartType === 'Area') {
           return { time: base.time, value: base.close };
         }

         if (chartType === 'Heikin Ashi') {
            const haClose = (base.open + base.high + base.low + base.close) / 4;
            const haOpen = prevHA ? (prevHA.open + prevHA.close) / 2 : (base.open + base.close) / 2;
            const haHigh = Math.max(base.high, haOpen, haClose);
            const haLow = Math.min(base.low, haOpen, haClose);
            const haCandle = { time: base.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
            prevHA = haCandle;
            return haCandle;
         }

         return base;
       });
       series.setData(formattedData);
       prevAssetRef.current = assetName;
       prevHARef.current = prevHA;
       // Fit content on asset change or full reset
       if (assetChanged) {
          setTimeout(() => {
             chartRef.current?.timeScale().fitContent();
          }, 50);
       }
    } else {
       // Update last candle (incremental update)
       const lastCandle = data[data.length - 1];
       if (lastCandle) {
         let updateData: any;
         
         if (chartType === 'Area') {
            updateData = { time: (lastCandle.time / 1000) as Time, value: lastCandle.close };
         } else if (chartType === 'Heikin Ashi') {
            const base = {
                time: (lastCandle.time / 1000) as Time,
                open: lastCandle.open,
                high: lastCandle.high,
                low: lastCandle.low,
                close: lastCandle.close,
            };
            
            // For Heikin Ashi update, we need the previous candle's HA values
            const haClose = (base.open + base.high + base.low + base.close) / 4;
            const haOpen = prevHARef.current ? (prevHARef.current.open + prevHARef.current.close) / 2 : (base.open + base.close) / 2;
            const haHigh = Math.max(base.high, haOpen, haClose);
            const haLow = Math.min(base.low, haOpen, haClose);
            updateData = { time: base.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
            
            // Update prevHARef only if this is a NEW candle (length increased)
            if (data.length > currentSeriesData.length) {
                prevHARef.current = updateData;
            }
         } else {
            updateData = {
               time: (lastCandle.time / 1000) as Time,
               open: lastCandle.open,
               high: lastCandle.high,
               low: lastCandle.low,
               close: lastCandle.close,
             };
         }
         
         try {
            series.update(updateData);
         } catch (e) {
            console.warn("Chart update failed, falling back to setData:", e);
            // Fallback to full setData if update fails for any reason
            const formattedData = data.map(d => ({
                time: (d.time / 1000) as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));
            series.setData(formattedData as any);
         }
       }
    }
    
    // Also update trade coords when price moves
    updateTradeCoordsRef.current();
    updateLatestCoordsRef.current();
    updateDrawingCoordsRef.current();
  }, [data, assetName, trades, chartType, drawings]);

  const tfMs = getTimeFrameInMs(chartTimeFrame);
  const currentTFStart = Math.floor(currentTime / tfMs) * tfMs;
  const nextTFStart = currentTFStart + tfMs;
  const remainingMs = nextTFStart - currentTime;
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

  return (
    <div ref={chartContainerRef} className="w-full h-full relative overflow-hidden bg-[var(--bg-primary)] flex-1 min-h-[300px] touch-none">
        <AnimatePresence>
            {(isLoading || data.length === 0) && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50"
                >
                    <ChartSkeleton />
                </motion.div>
            )}
        </AnimatePresence>
        
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: (isLoading || data.length === 0) ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full absolute inset-0"
        >
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
                
                switch (drawing.type) {
                    case 'TrendLine':
                        return (
                            <div key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <svg className="absolute inset-0 w-full h-full">
                                    <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={drawing.color} strokeWidth="2" />
                                </svg>
                                <button 
                                    className="absolute z-20 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center pointer-events-auto text-[10px]"
                                    style={{ left: p1.x, top: p1.y }}
                                    onClick={() => setDrawings(prev => prev.filter(d => d.id !== drawing.id))}
                                >
                                    X
                                </button>
                            </div>
                        );
                    case 'Ray':
                        // Calculate ray end point (far away)
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const length = Math.sqrt(dx*dx + dy*dy) || 1;
                        const rayX = p1.x + (dx / length) * 5000;
                        const rayY = p1.y + (dy / length) * 5000;
                        return (
                            <div key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <svg className="absolute inset-0 w-full h-full">
                                    <line x1={p1.x} y1={p1.y} x2={rayX} y2={rayY} stroke={drawing.color} strokeWidth="2" />
                                </svg>
                                <button 
                                    className="absolute z-20 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center pointer-events-auto text-[10px]"
                                    style={{ left: p1.x, top: p1.y }}
                                    onClick={() => setDrawings(prev => prev.filter(d => d.id !== drawing.id))}
                                >
                                    X
                                </button>
                            </div>
                        );
                    case 'HorizontalLine':
                        return (
                            <div key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <div 
                                    className="absolute left-0 right-0 h-[2px]"
                                    style={{ top: p1.y, backgroundColor: drawing.color, transform: 'translateY(-50%)' }}
                                />
                                <button 
                                    className="absolute z-20 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center pointer-events-auto text-[10px]"
                                    style={{ left: '50%', top: p1.y }}
                                    onClick={() => setDrawings(prev => prev.filter(d => d.id !== drawing.id))}
                                >
                                    X
                                </button>
                            </div>
                        );
                    case 'VerticalLine':
                        return (
                            <div key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <div 
                                    className="absolute top-0 bottom-0 w-[2px]"
                                    style={{ left: p1.x, backgroundColor: drawing.color, transform: 'translateX(-50%)' }}
                                />
                                <button 
                                    className="absolute z-20 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center pointer-events-auto text-[10px]"
                                    style={{ left: p1.x, top: '50%' }}
                                    onClick={() => setDrawings(prev => prev.filter(d => d.id !== drawing.id))}
                                >
                                    X
                                </button>
                            </div>
                        );
                    case 'Rectangle':
                        return (
                            <div key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                <div 
                                    className="absolute border-2"
                                    style={{ 
                                        left: Math.min(p1.x, p2.x),
                                        top: Math.min(p1.y, p2.y),
                                        width: Math.abs(p2.x - p1.x),
                                        height: Math.abs(p2.y - p1.y),
                                        borderColor: drawing.color,
                                        backgroundColor: `${drawing.color}22`
                                    }}
                                />
                                <button 
                                    className="absolute z-20 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center pointer-events-auto text-[10px]"
                                    style={{ left: Math.min(p1.x, p2.x), top: Math.min(p1.y, p2.y) }}
                                    onClick={() => setDrawings(prev => prev.filter(d => d.id !== drawing.id))}
                                >
                                    X
                                </button>
                            </div>
                        );
                    case 'FibonacciLevels':
                        const diff = p1.y - p2.y;
                        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                        return (
                            <div key={drawing.id} className="absolute inset-0 pointer-events-none z-10">
                                {levels.map(level => {
                                    const y = p1.y - diff * level;
                                    return (
                                        <div key={level} className="absolute left-0 right-0 flex items-center" style={{ top: y }}>
                                            <div className="flex-1 h-[1px] bg-white/30" />
                                            <span className="text-[9px] text-white/50 px-1 bg-[#121212]/50 rounded">{(level * 100).toFixed(1)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    case 'FibonacciFan':
                        const fanLevels = [0.382, 0.5, 0.618];
                        return (
                            <svg key={drawing.id} className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={drawing.color} strokeWidth="1" strokeDasharray="4" />
                                {fanLevels.map(level => {
                                    const targetY = p1.y + (p2.y - p1.y) * level;
                                    const dx = p2.x - p1.x;
                                    const dy = targetY - p1.y;
                                    const length = Math.sqrt(dx*dx + dy*dy) || 1;
                                    const rayX = p1.x + (dx / length) * 5000;
                                    const rayY = p1.y + (dy / length) * 5000;
                                    return (
                                        <line key={level} x1={p1.x} y1={p1.y} x2={rayX} y2={rayY} stroke={drawing.color} strokeWidth="1" opacity="0.5" />
                                    );
                                })}
                            </svg>
                        );
                    case 'ParallelChannel':
                        const channelDx = p2.x - p1.x;
                        const channelDy = p2.y - p1.y;
                        const offset = 40; // Default offset for channel
                        return (
                            <svg key={drawing.id} className="absolute inset-0 w-full h-full pointer-events-none z-10">
                                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={drawing.color} strokeWidth="2" />
                                <line x1={p1.x} y1={p1.y + offset} x2={p2.x} y2={p2.y + offset} stroke={drawing.color} strokeWidth="2" opacity="0.6" />
                                <path d={`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p2.x} ${p2.y + offset} L ${p1.x} ${p1.y + offset} Z`} fill={drawing.color} fillOpacity="0.1" />
                            </svg>
                        );
                    default:
                        return null;
                }
            })}

            {/* Custom Trade Overlays */}
            <div className="absolute inset-0 pointer-events-none z-20">
            {/* Latest Price UI (from image) */}
            {latestCoords && (
                <>
                    {/* Horizontal Line to Price Scale - Thin and Professional */}
                    <div 
                        ref={horizontalLineRef}
                        className="absolute left-0 right-0 h-[1px] bg-[var(--text-primary)] pointer-events-none opacity-30 z-20"
                    />
                    
                    {/* Vertical Line at current candle - Thin and Dashed */}
                    <div 
                        ref={verticalLineRef}
                        className="absolute top-0 bottom-0 border-l border-dashed border-[var(--text-primary)] opacity-30 pointer-events-none z-20"
                    />
                    
                    {/* Current Price Dot on Candle - Small and Precise */}
                    <div 
                        ref={priceDotRef}
                        className="absolute w-1.5 h-1.5 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(255,255,255,0.8)] pointer-events-none z-30"
                    />

                    {/* Timer and Price Bubbles */}
                    <div 
                        ref={bubbleGroupRef}
                        className="absolute flex items-center pointer-events-none z-50"
                        style={{ right: 0 }}
                    >
                        {/* Timer Bubble (Dark) - Olymp Style */}
                        <div className="bg-[#1a1b1e] text-white text-[11px] font-bold px-2 py-1 rounded-md border border-white/10 mr-1 shadow-xl">
                            {timerString}
                        </div>
                        
                        {/* Price Bubble (White/Accent) - Olymp Style */}
                        <div className="bg-white text-black text-[12px] font-bold px-3 py-1 rounded-l-md shadow-2xl min-w-[70px] text-center border-y border-l border-white/20">
                            {latestCoords.price < 10 ? latestCoords.price.toFixed(5) : latestCoords.price.toFixed(3)}
                        </div>
                    </div>
                </>
            )}

             {tradeCoords.map(coord => {
                const trade = trades.find(t => t.id === coord.id);
                if (!trade || coord.y === -100) return null;
                
                // Calculate X coordinate for the entry point
                // If timeToCoordinate returns null (e.g. for very recent trades), 
                // we try to use the latest candle's X
                let entryX = chartRef.current?.timeScale().timeToCoordinate((trade.startTime / 1000) as Time);
                
                if (entryX === null && trade.status === 'ACTIVE') {
                    // Fallback for very recent trades: use the latest candle's X
                    const lastData = dataRef.current[dataRef.current.length - 1];
                    if (lastData) {
                        entryX = chartRef.current?.timeScale().timeToCoordinate((lastData.time / 1000) as Time);
                    }
                }

                const exitX = trade.status !== 'ACTIVE' ? chartRef.current?.timeScale().timeToCoordinate((trade.endTime / 1000) as Time) : null;
                
                // Calculate time remaining for active trades
                const timeLeft = Math.max(0, Math.ceil((trade.endTime - currentTime) / 1000));
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

                const isUp = trade.type === 'UP';
                const color = isUp ? '#0ecb81' : '#f6465d';

                return (
                    <div key={coord.id} className="absolute inset-0 pointer-events-none">
                        {/* Horizontal Entry Line - Professional Style */}
                        {coord.y !== -100 && (
                            <>
                                <div 
                                    className="absolute left-0 right-0 h-0 z-10"
                                    style={{
                                        top: coord.y,
                                        borderTop: '1.5px solid rgba(148, 163, 184, 0.8)',
                                        transform: 'translateY(-50%)',
                                        boxShadow: '0 0 5px rgba(148, 163, 184, 0.2)'
                                    }}
                                />
                                
                                {/* Entry Point Marker - Professional Style (Yellow Tag & Line) */}
                                <div 
                                    className="absolute z-40 flex items-center flex-row-reverse"
                                    style={{ 
                                        left: entryX !== null ? entryX : '100%',
                                        top: coord.y,
                                        transform: 'translate(-100%, -50%)',
                                        visibility: (entryX === null && trade.status !== 'ACTIVE') ? 'hidden' : 'visible'
                                    }}
                                >
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
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
                                    </motion.div>
                                </div>

                                {/* Entry Price Label on Right Axis (Pill matching trade color) */}
                                <div 
                                    className="absolute right-0 z-50 flex items-center"
                                    style={{ top: coord.y, transform: 'translateY(-50%)' }}
                                >
                                    <div className="w-6 h-[1px] bg-slate-400/50" />
                                    <div 
                                        className="text-white text-[11px] font-black px-2 py-0.5 rounded-l-md shadow-xl min-w-[65px] text-center border-y border-l"
                                        style={{ 
                                            backgroundColor: color,
                                            borderColor: 'rgba(255,255,255,0.2)',
                                            boxShadow: `0 0 10px ${color}44`
                                        }}
                                    >
                                        {trade.entryPrice < 10 ? trade.entryPrice.toFixed(5) : trade.entryPrice.toFixed(3)}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Expiration Vertical Line - Olymp Style */}
                        {trade.status === 'ACTIVE' && (
                            <>
                                {(() => {
                                    const expX = chartRef.current?.timeScale().timeToCoordinate((trade.endTime / 1000) as Time);
                                    if (expX !== null && expX > 0) {
                                        return (
                                            <div 
                                                className="absolute top-0 bottom-0 border-l border-dashed z-10"
                                                style={{ 
                                                    left: expX, 
                                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                                    borderWidth: '1px'
                                                }}
                                            >
                                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#1a1b1e] text-[9px] text-white/40 px-1 rounded border border-white/5 whitespace-nowrap">
                                                    EXPIRATION
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </>
                        )}


                        {/* Active Trade Status Bubble (Olymp Style - Near Price Scale) */}
                        {trade.status === 'ACTIVE' && (
                            <div 
                                className="absolute flex items-center gap-2 z-40"
                                style={{ 
                                    top: coord.y,
                                    right: 70,
                                    transform: 'translateY(-50%)'
                                }}
                            >
                                {/* Profit/Loss Status Indicator */}
                                {(() => {
                                    const currentPrice = latestCoords?.price;
                                    if (!currentPrice) return null;
                                    const isCurrentlyWinning = isUp ? currentPrice > trade.entryPrice : currentPrice < trade.entryPrice;
                                    const profitColor = isCurrentlyWinning ? '#0ecb81' : '#f6465d';
                                    
                                    return (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            className="flex items-center gap-1.5 bg-[#1a1b1e] border border-white/10 px-2 py-1 rounded-md shadow-2xl backdrop-blur-md"
                                        >
                                            <div 
                                                className="w-2 h-2 rounded-full animate-pulse" 
                                                style={{ backgroundColor: profitColor, boxShadow: `0 0 8px ${profitColor}` }}
                                            />
                                            <span className="text-[10px] font-black text-white tabular-nums">{timeStr}</span>
                                        </motion.div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Exit Point Marker (if finished) - Olymp Style Result Bubble */}
                        {trade.status !== 'ACTIVE' && exitX !== null && exitX > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="absolute z-40 flex flex-col items-center"
                                style={{ 
                                    left: exitX,
                                    top: coord.y,
                                    transform: 'translate(-50%, -50%)'
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
                            </motion.div>
                        )}
                    </div>
                );
            })}
        </div>
        </motion.div>
    </div>
  );
};
