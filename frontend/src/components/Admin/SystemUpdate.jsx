import React, { useState, useEffect } from 'react';
import api from '../../api';

const SystemUpdate = () => {
  const [versionInfo, setVersionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [updateOutput, setUpdateOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    loadVersionInfo();
    // Check for updates every 5 minutes
    const interval = setInterval(loadVersionInfo, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadVersionInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/system/version');
      setVersionInfo(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Versionsinformationen:', error);
      setMessage({ 
        text: 'Fehler beim Laden der Versionsinformationen', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!window.confirm('Möchten Sie das System wirklich aktualisieren? Dies kann einige Minuten dauern.')) {
      return;
    }

    setUpdating(true);
    setMessage({ text: '', type: '' });
    setUpdateOutput('');
    setShowOutput(true);

    try {
      const response = await api.post('/system/update');
      
      setUpdateOutput(response.data.output || '');
      
      if (response.data.success) {
        setMessage({ 
          text: `✓ ${response.data.message}`, 
          type: 'success' 
        });
        
        // Reload version info after update
        setTimeout(() => {
          loadVersionInfo();
          // Reload page after 5 seconds to get new frontend
          setTimeout(() => {
            window.location.reload();
          }, 5000);
        }, 2000);
      } else {
        setMessage({ 
          text: `✗ ${response.data.message}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Update', 
        type: 'error' 
      });
      setUpdateOutput(error.response?.data?.output || error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRestart = async () => {
    if (!window.confirm('Möchten Sie das System wirklich neu starten?')) {
      return;
    }

    try {
      await api.post('/system/restart');
      setMessage({ 
        text: 'System wird neu gestartet... Bitte warten Sie ca. 30 Sekunden.', 
        type: 'success' 
      });
      
      // Reload page after 30 seconds
      setTimeout(() => {
        window.location.reload();
      }, 30000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Neustart', 
        type: 'error' 
      });
    }
  };

  const handleReboot = async () => {
    if (!window.confirm('Möchten Sie den Raspberry Pi wirklich neu starten? Dies dauert ca. 1-2 Minuten.')) {
      return;
    }

    try {
      await api.post('/system/reboot');
      setMessage({ 
        text: 'Raspberry Pi wird neu gestartet... Bitte warten Sie ca. 2 Minuten.', 
        type: 'success' 
      });
      
      // Try to reload after 2 minutes
      setTimeout(() => {
        window.location.reload();
      }, 120000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Neustart des Systems', 
        type: 'error' 
      });
    }
  };

  if (loading && !versionInfo) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-fire-red mb-6">System-Update</h2>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Current Version */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Aktuelle Version</p>
              <p className="text-xl font-bold text-fire-red">
                {versionInfo?.current_version || 'Unbekannt'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Commit: {versionInfo?.current_commit || 'unknown'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-1">Update Status</p>
              {versionInfo?.updates_available ? (
                <div className="flex items-center">
                  <span className="text-xl font-bold text-orange-600">
                    ⚠️ Update verfügbar
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({versionInfo.remote_commit})
                  </span>
                </div>
              ) : (
                <p className="text-xl font-bold text-green-600">
                  ✓ Auf dem neuesten Stand
                </p>
              )}
              {versionInfo?.last_check && (
                <p className="text-sm text-gray-500 mt-1">
                  Letzte Prüfung: {new Date(versionInfo.last_check).toLocaleString('de-DE')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Update Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleUpdate}
            disabled={updating || !versionInfo?.updates_available}
            className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${
              updating || !versionInfo?.updates_available
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-fire-red text-white hover:bg-red-800'
            }`}
          >
            {updating ? (
              <>
                <span className="inline-block animate-spin mr-2">⚙️</span>
                Update läuft...
              </>
            ) : (
              '🔄 System aktualisieren'
            )}
          </button>

          <button
            onClick={loadVersionInfo}
            disabled={updating}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-bold disabled:bg-gray-300"
          >
            🔍 Nach Updates suchen
          </button>

          <button
            onClick={handleReboot}
            disabled={updating}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all font-bold disabled:bg-gray-300"
          >
            🔁 System Neustart
          </button>
        </div>

        {/* Update Output */}
        {showOutput && updateOutput && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-gray-700">Update-Log:</h3>
              <button
                onClick={() => setShowOutput(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Schließen
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
              {updateOutput}
            </pre>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">ℹ️ Hinweise zum Update:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Updates werden von GitHub heruntergeladen (git pull)</li>
            <li>Backend und Frontend werden automatisch neu gebaut</li>
            <li>Die Anwendung wird automatisch neu gestartet</li>
            <li>Der Update-Vorgang dauert ca. 2-5 Minuten</li>
            <li>Während des Updates ist die Anwendung nicht verfügbar</li>
            <li>Die Seite wird nach dem Update automatisch neu geladen</li>
          </ul>
        </div>

        {/* Auto-Update Info */}
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-sm text-gray-700">
          <p className="font-semibold mb-2">⚙️ Automatische Updates</p>
          <p>
            Automatische Updates können in den{' '}
            <button
              onClick={() => window.location.hash = '#/admin/system'}
              className="text-fire-red hover:underline font-semibold"
            >
              System-Einstellungen
            </button>
            {' '}aktiviert werden.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemUpdate;
