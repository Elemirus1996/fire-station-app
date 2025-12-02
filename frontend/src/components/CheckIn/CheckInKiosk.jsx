import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';

const CheckInKiosk = () => {
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('token');
  
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [number, setNumber] = useState('');
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showSessionSelect, setShowSessionSelect] = useState(true);

  useEffect(() => {
    if (qrToken) {
      // Validate QR token and get session
      validateQRToken();
    } else {
      loadActiveSessions();
    }
  }, [qrToken]);

  useEffect(() => {
    if (selectedSession) {
      loadActivePersonnel();
      const interval = setInterval(loadActivePersonnel, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedSession]);

  const validateQRToken = async () => {
    try {
      const response = await api.post('/checkin/validate-token', { token: qrToken });
      if (response.data.valid) {
        const sessionResponse = await api.get(`/sessions/${response.data.session_id}`);
        setSelectedSession(sessionResponse.data);
        setShowSessionSelect(false);
      }
    } catch (error) {
      setMessage({ text: 'Ungültiger QR-Code', type: 'error' });
    }
  };

  const loadActiveSessions = async () => {
    try {
      const response = await api.get('/sessions/active/current');
      setSessions(response.data);
      if (response.data.length === 1) {
        setSelectedSession(response.data[0]);
        setShowSessionSelect(false);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Sessions:', error);
    }
  };

  const loadActivePersonnel = async () => {
    if (!selectedSession) return;
    try {
      const response = await api.get(`/attendance/session/${selectedSession.id}/active`);
      setActivePersonnel(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Anwesenheit:', error);
    }
  };

  const handleNumberClick = (digit) => {
    if (number.length < 10) {
      setNumber(number + digit);
    }
  };

  const handleClear = () => {
    setNumber('');
    setMessage({ text: '', type: '' });
  };

  const handleSubmit = async () => {
    if (!number || !selectedSession) return;

    try {
      // Check if already checked in
      const isCheckedIn = activePersonnel.some(p => p.stammrollennummer === number);

      if (isCheckedIn) {
        // Check out
        await api.post('/attendance/checkout', {
          session_id: selectedSession.id,
          stammrollennummer: number
        });
        setMessage({ text: 'Erfolgreich ausgecheckt!', type: 'success' });
      } else {
        // Check in
        const response = await api.post('/attendance/checkin', {
          session_id: selectedSession.id,
          stammrollennummer: number
        });
        setMessage({ 
          text: `Willkommen ${response.data.personnel.vorname} ${response.data.personnel.nachname}!`, 
          type: 'success' 
        });
      }

      setNumber('');
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      loadActivePersonnel();
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Check-in/out', 
        type: 'error' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const createNewSession = async (eventType) => {
    try {
      const response = await api.post('/sessions', { event_type: eventType }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      setSelectedSession(response.data);
      setShowSessionSelect(false);
      loadActiveSessions();
    } catch (error) {
      // If not authenticated, just show error
      setMessage({ text: 'Keine Berechtigung neue Session zu erstellen', type: 'error' });
    }
  };

  if (showSessionSelect && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fire-red to-fire-orange flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-fire-red text-center mb-8">
            Neue Session starten
          </h1>
          <div className="grid grid-cols-2 gap-6">
            <button
              onClick={() => createNewSession('Einsatz')}
              className="touch-button bg-fire-red text-white p-8 rounded-2xl text-2xl font-bold hover:bg-red-800 transition-all"
            >
              🚨 Einsatz
            </button>
            <button
              onClick={() => createNewSession('Übungsdienst')}
              className="touch-button bg-blue-600 text-white p-8 rounded-2xl text-2xl font-bold hover:bg-blue-700 transition-all"
            >
              📚 Übungsdienst
            </button>
            <button
              onClick={() => createNewSession('Arbeitsdienst-A')}
              className="touch-button bg-green-600 text-white p-8 rounded-2xl text-2xl font-bold hover:bg-green-700 transition-all"
            >
              🔧 Arbeitsdienst A
            </button>
            <button
              onClick={() => createNewSession('Arbeitsdienst-B')}
              className="touch-button bg-green-600 text-white p-8 rounded-2xl text-2xl font-bold hover:bg-green-700 transition-all"
            >
              🔧 Arbeitsdienst B
            </button>
            <button
              onClick={() => createNewSession('Arbeitsdienst-C')}
              className="touch-button bg-green-600 text-white p-8 rounded-2xl text-2xl font-bold hover:bg-green-700 transition-all"
            >
              🔧 Arbeitsdienst C
            </button>
          </div>
          <p className="text-center mt-8 text-gray-600">
            Admin-Login erforderlich für Session-Erstellung
          </p>
        </div>
      </div>
    );
  }

  if (showSessionSelect && sessions.length > 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fire-red to-fire-orange flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-4xl w-full">
          <h1 className="text-4xl font-bold text-fire-red text-center mb-8">
            Session auswählen
          </h1>
          <div className="space-y-4">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => {
                  setSelectedSession(session);
                  setShowSessionSelect(false);
                }}
                className="w-full touch-button bg-gray-100 hover:bg-gray-200 p-6 rounded-xl text-left transition-all"
              >
                <div className="text-2xl font-bold text-fire-red">{session.event_type}</div>
                <div className="text-gray-600">
                  Begonnen: {new Date(session.started_at).toLocaleString('de-DE')}
                </div>
                <div className="text-gray-600">
                  Aktiv anwesend: {session.active_personnel?.length || 0}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-fire-red to-fire-orange p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-fire-red">Feuerwehr Check-In</h1>
              {selectedSession && (
                <p className="text-xl text-gray-600 mt-2">
                  {selectedSession.event_type} - {new Date(selectedSession.started_at).toLocaleDateString('de-DE')}
                </p>
              )}
            </div>
            {sessions.length > 1 && (
              <button
                onClick={() => setShowSessionSelect(true)}
                className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-all"
              >
                Session wechseln
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Keypad Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-fire-red mb-6">Stammrollennummer eingeben</h2>
            
            {/* Display */}
            <div className="bg-gray-100 rounded-xl p-6 mb-6 min-h-[80px] flex items-center justify-center">
              <span className="text-4xl font-mono font-bold text-fire-red">
                {number || '____'}
              </span>
            </div>

            {/* Message */}
            {message.text && (
              <div className={`p-4 rounded-xl mb-6 text-center text-lg font-semibold ${
                message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleNumberClick(digit.toString())}
                  className="touch-button bg-fire-red text-white text-3xl font-bold rounded-2xl hover:bg-red-800 transition-all shadow-lg"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="touch-button bg-gray-500 text-white text-2xl font-bold rounded-2xl hover:bg-gray-600 transition-all shadow-lg"
              >
                ⌫
              </button>
              <button
                onClick={() => handleNumberClick('0')}
                className="touch-button bg-fire-red text-white text-3xl font-bold rounded-2xl hover:bg-red-800 transition-all shadow-lg"
              >
                0
              </button>
              <button
                onClick={handleSubmit}
                className="touch-button bg-green-600 text-white text-2xl font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg"
              >
                ✓
              </button>
            </div>
          </div>

          {/* Active Personnel Section */}
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-fire-red mb-6">
              Aktuell anwesend ({activePersonnel.length})
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {activePersonnel.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Noch niemand eingecheckt</p>
              ) : (
                activePersonnel.map((person) => (
                  <div
                    key={person.attendance_id}
                    className="bg-gray-50 rounded-xl p-4 flex justify-between items-center hover:bg-gray-100 transition-all"
                  >
                    <div>
                      <div className="font-bold text-lg text-fire-red">
                        {person.vorname} {person.nachname}
                      </div>
                      <div className="text-sm text-gray-600">
                        {person.dienstgrad_name} • Nr. {person.stammrollennummer}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(person.checked_in_at).toLocaleTimeString('de-DE', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInKiosk;
