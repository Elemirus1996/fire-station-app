import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', {
        username,
        password
      });

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      navigate('/admin');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-fire-red to-fire-orange flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-fire-red mb-2">🚒</h1>
          <h2 className="text-3xl font-bold text-fire-red">Admin Login</h2>
          <p className="text-gray-600 mt-2">Feuerwehr Anwesenheitssystem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-fire-red focus:border-transparent"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-fire-red focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-fire-red text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmelden...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/kiosk"
            className="text-fire-red hover:underline text-sm"
          >
            ← Zurück zum Check-In
          </a>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-xl text-xs text-gray-600">
          <p className="font-semibold mb-1">Demo-Zugangsdaten:</p>
          <p>Benutzername: <span className="font-mono">admin</span></p>
          <p>Passwort: <span className="font-mono">feuerwehr2025</span></p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
