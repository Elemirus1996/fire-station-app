import React, { useState, useEffect } from 'react';
import api from '../../api';

const SessionQRCode = ({ sessionId }) => {
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadQRCode();
      // Refresh QR code every 5 minutes
      const interval = setInterval(loadQRCode, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  const loadQRCode = () => {
    setLoading(true);
    // Build the QR code URL
    const baseUrl = api.defaults.baseURL || 'http://localhost:8000';
    setQrUrl(`${baseUrl}/api/sessions/${sessionId}/qr`);
    setLoading(false);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `session-${sessionId}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Session ${sessionId}</title>
          <style>
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              flex-direction: column;
            }
            img { 
              max-width: 80%;
              height: auto;
            }
            h2 {
              font-family: Arial, sans-serif;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <h2>Feuerwehr Check-In QR Code</h2>
          <img src="${qrUrl}" alt="QR Code" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-500">QR-Code wird geladen...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <img 
          src={qrUrl} 
          alt="Session QR Code" 
          className="w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96"
          onError={() => {
            console.error('Failed to load QR code');
            setLoading(true);
            setTimeout(loadQRCode, 2000);
          }}
        />
      </div>
      
      <div className="text-center space-y-2">
        <p className="text-xl font-bold text-white">
          📱 QR-Code scannen zum Check-in
        </p>
        <p className="text-white opacity-90">
          Öffne die Kamera-App auf deinem Smartphone
        </p>
      </div>

      <div className="flex space-x-3 mt-4">
        <button
          onClick={handleDownload}
          className="bg-white text-fire-red px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
        >
          📥 Download
        </button>
        <button
          onClick={handlePrint}
          className="bg-white text-fire-red px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
        >
          🖨️ Drucken
        </button>
      </div>
    </div>
  );
};

export default SessionQRCode;
