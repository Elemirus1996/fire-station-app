import { useState, useEffect } from 'react';
import api from '../../api';

export default function PersonnelAdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    personnel_id: '',
    password: '',
    role: 'admin'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adminsRes, personnelRes] = await Promise.all([
        api.get('/personnel-admin'),
        api.get('/personnel')
      ]);
      setAdmins(adminsRes.data);
      setPersonnel(personnelRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/personnel-admin/create', formData);
      setShowCreateModal(false);
      setFormData({ personnel_id: '', password: '', role: 'admin' });
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Fehler beim Erstellen');
    }
  };

  const handleToggleActive = async (adminId, currentActive) => {
    if (!confirm(`Admin-Zugriff wirklich ${currentActive ? 'deaktivieren' : 'aktivieren'}?`)) {
      return;
    }

    try {
      await api.put(`/personnel-admin/${adminId}`, {
        is_active: !currentActive
      });
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Fehler beim Aktualisieren');
    }
  };

  const handleDelete = async (adminId) => {
    if (!confirm('Admin-Zugriff wirklich entfernen?')) {
      return;
    }

    try {
      await api.delete(`/personnel-admin/${adminId}`);
      loadData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Fehler beim Löschen');
    }
  };

  const handleResetPassword = async (adminId) => {
    const newPassword = prompt('Neues Passwort eingeben:');
    if (!newPassword) return;

    if (newPassword.length < 6) {
      alert('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    try {
      await api.put(`/personnel-admin/${adminId}`, {
        password: newPassword
      });
      alert('Passwort erfolgreich geändert');
    } catch (error) {
      alert(error.response?.data?.detail || 'Fehler beim Ändern des Passworts');
    }
  };

  const getAvailablePersonnel = () => {
    const adminPersonnelIds = admins.map(a => a.personnel_id);
    return personnel.filter(p => 
      p.is_active && !adminPersonnelIds.includes(p.id)
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Personal-Admin-Zugriff</h1>
          <p className="text-gray-600 mt-2">
            Verwalte welches Personal Admin-Zugriff hat
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          + Admin-Zugriff erstellen
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Noch kein Personal mit Admin-Zugriff
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stammrollennummer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dienstgrad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rolle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Letzter Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className={!admin.is_active ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {admin.stammrollennummer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {admin.vorname} {admin.nachname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {admin.dienstgrad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {admin.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      admin.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {admin.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {admin.last_login 
                      ? new Date(admin.last_login).toLocaleString('de-DE')
                      : 'Nie'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleToggleActive(admin.id, admin.is_active)}
                      className={`px-3 py-1 rounded ${
                        admin.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {admin.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => handleResetPassword(admin.id)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Passwort
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Admin-Zugriff erstellen</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal auswählen
                </label>
                <select
                  value={formData.personnel_id}
                  onChange={(e) => setFormData({ ...formData, personnel_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">-- Bitte wählen --</option>
                  {getAvailablePersonnel().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.stammrollennummer} - {p.vorname} {p.nachname} ({p.dienstgrad})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                  minLength={6}
                  placeholder="Mindestens 6 Zeichen"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rolle
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ personnel_id: '', password: '', role: 'admin' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
