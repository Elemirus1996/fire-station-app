import React, { useState, useEffect } from 'react';
import api from '../../api';

const AnnouncementBanner = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    loadAnnouncements();
    // Refresh announcements every 5 minutes
    const interval = setInterval(loadAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (announcements.length > 1) {
      // Auto-scroll to next announcement every 10 seconds
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % announcements.length);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [announcements.length]);

  const loadAnnouncements = async () => {
    try {
      const response = await api.get('/announcements/active');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Ankündigungen:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-yellow-500 text-black';
      case 'normal':
      default:
        return 'bg-blue-600 text-white';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return '🚨';
      case 'high':
        return '⚠️';
      case 'normal':
      default:
        return 'ℹ️';
    }
  };

  if (announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className={`${getPriorityColor(currentAnnouncement.priority)} py-3 px-4 shadow-lg`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">
            {getPriorityIcon(currentAnnouncement.priority)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg truncate">
              {currentAnnouncement.title}
            </div>
            <div className="text-sm opacity-90 line-clamp-2">
              {currentAnnouncement.content}
            </div>
          </div>
        </div>
        
        {announcements.length > 1 && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              aria-label="Vorherige Ankündigung"
            >
              ◀
            </button>
            <span className="text-sm opacity-75">
              {currentIndex + 1} / {announcements.length}
            </span>
            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % announcements.length)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
              aria-label="Nächste Ankündigung"
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementBanner;
