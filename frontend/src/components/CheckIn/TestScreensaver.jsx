import React, { useState, useEffect } from 'react';

// Einfacher Test-Screensaver
const TestScreensaver = () => {
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('SCREENSAVER AKTIVIERT!');
      setShowScreensaver(true);
    }, 30000); // 30 Sekunden

    // Countdown für Debug
    const countInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countInterval);
    };
  }, []);

  if (showScreensaver) {
    return (
      <div
        onClick={() => setShowScreensaver(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(to bottom right, #8B0000, #FF4500)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          cursor: 'pointer'
        }}
      >
        <h1 style={{ color: 'white', fontSize: '80px' }}>🚒</h1>
        <h2 style={{ color: 'white', fontSize: '40px' }}>Bildschirmschoner</h2>
        <p style={{ color: 'white', fontSize: '20px' }}>Klicken zum Beenden</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>🔬 Screensaver Test</h1>
      <p style={{ fontSize: '24px' }}>
        Screensaver wird aktiviert in: <strong>{countdown}</strong> Sekunden
      </p>
      <p style={{ color: 'gray' }}>
        Bewege die Maus NICHT und berühre keine Tasten!
      </p>
      <div style={{ marginTop: '40px', padding: '20px', background: '#f5f5f5', borderRadius: '10px' }}>
        <h3>Debug Info:</h3>
        <p>Status: {showScreensaver ? '🟢 AKTIV' : '🔴 INAKTIV'}</p>
        <p>Timer läuft: {countdown < 30 ? 'JA' : 'NEIN'}</p>
      </div>
    </div>
  );
};

export default TestScreensaver;
