import api from '../api';

/**
 * Trigger kiosk refresh after admin changes
 * Call this after making changes that should be visible on kiosk
 */
export const triggerKioskRefresh = async () => {
  try {
    await api.post('/events/refresh-kiosk');
    console.log('✅ Kiosk refresh triggered');
  } catch (error) {
    console.error('❌ Failed to trigger kiosk refresh:', error);
  }
};

export default triggerKioskRefresh;
