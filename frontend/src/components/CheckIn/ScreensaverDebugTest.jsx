import React, { useState, useEffect, useRef } from 'react';

const ScreensaverDebugTest = () => {
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [lastEvent, setLastEvent] = useState('none');
  const timerRef = useRef(null);

  useEffect(() => {
    console.log('🚀 Test component mounted');
    
    const startTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      setShowScreensaver(false);
      setCountdown(10);
      
      // Countdown display
      const countInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Screensaver activation
      timerRef.current = setTimeout(() => {
        console.log('✅ SCREENSAVER ACTIVATED!');
        setShowScreensaver(true);
        clearInterval(countInterval);
      }, 10000);
    };

    const handleEvent = (e) => {
      console.log(`🔄 Event detected: ${e.type}`);
      setLastEvent(e.type);
      startTimer();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    startTimer();

    return () => {
      console.log('🧹 Cleanup');
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (showScreensaver) {
    return (
      <div
        onClick={() => {
          console.log('👆 Screensaver clicked');
          setShowScreensaver(false);
        }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(135deg, #8B0000 0%, #b30000 50%, #FF4500 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <div style={{ fontSize: '120px', marginBottom: '20px' }}>🚒</div>
        <h1 style={{ fontSize: '60px', marginBottom: '10px' }}>Bildschirmschoner</h1>
        <p style={{ fontSize: '30px', opacity: 0.8 }}>
          {new Date().toLocaleTimeString('de-DE')}
        </p>
        <div style={{ 
          position: 'absolute', 
          bottom: '40px', 
          fontSize: '24px',
          animation: 'pulse 2s infinite'
        }}>
          Klicken zum Beenden
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center',
        background: 'rgba(0,0,0,0.3)',
        padding: '60px',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px' }}>
          🔬 Screensaver Test
        </h1>
        
        <div style={{ fontSize: '120px', margin: '40px 0', fontWeight: 'bold' }}>
          {countdown}
        </div>
        
        <p style={{ fontSize: '24px', marginBottom: '10px' }}>
          {countdown === 0 ? '✅ Timer abgelaufen!' : '⏱️ Sekunden bis Aktivierung'}
        </p>
        
        <div style={{ 
          marginTop: '40px',
          padding: '20px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '10px'
        }}>
          <p style={{ fontSize: '18px', marginBottom: '10px' }}>
            <strong>Debug Info:</strong>
          </p>
          <p style={{ fontSize: '16px' }}>Letztes Event: <code>{lastEvent}</code></p>
          <p style={{ fontSize: '16px' }}>Screensaver: {showScreensaver ? '🟢 AKTIV' : '🔴 INAKTIV'}</p>
        </div>
        
        <div style={{ 
          marginTop: '30px',
          padding: '15px',
          background: 'rgba(255,255,0,0.2)',
          borderRadius: '10px',
          fontSize: '14px'
        }}>
          <strong>⚠️ Wichtig:</strong> Berühre NICHTS für 10 Sekunden!<br/>
          (Keine Klicks, keine Tasten drücken)
        </div>
      </div>
    </div>
  );
};

export default ScreensaverDebugTest;
