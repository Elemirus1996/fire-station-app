import React, { useState, useEffect } from 'react';
import api from '../../api';

const PersonnelManagement = () => {
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    stammrollennummer: '',
    vorname: '',
    nachname: '',
    dienstgrad: 'FM',
    is_active: true
  });

  const dienstgrade = [
    { code: 'FM', name: 'Feuerwehrmann' },
    { code: 'OFM', name: 'Oberfeuerwehrmann' },
    { code: 'HFM', name: 'Hauptfeuerwehrmann' },
    { code: 'UBM', name: 'Unterbrandmeister' },
    { code: 'BM', name: 'Brandmeister' },
    { code: 'OBM', name: 'Oberbrandmeister' },
    { code: 'HBM', name: 'Hauptbrandmeister' },
    { code: 'BI', name: 'Brandinspektor' }
  ];

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const response = await api.get('/personnel?active_only=false');
      setPersonnel(response.data);
    } catch (error) {
      console.error('Fehler beim Laden des Personals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingId) {
        await api.put(`/personnel/${editingId}`, formData);
      } else {
        await api.post('/personnel', formData);
      }
      
      setShowModal(false);
      setEditingId(null);
      setFormData({
        stammrollennummer: '',
        vorname: '',
        nachname: '',
        dienstgrad: 'FM',
        is_active: true
      });
      loadPersonnel();
    } catch (error) {
      alert('Fehler: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleEdit = (person) => {
    setEditingId(person.id);
    setFormData({
      stammrollennummer: person.stammrollennummer,
      vorname: person.vorname,
      nachname: person.nachname,
      dienstgrad: person.dienstgrad,
      is_active: person.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Person wirklich deaktivieren?')) return;

    try {
      await api.delete(`/personnel/${id}`);
      loadPersonnel();
    } catch (error) {
      alert('Fehler beim Löschen');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-fire-red">Personalverwaltung</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              stammrollennummer: '',
              vorname: '',
              nachname: '',
              dienstgrad: 'FM',
              is_active: true
            });
            setShowModal(true);
          }}
          className="bg-fire-red text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-all"
        >
          + Neue Person
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4">Stammr.</th>
              <th className="text-left py-3 px-4">Vorname</th>
              <th className="text-left py-3 px-4">Nachname</th>
              <th className="text-left py-3 px-4">Dienstgrad</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-right py-3 px-4">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {personnel.map((person) => (
              <tr key={person.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-mono">{person.stammrollennummer}</td>
                <td className="py-3 px-4">{person.vorname}</td>
                <td className="py-3 px-4">{person.nachname}</td>
                <td className="py-3 px-4">{person.dienstgrad_name}</td>
                <td className="py-3 px-4">
                  {person.is_active ? (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      Aktiv
                    </span>
                  ) : (
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
                      Inaktiv
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(person)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Bearbeiten
                  </button>
                  {person.is_active && (
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Deaktivieren
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-fire-red mb-6">
              {editingId ? 'Person bearbeiten' : 'Neue Person'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Stammrollennummer</label>
                <input
                  type="text"
                  value={formData.stammrollennummer}
                  onChange={(e) => setFormData({ ...formData, stammrollennummer: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Vorname</label>
                <input
                  type="text"
                  value={formData.vorname}
                  onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nachname</label>
                <input
                  type="text"
                  value={formData.nachname}
                  onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Dienstgrad</label>
                <select
                  value={formData.dienstgrad}
                  onChange={(e) => setFormData({ ...formData, dienstgrad: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {dienstgrade.map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-sm">Aktiv</label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-fire-red text-white py-2 rounded-lg hover:bg-red-800 transition-all"
                >
                  Speichern
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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

export default PersonnelManagement;
