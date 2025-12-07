import React, { useState, useEffect } from 'react';
import api from '../../api';

const BackupSettings = () => {
  const [settings, setSettings] = useState({
    backup_enabled: false,
    backup_path: './backups',
    backup_schedule_time: '02:00',
    backup_retention_days: 30
  });
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [validatingPath, setValidatingPath] = useState(false);
  const [pathValid, setPathValid] = useState(null);

  useEffect(() => {
    loadSettings();
    loadBackups();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/backup');
      setSettings(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await api.get('/backup/list');
      setBackups(response.data.backups || []);
    } catch (error) {
      console.error('Fehler beim Laden der Backups:', error);
    }
  };

  const validatePath = async () => {
    setValidatingPath(true);
    setPathValid(null);

    try {
      const response = await api.post('/settings/backup/validate-path', {
        path: settings.backup_path
      });
      
      setPathValid(response.data.valid);
      setMessage({ 
        text: response.data.message, 
        type: response.data.valid ? 'success' : 'error' 
      });
    } catch (error) {
      setPathValid(false);
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler bei der Validierung', 
        type: 'error' 
      });
    } finally {
      setValidatingPath(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      await api.put('/settings/backup', settings);
      setMessage({ text: 'Einstellungen erfolgreich gespeichert', type: 'success' });
      
      // Reload settings to confirm they were saved
      await loadSettings();
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Speichern', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const createBackup = async () => {
    setMessage({ text: 'Backup wird erstellt...', type: 'info' });

    try {
      const response = await api.post('/backup/create');
      setMessage({ text: response.data.message, type: 'success' });
      loadBackups();
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Erstellen des Backups', 
        type: 'error' 
      });
    }
  };

  const downloadBackup = async (filename) => {
    try {
      const response = await api.get(`/backup/download/${filename}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Fehler beim Herunterladen des Backups');
    }
  };

  const restoreBackup = async (filename) => {
    if (!window.confirm('Backup wirklich wiederherstellen? Dies überschreibt die aktuelle Datenbank!')) {
      return;
    }

    try {
      await api.post('/backup/restore', { filename });
      alert('Backup erfolgreich wiederhergestellt. Bitte Seite neu laden.');
      window.location.reload();
    } catch (error) {
      alert('Fehler beim Wiederherstellen: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteBackup = async (filename) => {
    if (!window.confirm('Backup wirklich löschen?')) return;

    try {
      await api.delete(`/backup/${filename}`);
      loadBackups();
    } catch (error) {
      alert('Fehler beim Löschen des Backups');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-fire-red mb-6">Backup-Einstellungen</h2>

        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 
            message.type === 'info' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enable Backup */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={settings.backup_enabled}
              onChange={(e) => setSettings({ ...settings, backup_enabled: e.target.checked })}
              className="w-5 h-5 text-fire-red rounded focus:ring-fire-red"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Automatische Backups aktivieren
            </label>
          </div>

          {/* Backup Path */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup-Pfad
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={settings.backup_path}
                onChange={(e) => {
                  setSettings({ ...settings, backup_path: e.target.value });
                  setPathValid(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
                placeholder="./backups"
              />
              <button
                type="button"
                onClick={validatePath}
                disabled={validatingPath}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50"
              >
                {validatingPath ? 'Prüfe...' : 'Pfad testen'}
              </button>
            </div>
            {pathValid !== null && (
              <p className={`text-sm mt-1 ${pathValid ? 'text-green-600' : 'text-red-600'}`}>
                {pathValid ? '✓ Pfad ist gültig' : '✗ Pfad ist ungültig'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              <strong>Beispiele:</strong><br />
              Windows: <code>C:\Backups\Feuerwehr</code><br />
              Linux: <code>/mnt/backup/feuerwehr</code><br />
              Relativ: <code>./backups</code>
            </p>
          </div>

          {/* Schedule Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tägliche Backup-Zeit (HH:MM)
            </label>
            <input
              type="time"
              value={settings.backup_schedule_time}
              onChange={(e) => setSettings({ ...settings, backup_schedule_time: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
            />
          </div>

          {/* Retention Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup-Aufbewahrungszeit (Tage): {settings.backup_retention_days}
            </label>
            <input
              type="range"
              min="1"
              max="90"
              value={settings.backup_retention_days}
              onChange={(e) => setSettings({ ...settings, backup_retention_days: parseInt(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Backups älter als {settings.backup_retention_days} Tage werden automatisch gelöscht
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-fire-red text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Speichern...' : 'Einstellungen speichern'}
            </button>
          </div>
        </form>
      </div>

      {/* Backup Management */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-fire-red">Backup-Verwaltung</h2>
          <button
            onClick={createBackup}
            className="bg-fire-red text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-all"
          >
            Jetzt Backup erstellen
          </button>
        </div>

        {backups.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Backups vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Dateiname</th>
                  <th className="text-left py-3 px-4">Erstellt am</th>
                  <th className="text-left py-3 px-4">Größe</th>
                  <th className="text-right py-3 px-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.filename} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-sm">{backup.filename}</td>
                    <td className="py-3 px-4">
                      {new Date(backup.created_at).toLocaleString('de-DE')}
                    </td>
                    <td className="py-3 px-4">{formatFileSize(backup.size)}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => downloadBackup(backup.filename)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => restoreBackup(backup.filename)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Wiederherstellen
                      </button>
                      <button
                        onClick={() => deleteBackup(backup.filename)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackupSettings;
