import React, { useState, useEffect } from 'react';
import api from '../../api';

const Statistics = () => {
  const [view, setView] = useState('overview'); // overview, personnel, unit
  const [personnel, setPersonnel] = useState([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [personnelStats, setPersonnelStats] = useState(null);
  const [unitStats, setUnitStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPersonnel();
  }, []);

  useEffect(() => {
    if (view === 'unit') {
      loadUnitStats();
    }
  }, [view, selectedYear]);

  const loadPersonnel = async () => {
    try {
      const response = await api.get('/personnel');
      setPersonnel(response.data.filter(p => p.is_active));
    } catch (error) {
      console.error('Fehler beim Laden der Personen:', error);
    }
  };

  const loadPersonnelStats = async (personnelId) => {
    setLoading(true);
    try {
      const response = await api.get(`/statistics/personnel/${personnelId}/yearly?year=${selectedYear}`);
      setPersonnelStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistik:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnitStats = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/statistics/unit/yearly?year=${selectedYear}`);
      setUnitStats(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Statistik:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonnelSelect = (person) => {
    setSelectedPersonnel(person);
    setView('personnel');
    loadPersonnelStats(person.id);
  };

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 10; i--) {
      years.push(i);
    }
    return years;
  };

  const exportPersonnelStats = async () => {
    if (!selectedPersonnel) return;
    try {
      const response = await api.get(
        `/statistics/personnel/${selectedPersonnel.id}/yearly/pdf?year=${selectedYear}`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Statistik_${selectedPersonnel.nachname}_${selectedPersonnel.vorname}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Fehler beim Export:', error);
      alert('Fehler beim Erstellen des PDFs');
    }
  };

  const exportUnitStats = async () => {
    try {
      const response = await api.get(
        `/statistics/unit/yearly/pdf?year=${selectedYear}`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Jahresbericht_Einheit_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Fehler beim Export:', error);
      alert('Fehler beim Erstellen des PDFs');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-800">📊 Statistiken</h2>
        
        {/* Year Selector */}
        <div className="flex items-center space-x-4">
          <label className="font-semibold text-gray-700">Jahr:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-fire-red focus:border-transparent"
          >
            {getYearOptions().map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex space-x-2">
        <button
          onClick={() => setView('overview')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            view === 'overview'
              ? 'bg-fire-red text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📋 Übersicht
        </button>
        <button
          onClick={() => setView('unit')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            view === 'unit'
              ? 'bg-fire-red text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🏢 Gesamtbericht
        </button>
      </div>

      {/* Overview - Personnel Selection */}
      {view === 'overview' && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Person auswählen</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {personnel.map(person => (
              <button
                key={person.id}
                onClick={() => handlePersonnelSelect(person)}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-fire-red hover:bg-red-50 transition-all text-left"
              >
                <div className="font-bold text-lg">{person.vorname} {person.nachname}</div>
                <div className="text-sm text-gray-600">{person.dienstgrad}</div>
                <div className="text-xs text-gray-500">Nr: {person.stammrollennummer}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Personnel Statistics */}
      {view === 'personnel' && selectedPersonnel && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {personnelStats?.personnel.vorname} {personnelStats?.personnel.nachname}
                </h3>
                <p className="text-gray-600">
                  {personnelStats?.personnel.dienstgrad} - Nr: {personnelStats?.personnel.stammrollennummer}
                </p>
              </div>
              <button
                onClick={() => setView('overview')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
              >
                ← Zurück
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-fire-red border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Lade Statistiken...</p>
            </div>
          ) : personnelStats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{personnelStats.summary.total_sessions}</div>
                  <div className="text-blue-100">Teilnahmen</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{personnelStats.summary.total_hours}h</div>
                  <div className="text-green-100">Gesamtstunden</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{personnelStats.summary.attendance_rate}%</div>
                  <div className="text-purple-100">Anwesenheitsquote</div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{Object.keys(personnelStats.summary.event_types).length}</div>
                  <div className="text-orange-100">Verschiedene Typen</div>
                </div>
              </div>

              {/* Event Types */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Teilnahme nach Typ</h4>
                <div className="space-y-4">
                  {personnelStats.summary.event_type_details && Object.entries(personnelStats.summary.event_type_details).map(([type, details]) => (
                    <div key={type} className="border-2 border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-lg text-gray-800">{type}</span>
                        <span className="text-2xl font-bold text-fire-red">{details.attended}/{details.total}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-fire-red to-fire-orange h-full rounded-full transition-all duration-500"
                          style={{ width: `${details.rate}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                          <span className={details.rate > 50 ? 'text-white' : 'text-gray-700'}>
                            {details.rate}% Anwesenheit
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        Besucht: {details.attended} von {details.total} Sessions
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Chart */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Monatliche Übersicht</h4>
                <div className="space-y-2">
                  {personnelStats.monthly.map(month => {
                    const maxCount = Math.max(...personnelStats.monthly.map(m => m.count));
                    const widthPercent = maxCount > 0 ? (month.count / maxCount * 100) : 0;
                    
                    return (
                      <div key={month.month} className="flex items-center space-x-3">
                        <div className="w-24 text-sm font-medium text-gray-700">{month.month_name}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-fire-red to-fire-orange h-full rounded-full transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3 text-sm font-semibold">
                            {month.count > 0 && (
                              <span className={month.count > 0 ? 'text-white' : 'text-gray-600'}>
                                {month.count} ({month.hours}h)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportPersonnelStats}
                  className="px-6 py-3 bg-fire-red text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
                >
                  📥 Als PDF exportieren
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Unit Statistics */}
      {view === 'unit' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-fire-red border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Lade Statistiken...</p>
            </div>
          ) : unitStats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{unitStats.summary.total_sessions}</div>
                  <div className="text-blue-100">Gesamt Sessions</div>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{unitStats.summary.total_attendances}</div>
                  <div className="text-green-100">Gesamt Teilnahmen</div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md p-6 text-white">
                  <div className="text-3xl font-bold">{unitStats.summary.average_attendance_per_session}</div>
                  <div className="text-purple-100">Ø Teilnahme/Session</div>
                </div>
              </div>

              {/* Event Types */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Sessions nach Typ</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(unitStats.summary.event_types).map(([type, count]) => (
                    <div key={type} className="p-4 bg-gray-100 rounded-lg">
                      <div className="text-2xl font-bold text-fire-red">{count}</div>
                      <div className="text-sm text-gray-600">{type}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 10 Personnel */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">🏆 Top 10 aktivste Mitglieder</h4>
                <div className="space-y-2">
                  {unitStats.top_personnel.map((person, index) => (
                    <div key={person.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        index === 2 ? 'bg-orange-600' : 
                        'bg-gray-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{person.name}</div>
                        <div className="text-sm text-gray-600">{person.dienstgrad}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-fire-red">{person.attendance_count}</div>
                        <div className="text-sm text-gray-600">{person.attendance_rate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Rank */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Teilnahme nach Dienstgrad</h4>
                <div className="space-y-3">
                  {unitStats.by_rank.map(rank => (
                    <div key={rank.dienstgrad} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold">{rank.dienstgrad}</span>
                      <span className="text-fire-red font-bold">{rank.attendance_count} Teilnahmen</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly Overview */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h4 className="text-xl font-bold text-gray-800 mb-4">Monatliche Übersicht</h4>
                <div className="space-y-2">
                  {unitStats.monthly.map(month => {
                    const maxCount = Math.max(...unitStats.monthly.map(m => m.total_sessions));
                    const widthPercent = maxCount > 0 ? (month.total_sessions / maxCount * 100) : 0;
                    
                    return (
                      <div key={month.month} className="flex items-center space-x-3">
                        <div className="w-24 text-sm font-medium text-gray-700">{month.month_name}</div>
                        <div className="flex-1 bg-gray-200 rounded-full h-8 relative overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-fire-red to-fire-orange h-full rounded-full transition-all duration-500"
                            style={{ width: `${widthPercent}%` }}
                          ></div>
                          <div className="absolute inset-0 flex items-center px-3 text-sm font-semibold">
                            {month.total_sessions > 0 && (
                              <span className="text-white">
                                {month.total_sessions} Sessions
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button
                  onClick={exportUnitStats}
                  className="px-6 py-3 bg-fire-red text-white rounded-lg hover:bg-red-700 transition-all font-semibold"
                >
                  📥 Gesamtbericht als PDF exportieren
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Statistics;
