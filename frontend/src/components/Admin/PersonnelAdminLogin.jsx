import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

export default function PersonnelAdminLogin() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    stammrollennummer: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/personnel-admin/login', credentials);
      
      // Store token and user info
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Set API default header
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.detail || 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Personal Admin Login</h1>
          <p className="text-gray-500 mt-2">Anmeldung mit Stammrollennummer</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stammrollennummer
            </label>
            <input
              type="text"
              value={credentials.stammrollennummer}
              onChange={(e) => setCredentials({ ...credentials, stammrollennummer: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              autoComplete="off"
              placeholder="z.B. 12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/admin/login')}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            ← Zurück zum Standard-Login
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>Hinweis: Nur Personal mit Admin-Berechtigung kann sich hier anmelden.</p>
        </div>
      </div>
    </div>
  );
}
