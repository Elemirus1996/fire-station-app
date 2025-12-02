import React, { useState, useEffect } from 'react';
import api from '../../api';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    kiosk_base_url: 'http://localhost:5173',
    kiosk_show_attendance_list: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/system');
      setSettings(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      setMessage({ 
        text: 'Fehler beim Laden der Einstellungen', 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const detectNetworkUrl = () => {
    const detectedUrl = `${window.location.protocol}//${window.location.host}`;
    
    setSettings({
      ...settings,
      kiosk_base_url: detectedUrl
    });
    
    // Warnung bei localhost
    if (detectedUrl.includes('localhost') || detectedUrl.includes('127.0.0.1')) {
      setMessage({
        text: '⚠️ Du greifst aktuell über localhost zu. Öffne die App über deine Netzwerk-IP (z.B. http://192.168.1.100:5173) damit die Auto-Erkennung funktioniert.',
        type: 'warning'
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 8000);
    } else {
      setMessage({
        text: '✓ Netzwerk-URL erkannt und eingetragen',
        type: 'success'
      });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    // Validation
    if (settings.kiosk_base_url && 
        !settings.kiosk_base_url.startsWith('http://') && 
        !settings.kiosk_base_url.startsWith('https://')) {
      setMessage({ 
        text: 'Base-URL muss mit http:// oder https:// beginnen', 
        type: 'error' 
      });
      setSaving(false);
      return;
    }

    try {
      await api.put('/settings/system', settings);
      setMessage({ text: 'Einstellungen erfolgreich gespeichert', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Speichern', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-fire-red mb-6">System-Einstellungen</h2>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 
            message.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Kiosk Base-URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kiosk Base-URL für QR-Codes
            </label>
            <input 
              type="text"
              value={settings.kiosk_base_url}
              onChange={(e) => setSettings({...settings, kiosk_base_url: e.target.value})}
              placeholder="http://192.168.1.100:5173"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
            />
            <div className="mt-3 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
              <p className="font-semibold mb-2">💡 Wichtig:</p>
              <p className="mb-2">
                Verwende deine Netzwerk-IP, damit Smartphones den QR-Code nutzen können.
              </p>
              <p className="font-semibold mt-3 mb-1">Beispiele zum Finden deiner IP:</p>
              <ul className="list-disc ml-5 space-y-1">
                <li><strong>Windows:</strong> <code className="bg-gray-200 px-1 rounded">ipconfig</code> → IPv4-Adresse</li>
                <li><strong>Linux:</strong> <code className="bg-gray-200 px-1 rounded">ip addr</code> oder <code className="bg-gray-200 px-1 rounded">hostname -I</code></li>
                <li><strong>macOS:</strong> <code className="bg-gray-200 px-1 rounded">ifconfig</code> → inet-Adresse</li>
              </ul>
            </div>
            <button 
              type="button"
              onClick={detectNetworkUrl}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
            >
              🔍 Aktuelle Netzwerk-URL erkennen
            </button>
          </div>

          {/* Anwesenheitsliste Toggle */}
          <div className="border-t pt-6">
            <div className="flex items-start space-x-3">
              <input 
                type="checkbox"
                id="show-attendance"
                checked={settings.kiosk_show_attendance_list}
                onChange={(e) => setSettings({...settings, kiosk_show_attendance_list: e.target.checked})}
                className="w-5 h-5 mt-0.5 text-fire-red rounded focus:ring-fire-red"
              />
              <label htmlFor="show-attendance" className="flex-1">
                <span className="text-sm font-medium text-gray-700 block mb-1">
                  Anwesenheitsliste im Kiosk anzeigen
                </span>
                <p className="text-sm text-gray-600">
                  Wenn deaktiviert, wird der QR-Code größer angezeigt und nimmt den Platz der Liste ein.
                  Dies verbessert die Scan-Erfahrung, besonders wenn viele Personen den QR-Code nutzen.
                </p>
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-fire-red text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {saving ? 'Speichern...' : '💾 Einstellungen speichern'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-fire-red to-fire-orange text-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold mb-3">ℹ️ Hinweise zur Verwendung</h3>
        <ul className="space-y-2 text-sm">
          <li>✓ QR-Codes werden automatisch mit der konfigurierten Base-URL generiert</li>
          <li>✓ Änderungen wirken sich auf alle neu generierten QR-Codes aus</li>
          <li>✓ Bestehende QR-Codes bleiben 24 Stunden gültig</li>
          <li>✓ Die Kiosk-Ansicht aktualisiert sich automatisch bei Änderungen</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemSettings;
