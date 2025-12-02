import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';

const SessionManagement = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionType, setNewSessionType] = useState('Einsatz');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions?limit=50');
      setSessions(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Sessions:', error);
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

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-fire-red">Session-Verwaltung</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-fire-red text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-all"
        >
          + Neue Session
        </button>
      </div>

      {/* Active Sessions */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Aktive Sessions</h3>
        <div className="space-y-3">
          {sessions.filter(s => s.is_active).map((session) => (
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
          {sessions.filter(s => s.is_active).length === 0 && (
            <p className="text-gray-500 text-center py-4">Keine aktiven Sessions</p>
          )}
        </div>
      </div>

      {/* Past Sessions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Abgeschlossene Sessions</h3>
        <div className="space-y-3">
          {sessions.filter(s => !s.is_active).map((session) => (
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
                </div>
              </div>
            </div>
          ))}
          {sessions.filter(s => !s.is_active).length === 0 && (
            <p className="text-gray-500 text-center py-4">Keine abgeschlossenen Sessions</p>
          )}
        </div>
      </div>

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
