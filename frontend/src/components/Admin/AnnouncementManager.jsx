import React, { useState, useEffect } from 'react';
import api from '../../api';

const AnnouncementManager = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    valid_from: '',
    valid_until: ''
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Ankündigungen:', error);
      alert('Fehler beim Laden der Ankündigungen');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        ...formData,
        valid_from: formData.valid_from || null,
        valid_until: formData.valid_until || null
      };

      if (editingAnnouncement) {
        await api.put(`/announcements/${editingAnnouncement.id}`, payload);
      } else {
        await api.post('/announcements', payload);
      }
      
      setShowModal(false);
      resetForm();
      loadAnnouncements();
    } catch (error) {
      alert('Fehler beim Speichern: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ankündigung wirklich löschen?')) return;
    
    try {
      await api.delete(`/announcements/${id}`);
      loadAnnouncements();
    } catch (error) {
      alert('Fehler beim Löschen: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      valid_from: announcement.valid_from ? new Date(announcement.valid_from).toISOString().slice(0, 16) : '',
      valid_until: announcement.valid_until ? new Date(announcement.valid_until).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      valid_from: '',
      valid_until: ''
    });
    setEditingAnnouncement(null);
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      urgent: 'bg-red-600 text-white',
      high: 'bg-yellow-500 text-black',
      normal: 'bg-blue-600 text-white'
    };
    const labels = {
      urgent: 'Dringend',
      high: 'Wichtig',
      normal: 'Normal'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const isActive = (announcement) => {
    const now = new Date();
    const validFrom = announcement.valid_from ? new Date(announcement.valid_from) : null;
    const validUntil = announcement.valid_until ? new Date(announcement.valid_until) : null;
    
    if (validFrom && now < validFrom) return false;
    if (validUntil && now > validUntil) return false;
    return true;
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-fire-red">Schwarzes Brett</h2>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-fire-red text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-all"
        >
          + Neue Ankündigung
        </button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Ankündigungen vorhanden</p>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`border rounded-lg p-4 ${isActive(announcement) ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-bold text-gray-800">{announcement.title}</h3>
                  {getPriorityBadge(announcement.priority)}
                  {isActive(announcement) && (
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      AKTIV
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-all text-sm"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-all text-sm"
                  >
                    Löschen
                  </button>
                </div>
              </div>
              
              <p className="text-gray-700 mb-2">{announcement.content}</p>
              
              <div className="text-sm text-gray-600">
                {announcement.valid_from && (
                  <div>Gültig von: {new Date(announcement.valid_from).toLocaleString('de-DE')}</div>
                )}
                {announcement.valid_until && (
                  <div>Gültig bis: {new Date(announcement.valid_until).toLocaleString('de-DE')}</div>
                )}
                {!announcement.valid_from && !announcement.valid_until && (
                  <div>Unbegrenzte Gültigkeit</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-fire-red mb-6">
              {editingAnnouncement ? 'Ankündigung bearbeiten' : 'Neue Ankündigung'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inhalt *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                  rows="4"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorität
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                >
                  <option value="normal">Normal</option>
                  <option value="high">Wichtig</option>
                  <option value="urgent">Dringend</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gültig von (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gültig bis (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-fire-red text-white py-2 rounded-lg hover:bg-red-800 transition-all"
                >
                  {editingAnnouncement ? 'Aktualisieren' : 'Erstellen'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition-all"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementManager;
