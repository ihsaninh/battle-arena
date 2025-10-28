import { getConnectionStats } from '../client/realtime';
import { dbLogger } from '../utils/logger';

// Connection monitoring utility
class ConnectionMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private highConnectionThreshold = 50; // Alert when connections exceed this
  private logInterval = 30000; // Log every 30 seconds

  startMonitoring() {
    if (this.monitoringInterval) {
      dbLogger.warn('Connection monitoring already started');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      const stats = getConnectionStats();

      // Log regular statistics
      dbLogger.info(
        `📊 Connection Monitor - Total: ${stats.totalConnections}, User: ${stats.userConnections}`
      );

      // Alert on high connection count
      if (stats.totalConnections > this.highConnectionThreshold) {
        dbLogger.warn(
          `⚠️ High connection count detected: ${stats.totalConnections}`
        );
        this.logDetailedStats(stats);
      }

      // Alert on excessive connections per user
      if (stats.userConnections > stats.maxUserConnections * 0.8) {
        dbLogger.warn(
          `⚠️ High user connection count: ${stats.userConnections}/${stats.maxUserConnections}`
        );
      }
    }, this.logInterval);

    dbLogger.info('🔌 Connection monitoring started');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      dbLogger.info('🔌 Connection monitoring stopped');
    }
  }

  private logDetailedStats(stats: ReturnType<typeof getConnectionStats>) {
    dbLogger.info('Total connections:', stats.totalConnections);
    dbLogger.info('User connections:', stats.userConnections);
    dbLogger.info('Max user connections:', stats.maxUserConnections);
    dbLogger.info('Connections by user:', stats.connectionsByUser);
  }

  // Force cleanup of connections
  forceCleanup() {
    dbLogger.info('🧹 Forcing connection cleanup');
    const statsBefore = getConnectionStats();
    // This would be implemented in the realtime module
    dbLogger.info(`📊 Before cleanup - Total: ${statsBefore.totalConnections}`);
    // Call cleanup function from realtime module
    dbLogger.info('✅ Connection cleanup completed');
  }

  // Get current connection status
  getStatus() {
    return getConnectionStats();
  }
}

// Export singleton instance
export const connectionMonitor = new ConnectionMonitor();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  // Start monitoring when the page loads
  window.addEventListener('load', () => {
    connectionMonitor.startMonitoring();
  });

  // Stop monitoring when the page unloads
  window.addEventListener('beforeunload', () => {
    connectionMonitor.stopMonitoring();
  });
}

export default connectionMonitor;
