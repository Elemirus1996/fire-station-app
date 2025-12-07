import React, { useState, useEffect } from 'react';
import api from '../../api';

const NewsBanner = () => {
  const [news, setNews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
      }, 10000); // Change news every 10 seconds
      return () => clearInterval(interval);
    }
  }, [news.length]);

  const loadNews = async () => {
    try {
      const response = await api.get('/news?active_only=true');
      setNews(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fehler beim Laden der News:', error);
      setNews([]);
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 border-red-700';
      case 'high':
        return 'bg-orange-500 border-orange-600';
      case 'normal':
        return 'bg-blue-600 border-blue-700';
      case 'low':
        return 'bg-gray-600 border-gray-700';
      default:
        return 'bg-blue-600 border-blue-700';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'normal':
        return 'ℹ️';
      case 'low':
        return '📌';
      default:
        return 'ℹ️';
    }
  };

  if (news.length === 0) return null;

  const currentNews = news[currentIndex];

  return (
    <div className={`${getPriorityStyles(currentNews.priority)} border-b-4 text-white p-4 shadow-lg`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start space-x-3">
          <div className="text-2xl flex-shrink-0">{getPriorityIcon(currentNews.priority)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-lg font-bold truncate">{currentNews.title}</h3>
              {news.length > 1 && (
                <span className="text-xs opacity-75">
                  {currentIndex + 1} / {news.length}
                </span>
              )}
            </div>
            <p className="text-sm opacity-90 line-clamp-2">{currentNews.content}</p>
          </div>
          {news.length > 1 && (
            <div className="flex space-x-1">
              {news.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-white' : 'bg-white bg-opacity-40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsBanner;
