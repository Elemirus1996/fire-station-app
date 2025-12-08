import { useState, useEffect } from 'react';
import api from '../../api';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    user_id: '',
    hours: 24
  });
  const [actions, setActions] = useState([]);
  const [entityTypes, setEntityTypes] = useState([]);
  const [statistics, setStatistics] = useState(null);

  useEffect(() => {
    loadAuditData();
  }, [filters]);

  const loadAuditData = async () => {
    setLoading(true);
    try {
      // Load logs
      const logsResponse = await api.get('/audit/recent', {
        params: { hours: filters.hours }
      });
      setLogs(logsResponse.data);

      // Load available actions and entity types
      const [actionsRes, typesRes, statsRes] = await Promise.all([
        api.get('/audit/actions'),
        api.get('/audit/entity-types'),
        api.get('/audit/statistics', { params: { days: 30 } })
      ]);

      setActions(actionsRes.data);
      setEntityTypes(typesRes.data);
      setStatistics(statsRes.data);
    } catch (error) {
      console.error('Failed to load audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadgeColor = (action) => {
    if (action.startsWith('CREATE')) return 'bg-green-100 text-green-800';
    if (action.startsWith('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatChanges = (changes) => {
    if (!changes || typeof changes !== 'object') return null;
    
    return (
      <div className="mt-2 text-sm">
        {Object.entries(changes).map(([key, value]) => (
          <div key={key} className="flex gap-2">
            <span className="font-medium text-gray-600">{key}:</span>
            <span className="text-gray-800">
              {typeof value === 'object' 
                ? JSON.stringify(value) 
                : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Audit-Log</h1>
        <p className="text-gray-600 mt-2">
          Protokoll aller Admin-Aktivitäten
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Gesamt (30 Tage)</div>
            <div className="text-3xl font-bold text-gray-800">{statistics.total_logs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Aktionen</div>
            <div className="text-2xl font-semibold text-gray-800">
              {statistics.by_action.length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Aktive Benutzer</div>
            <div className="text-2xl font-semibold text-gray-800">
              {statistics.by_user.length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zeitraum
            </label>
            <select
              value={filters.hours}
              onChange={(e) => setFilters({ ...filters, hours: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value={1}>Letzte Stunde</option>
              <option value={6}>Letzte 6 Stunden</option>
              <option value={24}>Letzte 24 Stunden</option>
              <option value={72}>Letzte 3 Tage</option>
              <option value={168}>Letzte Woche</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aktion
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Alle Aktionen</option>
              {actions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entitätstyp
            </label>
            <select
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
            >
              <option value="">Alle Typen</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ action: '', entity_type: '', user_id: '', hours: 24 })}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Filter zurücksetzen
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Lade Audit-Logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Keine Logs gefunden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Zeitstempel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benutzer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entität
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Änderungen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {log.entity_type && (
                        <div>
                          <div className="font-medium">{log.entity_type}</div>
                          {log.entity_id && (
                            <div className="text-xs text-gray-500">ID: {log.entity_id}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatChanges(log.changes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Statistics */}
      {statistics && statistics.by_action.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Aktionen (30 Tage)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {statistics.by_action.map((item) => (
              <div key={item.action} className="text-center">
                <div className="text-2xl font-bold text-gray-800">{item.count}</div>
                <div className="text-xs text-gray-600 mt-1">{item.action}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
