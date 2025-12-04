import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import SessionQRCode from './SessionQRCode';
import AnnouncementBanner from './AnnouncementBanner';
import NewsBanner from './NewsBanner';
import Screensaver from './Screensaver';

const CheckInKiosk = () => {
  const [searchParams] = useSearchParams();
  const qrToken = searchParams.get('token');
  
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [number, setNumber] = useState('');
  const [activePersonnel, setActivePersonnel] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showSessionSelect, setShowSessionSelect] = useState(true);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [endSessionNumber, setEndSessionNumber] = useState('');
  const [systemSettings, setSystemSettings] = useState(null);
  const [isMobileQRView, setIsMobileQRView] = useState(false);
  const [showScreensaver, setShowScreensaver] = useState(false);
  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    // Load system settings
    loadSystemSettings();
    
    if (qrToken) {
      // Validate QR token and get session
      validateQRToken();
      // Set mobile QR view flag
      setIsMobileQRView(true);
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

  // Screensaver inactivity detection
  useEffect(() => {
    if (!systemSettings?.screensaver_enabled || isMobileQRView) {
      console.log('Screensaver disabled:', { 
        enabled: systemSettings?.screensaver_enabled, 
        isMobileQRView 
      });
      return;
    }

    console.log('Screensaver enabled with timeout:', systemSettings.screensaver_timeout);

    const resetTimer = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      setShowScreensaver(false);
      
      const timeout = (systemSettings?.screensaver_timeout || 300) * 1000;
      console.log('Screensaver timer reset, will activate in', timeout / 1000, 'seconds');
      inactivityTimerRef.current = setTimeout(() => {
        console.log('Activating screensaver');
        setShowScreensaver(true);
      }, timeout);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach(event => document.removeEventListener(event, resetTimer));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [systemSettings, isMobileQRView]);

  const loadSystemSettings = async () => {
    try {
      const response = await api.get('/settings/system');
      setSystemSettings(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der System-Einstellungen:', error);
      // Set defaults if loading fails
      setSystemSettings({
        kiosk_show_attendance_list: true,
        screensaver_enabled: true,
        screensaver_timeout: 300
      });
    }
  };

  const handleScreensaverActivity = () => {
    setShowScreensaver(false);
  };

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
      const response = await api.post('/sessions', { event_type: eventType });
      setSelectedSession(response.data);
      setShowSessionSelect(false);
      loadActiveSessions();
      setMessage({ text: 'Session erfolgreich erstellt!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ text: error.response?.data?.detail || 'Fehler beim Erstellen der Session', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleEndSession = async () => {
    if (!endSessionNumber || !selectedSession) return;

    try {
      await api.post(`/sessions/${selectedSession.id}/end-with-rank`, {
        stammrollennummer: endSessionNumber
      });
      setMessage({ text: 'Session erfolgreich beendet!', type: 'success' });
      setShowEndSessionModal(false);
      setEndSessionNumber('');
      // Reload sessions after a short delay
      setTimeout(() => {
        loadActiveSessions();
        setSelectedSession(null);
        setShowSessionSelect(true);
      }, 2000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Beenden der Session', 
        type: 'error' 
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
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
          {message.text && (
            <div className={`p-4 rounded-xl mt-6 text-center font-semibold ${
              message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message.text}
            </div>
          )}
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

  // Mobile QR View - Only show input field
  if (isMobileQRView && selectedSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-fire-red to-fire-orange">
        {/* Announcement Banner */}
        <AnnouncementBanner />
        
        <div className="p-4">
          <div className="max-w-md mx-auto">
            {/* Header */}
            <div className="bg-white rounded-3xl shadow-2xl p-6 mb-4">
              <h1 className="text-3xl font-bold text-fire-red text-center">Feuerwehr Check-In</h1>
              <p className="text-lg text-gray-600 mt-2 text-center">
                {selectedSession.event_type}
              </p>
              <p className="text-sm text-gray-500 text-center">
                {new Date(selectedSession.started_at).toLocaleDateString('de-DE')}
              </p>
            </div>

            {/* Keypad Section */}
            <div className="bg-white rounded-3xl shadow-2xl p-6">
              <h2 className="text-xl font-bold text-fire-red mb-4 text-center">
                Stammrollennummer eingeben
              </h2>
              
              {/* Display */}
              <div className="bg-gray-100 rounded-xl p-6 mb-4 min-h-[70px] flex items-center justify-center">
                <span className="text-3xl font-mono font-bold text-fire-red">
                  {number || '____'}
                </span>
              </div>

              {/* Message */}
              {message.text && (
                <div className={`p-4 rounded-xl mb-4 text-center font-semibold ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleNumberClick(digit.toString())}
                    className="touch-button bg-fire-red text-white text-2xl font-bold rounded-xl hover:bg-red-800 transition-all shadow-lg h-16"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="touch-button bg-gray-500 text-white text-xl font-bold rounded-xl hover:bg-gray-600 transition-all shadow-lg h-16"
                >
                  ⌫
                </button>
                <button
                  onClick={() => handleNumberClick('0')}
                  className="touch-button bg-fire-red text-white text-2xl font-bold rounded-xl hover:bg-red-800 transition-all shadow-lg h-16"
                >
                  0
                </button>
                <button
                  onClick={handleSubmit}
                  className="touch-button bg-green-600 text-white text-xl font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg h-16"
                >
                  ✓
                </button>
              </div>
            </div>

            {/* Active Personnel Count */}
            <div className="bg-white rounded-2xl shadow-lg p-4 mt-4 text-center">
              <p className="text-gray-600 text-sm">Aktuell anwesend</p>
              <p className="text-3xl font-bold text-fire-red">{activePersonnel.length}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Screensaver */}
      {showScreensaver && <Screensaver onActivity={handleScreensaverActivity} />}
      
      <div className="min-h-screen bg-gradient-to-br from-fire-red to-fire-orange">
        {/* News Banner */}
        <NewsBanner />
        
        {/* Announcement Banner */}
        <AnnouncementBanner />
      
        <div className="p-4">
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
              <div className="flex space-x-3">
                {selectedSession && selectedSession.event_type === 'Einsatz' && (
                  <button
                    onClick={() => setShowEndSessionModal(true)}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all font-bold shadow-lg"
                  >
                    🚨 Einsatz beenden
                  </button>
                )}
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
          </div>

          {/* Layout depends on attendance list setting */}
          {systemSettings?.kiosk_show_attendance_list ? (
            <>
              {/* Top Section: Input Field and Attendance List side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
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

                {/* Active Personnel List */}
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

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 border-t-2 border-white opacity-50"></div>
                <span className="px-4 text-white text-xl font-bold">ODER</span>
                <div className="flex-1 border-t-2 border-white opacity-50"></div>
              </div>

              {/* Bottom Section: QR Code centered */}
              <div className="flex justify-center">
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                  <SessionQRCode 
                    sessionId={selectedSession?.id}
                    large={true}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Layout when attendance list is hidden: Input and QR side by side */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
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

              {/* QR Code Section */}
              <div className="bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center">
                <SessionQRCode 
                  sessionId={selectedSession?.id}
                  large={true}
                />
              </div>
            </div>
          )}

          {/* End Session Modal */}
          {showEndSessionModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-bold text-fire-red mb-6">Einsatz beenden</h3>
                
                <p className="text-gray-700 mb-6">
                  Zum Beenden des Einsatzes ist mindestens der Dienstgrad <strong>Unterbrandmeister (UBM)</strong> erforderlich.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stammrollennummer eingeben
                  </label>
                  <input
                    type="text"
                    value={endSessionNumber}
                    onChange={(e) => setEndSessionNumber(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-2xl text-center font-mono focus:ring-2 focus:ring-fire-red focus:border-transparent"
                    placeholder="____"
                    autoFocus
                  />
                </div>

                {message.text && (
                  <div className={`p-4 rounded-xl mb-6 text-center font-semibold ${
                    message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleEndSession}
                    disabled={!endSessionNumber}
                    className="flex-1 bg-red-600 text-white py-3 rounded-xl hover:bg-red-700 transition-all font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Einsatz beenden
                  </button>
                  <button
                    onClick={() => {
                      setShowEndSessionModal(false);
                      setEndSessionNumber('');
                      setMessage({ text: '', type: '' });
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-400 transition-all font-bold"
                  >
                    Abbrechen
                  </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </>
  );
};export default CheckInKiosk;
