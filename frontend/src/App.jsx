import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CheckInKiosk from './components/CheckIn/CheckInKiosk';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import PersonnelManagement from './components/Admin/PersonnelManagement';
import SessionManagement from './components/Admin/SessionManagement';
import SessionDetails from './components/Admin/SessionDetails';
import FireStationSettings from './components/Admin/FireStationSettings';
import BackupSettings from './components/Admin/BackupSettings';
import SystemSettings from './components/Admin/SystemSettings';
import AnnouncementManager from './components/Admin/AnnouncementManager';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/kiosk" replace />} />
        <Route path="/kiosk" element={<CheckInKiosk />} />
        <Route path="/checkin" element={<CheckInKiosk />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<Navigate to="/admin/sessions" replace />} />
          <Route path="sessions" element={<SessionManagement />} />
          <Route path="sessions/:sessionId" element={<SessionDetails />} />
          <Route path="personnel" element={<PersonnelManagement />} />
          <Route path="announcements" element={<AnnouncementManager />} />
          <Route path="settings/firestation" element={<FireStationSettings />} />
          <Route path="settings/system" element={<SystemSettings />} />
          <Route path="settings/backup" element={<BackupSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
