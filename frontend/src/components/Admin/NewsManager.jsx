import React, { useState, useEffect } from 'react';
import api from '../../api';

const NewsManager = () => {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    expires_at: ''
  });

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/news?active_only=false');
      setNewsList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Fehler beim Laden der News:', error);
      setNewsList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...formData,
        expires_at: formData.expires_at || null
      };
      await api.post('/news', payload);
      setShowCreateModal(false);
      resetForm();
      loadNews();
    } catch (error) {
      alert('Fehler beim Erstellen: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...formData,
        expires_at: formData.expires_at || null
      };
      await api.put(`/news/${editingNews.id}`, payload);
      setEditingNews(null);
      resetForm();
      loadNews();
    } catch (error) {
      alert('Fehler beim Aktualisieren: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('News wirklich löschen?')) return;

    try {
      await api.delete(`/news/${id}`);
      loadNews();
    } catch (error) {
      alert('Fehler beim Löschen: ' + (error.response?.data?.detail || error.message));
    }
  };

  const toggleActive = async (news) => {
    try {
      await api.put(`/news/${news.id}`, { is_active: !news.is_active });
      loadNews();
    } catch (error) {
      alert('Fehler beim Aktualisieren: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      expires_at: ''
    });
  };

  const openEditModal = (news) => {
    setEditingNews(news);
    setFormData({
      title: news.title,
      content: news.content,
      priority: news.priority,
      expires_at: news.expires_at ? news.expires_at.split('T')[0] : ''
    });
    setShowCreateModal(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      case 'low':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'Dringend';
      case 'high':
        return 'Hoch';
      case 'normal':
        return 'Normal';
      case 'low':
        return 'Niedrig';
      default:
        return priority;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-fire-red">News & Updates</h2>
        <button
          onClick={() => {
            resetForm();
            setEditingNews(null);
            setShowCreateModal(true);
          }}
          className="bg-fire-red text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-all"
        >
          + Neue News
        </button>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {newsList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine News vorhanden</p>
        ) : (
          newsList.map((news) => (
            <div
              key={news.id}
              className={`border rounded-lg p-4 ${
                news.is_active ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-800">{news.title}</h3>
                    <span className={`${getPriorityColor(news.priority)} text-white px-2 py-1 rounded text-xs font-semibold`}>
                      {getPriorityLabel(news.priority)}
                    </span>
                    {!news.is_active && (
                      <span className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-semibold">
                        INAKTIV
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap mb-2">{news.content}</p>
                  <div className="text-sm text-gray-500">
                    Erstellt: {new Date(news.created_at).toLocaleString('de-DE')}
                    {news.expires_at && (
                      <> • Läuft ab: {new Date(news.expires_at).toLocaleString('de-DE')}</>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => toggleActive(news)}
                    className={`${
                      news.is_active ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
                    } text-white px-3 py-1 rounded-lg transition-all text-sm`}
                  >
                    {news.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                  <button
                    onClick={() => openEditModal(news)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-all text-sm"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(news.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition-all text-sm"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-fire-red mb-6">
              {editingNews ? 'News bearbeiten' : 'Neue News erstellen'}
            </h3>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                  placeholder="Titel der News"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inhalt *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                  placeholder="Inhalt der News"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorität
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                >
                  <option value="low">Niedrig</option>
                  <option value="normal">Normal</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
              </div>

              {/* Expires At */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ablaufdatum (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={editingNews ? handleUpdate : handleCreate}
                disabled={!formData.title || !formData.content}
                className="flex-1 bg-fire-red text-white py-3 rounded-lg hover:bg-red-800 transition-all font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingNews ? 'Aktualisieren' : 'Erstellen'}
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingNews(null);
                  resetForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-all font-bold"
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

export default NewsManager;
