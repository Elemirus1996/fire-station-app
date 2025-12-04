import React, { useState, useEffect } from 'react';
import api from '../../api';

const Screensaver = ({ onActivity }) => {
  const [time, setTime] = useState(new Date());
  const [fireStationInfo, setFireStationInfo] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);
  const [news, setNews] = useState([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  useEffect(() => {
    loadSettings();
    loadNews();
    const timeInterval = setInterval(() => setTime(new Date()), 1000);
    const newsInterval = setInterval(loadNews, 60000); // Refresh news every minute
    
    return () => {
      clearInterval(timeInterval);
      clearInterval(newsInterval);
    };
  }, []);

  // Rotate news every 10 seconds
  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % news.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [news.length]);

  const loadSettings = async () => {
    try {
      const [fsRes, sysRes] = await Promise.all([
        api.get('/settings/firestation'),
        api.get('/settings/system')
      ]);
      setFireStationInfo(fsRes.data);
      setSystemSettings(sysRes.data);
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    }
  };

  const loadNews = async () => {
    try {
      const response = await api.get('/news?active_only=true');
      setNews(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der News:', error);
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-blue-500';
    }
  };

  const handleActivity = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onActivity) {
      onActivity();
    }
  };

  const currentNews = news[currentNewsIndex];

  return (
    <div
      onClick={handleActivity}
      onTouchStart={handleActivity}
      onMouseDown={handleActivity}
      className="fixed inset-0 bg-gradient-to-br from-fire-red via-red-800 to-fire-orange z-[9999] flex flex-col items-center justify-center cursor-pointer"
      style={{ isolation: 'isolate' }}
    >
      {/* News Ticker at Top */}
      {news.length > 0 && currentNews && (
        <div className={`absolute top-0 left-0 right-0 ${getPriorityStyles(currentNews.priority)} text-white py-4 px-6 shadow-lg`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-bold">📢 NEWS:</span>
              <div className="flex-1">
                <div className="font-bold text-xl">{currentNews.title}</div>
                {currentNews.content && (
                  <div className="text-sm mt-1 opacity-90">{currentNews.content}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      {systemSettings?.screensaver_show_logo && fireStationInfo?.logo_path && (
        <div className="mb-12">
          <img
            src={fireStationInfo.logo_path.startsWith('/') ? fireStationInfo.logo_path : `/uploads/logo/${fireStationInfo.logo_path.split('/').pop()}`}
            alt="Feuerwehr Logo"
            className="h-48 w-auto drop-shadow-2xl"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* Fire Station Name */}
      {fireStationInfo?.name && (
        <h1 className="text-6xl md:text-8xl font-bold text-white text-center mb-8 drop-shadow-2xl">
          {fireStationInfo.name}
        </h1>
      )}

      {/* Clock */}
      {systemSettings?.screensaver_show_clock !== false && (
        <div className="text-center">
          <div className="text-9xl md:text-[12rem] font-bold text-white tabular-nums drop-shadow-2xl">
            {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-4xl md:text-5xl text-white opacity-90 mt-4">
            {time.toLocaleDateString('de-DE', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      )}

      {/* Floating Icons Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="text-9xl opacity-10 absolute animate-float-slow" style={{ top: '10%', left: '10%' }}>🚒</div>
        <div className="text-8xl opacity-10 absolute animate-float-medium" style={{ top: '60%', right: '15%' }}>🧯</div>
        <div className="text-7xl opacity-10 absolute animate-float-fast" style={{ bottom: '15%', left: '20%' }}>👨‍🚒</div>
      </div>

      {/* Touch/Click hint */}
      <div className="absolute bottom-12 text-white text-2xl opacity-70 animate-pulse">
        Tippen zum Fortfahren
      </div>
    </div>
  );
};

export default Screensaver;
