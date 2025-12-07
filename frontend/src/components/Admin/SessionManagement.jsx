import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionType, setNewSessionType] = useState('Einsatz');
  
  // Filter states
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStatistics, setShowStatistics] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions?limit=50');
      setSessions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fehler beim Laden der Sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    try {
      await api.post('/sessions', { event_type: newSessionType });
      setShowCreateModal(false);
      loadSessions();
    } catch (error) {
      alert('Fehler beim Erstellen der Session: ' + (error.response?.data?.detail || error.message));
    }
  };

  const endSession = async (sessionId) => {
    if (!window.confirm('Session wirklich beenden?')) return;

    try {
      await api.post(`/sessions/${sessionId}/end`);
      loadSessions();
    } catch (error) {
      alert('Fehler beim Beenden der Session: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm('Session wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      await api.delete(`/sessions/${sessionId}`);
      loadSessions();
    } catch (error) {
      alert('Fehler beim Löschen der Session: ' + (error.response?.data?.detail || error.message));
    }
  };

  const downloadPDF = async (sessionId) => {
    try {
      const response = await api.get(`/sessions/${sessionId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `session_${sessionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Fehler beim Herunterladen des PDFs');
    }
  };

  // Filter sessions based on type and date range
  const getFilteredSessions = () => {
    let filtered = sessions;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(s => s.event_type === filterType);
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(s => new Date(s.started_at) >= new Date(startDate));
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.started_at) <= endDateTime);
    }

    return filtered;
  };

  // Calculate statistics
  const getStatistics = () => {
    const filtered = getFilteredSessions();
    
    const stats = {
      total: filtered.length,
      active: filtered.filter(s => s.is_active).length,
      completed: filtered.filter(s => !s.is_active).length,
      byType: {},
      totalAttendees: 0,
      avgAttendeesPerSession: 0
    };

    // Group by event type
    filtered.forEach(session => {
      if (!stats.byType[session.event_type]) {
        stats.byType[session.event_type] = {
          count: 0,
          attendees: 0
        };
      }
      stats.byType[session.event_type].count++;
      stats.byType[session.event_type].attendees += session.total_attendees || 0;
      stats.totalAttendees += session.total_attendees || 0;
    });

    stats.avgAttendeesPerSession = stats.total > 0 
      ? Math.round(stats.totalAttendees / stats.total) 
      : 0;

    return stats;
  };

  const exportReport = async () => {
    const filtered = getFilteredSessions();
    const stats = getStatistics();
    
    // Create CSV content
    let csv = 'Session ID,Typ,Begonnen,Beendet,Status,Teilnehmer\n';
    filtered.forEach(session => {
      csv += `${session.id},${session.event_type},${new Date(session.started_at).toLocaleString('de-DE')},`;
      csv += `${session.ended_at ? new Date(session.ended_at).toLocaleString('de-DE') : '-'},`;
      csv += `${session.is_active ? 'Aktiv' : 'Beendet'},${session.total_attendees || 0}\n`;
    });

    // Add statistics
    csv += '\n\nStatistik\n';
    csv += `Gesamt Sessions,${stats.total}\n`;
    csv += `Aktive Sessions,${stats.active}\n`;
    csv += `Beendete Sessions,${stats.completed}\n`;
    csv += `Gesamt Teilnehmer,${stats.totalAttendees}\n`;
    csv += `Durchschn. Teilnehmer,${stats.avgAttendeesPerSession}\n`;
    csv += '\nNach Typ\n';
    Object.entries(stats.byType).forEach(([type, data]) => {
      csv += `${type},${data.count} Sessions,${data.attendees} Teilnehmer\n`;
    });

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sessions_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  const filteredSessions = getFilteredSessions();
  const statistics = getStatistics();

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-fire-red">Session-Verwaltung</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowStatistics(!showStatistics)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            📊 {showStatistics ? 'Liste' : 'Statistiken'}
          </button>
          <button
            onClick={exportReport}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-all"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-fire-red text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-all"
          >
            + Neue Session
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Event Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session-Typ
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
            >
              <option value="all">Alle Typen</option>
              <option value="Einsatz">Einsatz</option>
              <option value="Übungsdienst">Übungsdienst</option>
              <option value="Arbeitsdienst-A">Arbeitsdienst A</option>
              <option value="Arbeitsdienst-B">Arbeitsdienst B</option>
              <option value="Arbeitsdienst-C">Arbeitsdienst C</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Von Datum
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bis Datum
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
            />
          </div>
        </div>

        {/* Reset Filters */}
        {(filterType !== 'all' || startDate || endDate) && (
          <button
            onClick={() => {
              setFilterType('all');
              setStartDate('');
              setEndDate('');
            }}
            className="mt-3 text-sm text-fire-red hover:underline"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Statistics View */}
      {showStatistics ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 font-medium">Gesamt Sessions</div>
              <div className="text-3xl font-bold text-blue-700 mt-1">{statistics.total}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 font-medium">Aktive Sessions</div>
              <div className="text-3xl font-bold text-green-700 mt-1">{statistics.active}</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 font-medium">Beendete Sessions</div>
              <div className="text-3xl font-bold text-gray-700 mt-1">{statistics.completed}</div>
            </div>
            <div className="bg-fire-red bg-opacity-10 border border-fire-red rounded-lg p-4">
              <div className="text-sm text-fire-red font-medium">Gesamt Teilnehmer</div>
              <div className="text-3xl font-bold text-fire-red mt-1">{statistics.totalAttendees}</div>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">Sessions nach Typ</h3>
            <div className="space-y-4">
              {Object.entries(statistics.byType).map(([type, data]) => (
                <div key={type} className="flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="font-semibold text-lg">{type}</div>
                    <div className="text-sm text-gray-600">
                      Durchschnitt: {data.count > 0 ? Math.round(data.attendees / data.count) : 0} Teilnehmer
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-fire-red">{data.count}</div>
                    <div className="text-sm text-gray-600">{data.attendees} Teilnehmer</div>
                  </div>
                </div>
              ))}
              {Object.keys(statistics.byType).length === 0 && (
                <p className="text-gray-500 text-center py-4">Keine Daten verfügbar</p>
              )}
            </div>
          </div>

          {/* Average Attendees */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-2">Durchschnittliche Teilnehmerzahl</h3>
            <div className="text-4xl font-bold text-fire-red">{statistics.avgAttendeesPerSession}</div>
            <div className="text-sm text-gray-600 mt-1">Teilnehmer pro Session</div>
          </div>
        </div>
      ) : (
        <>
          {/* Sessions List View */}
          {/* Active Sessions */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Aktive Sessions</h3>
        <div className="space-y-3">
          {filteredSessions.filter(s => s.is_active).map((session) => (
            <div
              key={session.id}
              className="border border-green-500 bg-green-50 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-fire-red">
                      {session.event_type}
                    </span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      AKTIV
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Begonnen: {new Date(session.started_at).toLocaleString('de-DE')}
                  </div>
                  {session.duration_seconds && (
                    <div className="text-sm text-gray-600">
                      Dauer: {Math.floor(session.duration_seconds / 3600)}h {Math.floor((session.duration_seconds % 3600) / 60)}m
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Teilnehmer: {session.active_attendees} aktiv / {session.total_attendees} gesamt
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/admin/sessions/${session.id}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all text-sm"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => endSession(session.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all text-sm"
                  >
                    Beenden
                  </button>
                  <button
                    onClick={() => downloadPDF(session.id)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all text-sm"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredSessions.filter(s => s.is_active).length === 0 && (
            <p className="text-gray-500 text-center py-4">Keine aktiven Sessions</p>
          )}
        </div>
      </div>

      {/* Past Sessions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Abgeschlossene Sessions</h3>
        <div className="space-y-3">
          {filteredSessions.filter(s => !s.is_active).map((session) => (
            <div
              key={session.id}
              className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-gray-700">
                      {session.event_type}
                    </span>
                    <span className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-semibold">
                      BEENDET
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {new Date(session.started_at).toLocaleString('de-DE')} - {' '}
                    {session.ended_at ? new Date(session.ended_at).toLocaleString('de-DE') : ''}
                  </div>
                  {session.duration_seconds && (
                    <div className="text-sm text-gray-600">
                      Dauer: {Math.floor(session.duration_seconds / 3600)}h {Math.floor((session.duration_seconds % 3600) / 60)}m
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Teilnehmer: {session.total_attendees}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/admin/sessions/${session.id}`}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all text-sm"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => downloadPDF(session.id)}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all text-sm"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={() => deleteSession(session.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all text-sm"
                  >
                    🗑️ Löschen
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredSessions.filter(s => !s.is_active).length === 0 && (
            <p className="text-gray-500 text-center py-4">Keine abgeschlossenen Sessions</p>
          )}
        </div>
      </div>
      </>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-fire-red mb-6">Neue Session erstellen</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event-Typ
              </label>
              <select
                value={newSessionType}
                onChange={(e) => setNewSessionType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
              >
                <option value="Einsatz">Einsatz</option>
                <option value="Übungsdienst">Übungsdienst</option>
                <option value="Arbeitsdienst-A">Arbeitsdienst A</option>
                <option value="Arbeitsdienst-B">Arbeitsdienst B</option>
                <option value="Arbeitsdienst-C">Arbeitsdienst C</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={createSession}
                className="flex-1 bg-fire-red text-white py-2 rounded-lg hover:bg-red-800 transition-all"
              >
                Erstellen
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManagement;
