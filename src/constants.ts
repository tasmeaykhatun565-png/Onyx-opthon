import { Activity, BarChart2, CandlestickChart, LineChart } from 'lucide-react';
import React from 'react';

export const DRAWING_TOOLS = [
  'TrendLine', 
  'HorizontalLine', 
  'VerticalLine',
  'Ray',
  'Rectangle',
  'FibonacciLevels',
  'FibonacciFan',
  'ParallelChannel'
];

export const TIME_FRAMES = [
  '5s', '10s', '15s', '20s', '30s', 
  '1m', '2m', '5m', '10m', '15m', 
  '30m', '1h', '4h', '1d', '7d', '1M'
];

export const CHART_TYPES = [
  { id: 'Area', icon: LineChart, label: 'Area chart' },
  { id: 'Candlestick', icon: CandlestickChart, label: 'Japanese candlesticks' },
  { id: 'Heikin Ashi', icon: CandlestickChart, label: 'Heikin Ashi' },
  { id: 'Bar', icon: BarChart2, label: 'Bars' },
];

export const INDICATORS_LIST = [
  { id: 'SMA', name: 'SMA' },
  { id: 'EMA', name: 'EMA' },
  { id: 'WMA', name: 'WMA' },
  { id: 'BollingerBands', name: 'Bollinger Bands' },
  { id: 'ParabolicSAR', name: 'Parabolic SAR' },
  { id: 'Volumes', name: 'Volumes' },
  { id: 'RSI', name: 'RSI' },
  { id: 'MACD', name: 'MACD' },
  { id: 'Stochastic', name: 'Stochastic' },
  { id: 'CCI', name: 'CCI' },
  { id: 'ATR', name: 'ATR' },
  { id: 'WilliamsR', name: 'Williams %R' },
  { id: 'AverageDirectionalIndex', name: 'ADX' },
  { id: 'AwesomeOscillator', name: 'Awesome Oscillator' },
  { id: 'RateOfChange', name: 'Rate Of Change' },
  { id: 'Momentum', name: 'Momentum' },
  { id: 'JapanesePearl', name: 'Japanese Pearl' },
  { id: 'JapaneseTrend', name: 'Japanese Trend' },
  { id: 'Reflection', name: 'Reflection' },
  { id: 'RelativeStrengthLaw', name: 'Relative Strength Law' },
  { id: 'SlidingOnAverages', name: 'Sliding On Averages' },
  { id: 'AverageIntersection', name: 'Average Intersection' },
  { id: 'ChasingTheTrend', name: 'Chasing The Trend' },
  { id: 'SmartRSI15', name: 'Smart RSI 15' },
  { id: 'SmartRSI30', name: 'Smart RSI 30' },
  { id: 'SmartRSI60', name: 'Smart RSI 60' },
];

export const DESKTOP_TOOLS_LIST = [
  { id: 'TrendLine', name: 'Trend Line' },
  { id: 'HorizontalLine', name: 'Horizontal Line' },
  { id: 'VerticalLine', name: 'Vertical Line' },
  { id: 'Fibonacci', name: 'Fibonacci Retriever' },
];
