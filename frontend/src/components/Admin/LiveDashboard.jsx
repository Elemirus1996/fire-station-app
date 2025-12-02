import React, { useState, useEffect } from 'react';
import api from '../../api';

const LiveDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 5 seconds
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sessionsRes, personnelRes] = await Promise.all([
        api.get('/sessions?active_only=true'),
        api.get('/personnel')
      ]);

      const activeSessions = sessionsRes.data;
      let totalActive = 0;
      let totalToday = 0;

      activeSessions.forEach(session => {
        totalActive += session.active_attendees || 0;
        totalToday += session.total_attendees || 0;
      });

      setDashboardData({
        activeSessions: activeSessions.length,
        activePersonnel: totalActive,
        totalPersonnel: personnelRes.data.filter(p => p.is_active).length,
        totalToday,
        sessions: activeSessions
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden des Dashboards:', error);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading || !dashboardData) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-fire-red to-red-800 text-white rounded-xl p-6 shadow-lg">
          <div className="text-sm opacity-90">Aktive Sessions</div>
          <div className="text-4xl font-bold mt-2">{dashboardData.activeSessions}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-xl p-6 shadow-lg">
          <div className="text-sm opacity-90">Aktuell Anwesend</div>
          <div className="text-4xl font-bold mt-2">{dashboardData.activePersonnel}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-xl p-6 shadow-lg">
          <div className="text-sm opacity-90">Gesamt Personal</div>
          <div className="text-4xl font-bold mt-2">{dashboardData.totalPersonnel}</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-xl p-6 shadow-lg">
          <div className="text-sm opacity-90">Check-ins Heute</div>
          <div className="text-4xl font-bold mt-2">{dashboardData.totalToday}</div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-fire-red mb-4">Aktive Sessions</h2>
        {dashboardData.sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine aktiven Sessions</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData.sessions.map((session) => (
              <div
                key={session.id}
                className="border-2 border-green-500 bg-green-50 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-fire-red">{session.event_type}</h3>
                    <div className="text-sm text-gray-600">
                      Session #{session.id}
                    </div>
                  </div>
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    LIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500">Anwesend</div>
                    <div className="text-2xl font-bold text-green-600">{session.active_attendees}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-500">Gesamt</div>
                    <div className="text-2xl font-bold text-blue-600">{session.total_attendees}</div>
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  <div>⏱️ Gestartet: {new Date(session.started_at).toLocaleTimeString('de-DE')}</div>
                  {session.duration_seconds && (
                    <div>⏳ Dauer: {formatDuration(session.duration_seconds)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-refresh indicator */}
      <div className="text-center text-sm text-gray-500">
        <span className="inline-flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          Live-Aktualisierung alle 5 Sekunden
        </span>
      </div>
    </div>
  );
};

export default LiveDashboard;
