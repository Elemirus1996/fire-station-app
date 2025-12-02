import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api';

const SessionDetails = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrImage, setQrImage] = useState(null);

  useEffect(() => {
    loadSession();
    if (session?.is_active) {
      loadQRCode();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const response = await api.get(`/sessions/${sessionId}`);
      setSession(response.data);
      if (response.data.is_active) {
        loadQRCode();
      }
    } catch (error) {
      console.error('Fehler beim Laden der Session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadQRCode = async () => {
    try {
      const response = await api.get(`/sessions/${sessionId}/qr`, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setQrImage(url);
    } catch (error) {
      console.error('Fehler beim Laden des QR-Codes:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Laden...</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Session nicht gefunden</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link to="/admin/sessions" className="text-fire-red hover:underline mb-2 inline-block">
              ← Zurück
            </Link>
            <h2 className="text-2xl font-bold text-fire-red">{session.event_type}</h2>
          </div>
          {session.is_active && (
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              AKTIV
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-600">Beginn</div>
            <div className="font-semibold">{new Date(session.started_at).toLocaleString('de-DE')}</div>
          </div>
          {session.ended_at && (
            <div>
              <div className="text-sm text-gray-600">Ende</div>
              <div className="font-semibold">{new Date(session.ended_at).toLocaleString('de-DE')}</div>
            </div>
          )}
          <div>
            <div className="text-sm text-gray-600">Teilnehmer</div>
            <div className="font-semibold">{session.attendances.length}</div>
          </div>
        </div>

        {/* QR Code for active sessions */}
        {session.is_active && qrImage && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">QR-Code für mobilen Check-In</h3>
            <div className="flex items-center space-x-6">
              <img src={qrImage} alt="QR Code" className="w-48 h-48 border rounded-lg" />
              <div className="text-sm text-gray-600">
                <p className="mb-2">Scannen Sie diesen QR-Code mit einem Smartphone für den mobilen Check-In.</p>
                <button
                  onClick={() => window.open(qrImage, '_blank')}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-all"
                >
                  QR-Code in neuem Tab öffnen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-fire-red mb-4">Teilnehmerliste</h3>
        
        {session.attendances.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Teilnehmer</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Stammr.</th>
                  <th className="text-left py-3 px-4">Name</th>
                  <th className="text-left py-3 px-4">Dienstgrad</th>
                  <th className="text-left py-3 px-4">Check-In</th>
                  <th className="text-left py-3 px-4">Check-Out</th>
                  <th className="text-left py-3 px-4">Dauer</th>
                </tr>
              </thead>
              <tbody>
                {session.attendances.map((att) => {
                  const checkIn = new Date(att.checked_in_at);
                  const checkOut = att.checked_out_at ? new Date(att.checked_out_at) : null;
                  const duration = checkOut ? Math.round((checkOut - checkIn) / 60000) : null;

                  return (
                    <tr key={att.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{att.stammrollennummer}</td>
                      <td className="py-3 px-4">
                        {att.vorname} {att.nachname}
                      </td>
                      <td className="py-3 px-4">{att.dienstgrad_name}</td>
                      <td className="py-3 px-4">
                        {checkIn.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        {checkOut ? (
                          checkOut.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-green-600 font-semibold">Anwesend</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {duration ? `${duration} min` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetails;
