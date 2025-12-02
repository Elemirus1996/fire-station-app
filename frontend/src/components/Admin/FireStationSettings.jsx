import React, { useState, useEffect } from 'react';
import api from '../../api';

const FireStationSettings = () => {
  const [settings, setSettings] = useState({
    name: '',
    street: '',
    city: '',
    postal_code: '',
    logo_path: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings/firestation');
      setSettings(response.data);
      
      // Load logo if exists
      if (response.data.logo_path) {
        setLogoPreview('/uploads/logo/' + response.data.logo_path.split('/').pop());
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      // Update settings
      await api.put('/settings/firestation', {
        name: settings.name,
        street: settings.street,
        city: settings.city,
        postal_code: settings.postal_code
      });

      // Upload logo if selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        
        await api.post('/settings/firestation/logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setMessage({ text: 'Einstellungen erfolgreich gespeichert', type: 'success' });
      setLogoFile(null);
      loadSettings();
    } catch (error) {
      setMessage({ 
        text: error.response?.data?.detail || 'Fehler beim Speichern', 
        type: 'error' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
        setMessage({ text: 'Ungültiger Dateityp. Erlaubt: PNG, JPG, SVG', type: 'error' });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ text: 'Datei zu groß. Maximum: 2MB', type: 'error' });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-2xl font-bold text-fire-red mb-6">Feuerwache-Einstellungen</h2>

      {message.text && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Logo der Feuerwache
          </label>
          
          <div className="flex items-start space-x-6">
            {logoPreview && (
              <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                <img 
                  src={logoPreview} 
                  alt="Logo Vorschau" 
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleLogoChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-fire-red file:text-white
                  hover:file:bg-red-800
                  file:cursor-pointer"
              />
              <p className="text-xs text-gray-500 mt-2">
                PNG, JPG oder SVG. Maximal 2MB. Das Logo wird in PDFs verwendet.
              </p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name der Feuerwache
          </label>
          <input
            type="text"
            value={settings.name}
            onChange={(e) => setSettings({ ...settings, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
            placeholder="z.B. Freiwillige Feuerwehr Musterstadt"
            required
          />
        </div>

        {/* Address */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Straße
            </label>
            <input
              type="text"
              value={settings.street}
              onChange={(e) => setSettings({ ...settings, street: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
              placeholder="z.B. Feuerwehrstraße 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postleitzahl
            </label>
            <input
              type="text"
              value={settings.postal_code}
              onChange={(e) => setSettings({ ...settings, postal_code: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
              placeholder="z.B. 12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stadt
            </label>
            <input
              type="text"
              value={settings.city}
              onChange={(e) => setSettings({ ...settings, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
              placeholder="z.B. Musterstadt"
            />
          </div>
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
  );
};

export default FireStationSettings;
