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
      setNews(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fehler beim Laden der News:', error);
      setNews([]);
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
      className="fixed inset-0 bg-gradient-to-br from-fire-red via-red-800 to-fire-orange z-[9999] flex flex-col cursor-pointer overflow-hidden"
      style={{ isolation: 'isolate' }}
    >
      {/* News Ticker at Top - Prominent Display */}
      {news.length > 0 && currentNews && (
        <div className={`${getPriorityStyles(currentNews.priority)} text-white py-6 px-8 shadow-2xl flex-shrink-0`}>
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center space-x-6">
              <span className="text-3xl font-bold">📢 WICHTIGE MITTEILUNG</span>
              <div className="flex-1">
                <div className="font-bold text-4xl mb-2">{currentNews.title}</div>
                {currentNews.content && (
                  <div className="text-2xl opacity-95">{currentNews.content}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Logo */}
        {systemSettings?.screensaver_show_logo && fireStationInfo?.logo_path && (
          <div className="mb-8 animate-fadeIn">
            <img
              src={`/api/settings/firestation/logo?t=${Date.now()}`}
              alt="Feuerwehr Logo"
              className="h-48 w-auto drop-shadow-2xl max-w-md object-contain"
              onError={(e) => { 
                console.error('Logo konnte nicht geladen werden:', fireStationInfo.logo_path);
                e.target.style.display = 'none'; 
              }}
              onLoad={() => console.log('Logo erfolgreich geladen')}
            />
          </div>
        )}

        {/* Fire Station Name */}
        {fireStationInfo?.name && (
          <h1 className="text-5xl md:text-7xl font-bold text-white text-center mb-6 drop-shadow-2xl">
            {fireStationInfo.name}
          </h1>
        )}

        {/* Clock */}
        {systemSettings?.screensaver_show_clock !== false && (
          <div className="text-center">
            <div className="text-8xl md:text-9xl font-bold text-white tabular-nums drop-shadow-2xl">
              {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-3xl md:text-4xl text-white opacity-90 mt-4">
              {time.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
        )}
      </div>

      {/* Floating Icons Animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="text-9xl opacity-10 absolute animate-float-slow" style={{ top: '10%', left: '10%' }}>🚒</div>
        <div className="text-8xl opacity-10 absolute animate-float-medium" style={{ top: '60%', right: '15%' }}>🧯</div>
        <div className="text-7xl opacity-10 absolute animate-float-fast" style={{ bottom: '15%', left: '20%' }}>👨‍🚒</div>
      </div>

      {/* Touch/Click hint */}
      <div className="pb-8 text-white text-2xl opacity-70 animate-pulse text-center flex-shrink-0">
        Tippen zum Fortfahren
      </div>
    </div>
  );
};

export default Screensaver;
