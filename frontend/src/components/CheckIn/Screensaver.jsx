import React, { useState, useEffect } from 'react';
import api from '../../api';

const Screensaver = ({ onActivity }) => {
  const [time, setTime] = useState(new Date());
  const [fireStationInfo, setFireStationInfo] = useState(null);
  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() => {
    loadSettings();
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleClick = () => {
    if (onActivity) onActivity();
  };

  return (
    <div
      onClick={handleClick}
      className="fixed inset-0 bg-gradient-to-br from-fire-red via-red-800 to-fire-orange z-50 flex flex-col items-center justify-center cursor-pointer animate-fadeIn"
    >
      {/* Logo */}
      {systemSettings?.screensaver_show_logo && fireStationInfo?.logo_path && (
        <div className="mb-12 animate-pulse">
          <img
            src={`/uploads/${fireStationInfo.logo_path}`}
            alt="Feuerwehr Logo"
            className="h-48 w-auto drop-shadow-2xl"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>
      )}

      {/* Fire Station Name */}
      {fireStationInfo?.name && (
        <h1 className="text-6xl md:text-8xl font-bold text-white text-center mb-8 drop-shadow-2xl animate-fadeIn">
          {fireStationInfo.name}
        </h1>
      )}

      {/* Clock */}
      {systemSettings?.screensaver_show_clock !== false && (
        <div className="text-center animate-fadeIn">
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
