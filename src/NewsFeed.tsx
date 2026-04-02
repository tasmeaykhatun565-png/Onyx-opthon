import React, { useState, useEffect, useCallback } from 'react';
import { getAi } from './services/geminiService';
import { Newspaper, Loader2, RefreshCw } from 'lucide-react';
import { Type } from '@google/genai';
import { safeStringify } from './utils';

type NewsItem = {
  title: string;
  summary: string;
  source: string;
};

export default function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async (force = false, retries = 2) => {
    const now = Date.now();
    
    if (!force) {
      // Check for 429 cooldown
      const cooldownUntil = localStorage.getItem('news_fetch_cooldown');
      if (cooldownUntil && now < parseInt(cooldownUntil)) {
        const cachedNews = localStorage.getItem('market_news');
        if (cachedNews) {
          setNews(JSON.parse(cachedNews));
          setLoading(false);
          setRefreshing(false);
          return;
        } else {
          setNews(getFallbackNews());
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }

      // Check cache first - 6 hours
      const cachedNews = localStorage.getItem('market_news');
      const cacheTimestamp = localStorage.getItem('market_news_timestamp');
      
      if (cachedNews && cacheTimestamp && now - parseInt(cacheTimestamp) < 21600000) {
        setNews(JSON.parse(cachedNews));
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Provide 5 recent, relevant market news headlines and summaries for a trading platform. Return as JSON array of objects with title, summary, and source.',
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                source: { type: Type.STRING },
              },
              required: ['title', 'summary', 'source'],
            },
          },
        },
      });
      
      if (response.text) {
        const parsedNews = JSON.parse(response.text);
        setNews(parsedNews);
        localStorage.setItem('market_news', safeStringify(parsedNews));
        localStorage.setItem('market_news_timestamp', now.toString());
        localStorage.removeItem('news_fetch_cooldown');
      }
    } catch (error: any) {
      console.error('Error fetching news:', error);
      
      const errorStr = error instanceof Error ? error.message : String(error);
      const isQuotaError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota');
      
      if (isQuotaError) {
        localStorage.setItem('news_fetch_cooldown', (now + 3600000).toString());
        retries = 0;
      }

      if (retries > 0) {
        setTimeout(() => fetchNews(force, retries - 1), 3000);
      } else {
        const lastCached = localStorage.getItem('market_news');
        if (lastCached) {
          setNews(JSON.parse(lastCached));
        } else {
          setNews(getFallbackNews());
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const getFallbackNews = () => [
    {
      title: "Market Volatility Continues",
      summary: "Global markets show mixed results as investors await upcoming economic data and central bank decisions.",
      source: "Market Watch"
    },
    {
      title: "Tech Sector Growth",
      summary: "Leading technology firms report strong quarterly earnings, driving positive sentiment in the NASDAQ.",
      source: "Financial Times"
    },
    {
      title: "Commodity Price Shift",
      summary: "Oil and gold prices stabilize after a week of fluctuations influenced by geopolitical tensions.",
      source: "Reuters"
    }
  ];

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNews(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <p className="text-[var(--text-secondary)] font-medium">Fetching latest market insights...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
          <Newspaper className="text-blue-500" size={28} /> Market News
        </h3>
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition disabled:opacity-50"
        >
          <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid gap-4">
        {news.map((item, index) => (
          <div 
            key={index} 
            className="p-5 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] hover:border-blue-500/30 transition shadow-sm"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">
                {item.source}
              </span>
            </div>
            <h4 className="text-lg font-bold text-[var(--text-primary)] mb-2 leading-tight">{item.title}</h4>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.summary}</p>
          </div>
        ))}
      </div>
      
      <p className="text-center text-[10px] text-[var(--text-secondary)] mt-4 uppercase tracking-widest font-bold opacity-50">
        Powered by Gemini AI • Real-time Market Data
      </p>
    </div>
  );
}
