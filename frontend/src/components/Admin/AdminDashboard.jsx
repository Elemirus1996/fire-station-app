import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const loadUser = async () => {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch (error) {
        navigate('/admin/login');
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-fire-red text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">🚒 Feuerwehr Admin</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">
              {user.username} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-800 hover:bg-red-900 px-4 py-2 rounded-lg text-sm transition-all"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <nav className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <Link
                to="/kiosk"
                className="block px-4 py-2 rounded-lg hover:bg-gray-100 transition-all"
              >
                🖥️ Check-In Kiosk
              </Link>
              <Link
                to="/admin/sessions"
                className={`block px-4 py-2 rounded-lg transition-all ${
                  isActive('/admin/sessions')
                    ? 'bg-fire-red text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                📋 Sessions
              </Link>
              <Link
                to="/admin/personnel"
                className={`block px-4 py-2 rounded-lg transition-all ${
                  isActive('/admin/personnel')
                    ? 'bg-fire-red text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                👥 Personal
              </Link>
              <Link
                to="/admin/announcements"
                className={`block px-4 py-2 rounded-lg transition-all ${
                  isActive('/admin/announcements')
                    ? 'bg-fire-red text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                📢 Schwarzes Brett
              </Link>
              
              <div className="border-t pt-2 mt-2">
                <div className="text-xs text-gray-500 px-4 py-2 font-semibold">
                  EINSTELLUNGEN
                </div>
                <Link
                  to="/admin/settings/firestation"
                  className={`block px-4 py-2 rounded-lg transition-all ${
                    isActive('/admin/settings/firestation')
                      ? 'bg-fire-red text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  🏢 Feuerwache
                </Link>
                <Link
                  to="/admin/settings/system"
                  className={`block px-4 py-2 rounded-lg transition-all ${
                    isActive('/admin/settings/system')
                      ? 'bg-fire-red text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  ⚙️ System
                </Link>
                <Link
                  to="/admin/settings/backup"
                  className={`block px-4 py-2 rounded-lg transition-all ${
                    isActive('/admin/settings/backup')
                      ? 'bg-fire-red text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  💾 Backup
                </Link>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
