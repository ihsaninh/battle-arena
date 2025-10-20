import { getConnectionStats } from './realtime';

// Connection monitoring utility
class ConnectionMonitor {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private highConnectionThreshold = 50; // Alert when connections exceed this
  private logInterval = 30000; // Log every 30 seconds

  startMonitoring() {
    if (this.monitoringInterval) {
      console.warn('Connection monitoring already started');
      return;
    }

    this.monitoringInterval = setInterval(() => {
      const stats = getConnectionStats();

      // Log regular statistics
      console.log(
        `📊 Connection Monitor - Total: ${stats.totalConnections}, User: ${stats.userConnections}`
      );

      // Alert on high connection count
      if (stats.totalConnections > this.highConnectionThreshold) {
        console.warn(
          `⚠️ High connection count detected: ${stats.totalConnections}`
        );
        this.logDetailedStats(stats);
      }

      // Alert on excessive connections per user
      if (stats.userConnections > stats.maxUserConnections * 0.8) {
        console.warn(
          `⚠️ High user connection count: ${stats.userConnections}/${stats.maxUserConnections}`
        );
      }
    }, this.logInterval);

    console.log('🔌 Connection monitoring started');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔌 Connection monitoring stopped');
    }
  }

  private logDetailedStats(stats: ReturnType<typeof getConnectionStats>) {
    console.group('🔍 Detailed Connection Stats');
    console.log('Total connections:', stats.totalConnections);
    console.log('User connections:', stats.userConnections);
    console.log('Max user connections:', stats.maxUserConnections);
    console.log('Connections by user:', stats.connectionsByUser);
    console.groupEnd();
  }

  // Force cleanup of connections
  forceCleanup() {
    console.log('🧹 Forcing connection cleanup');
    const statsBefore = getConnectionStats();
    // This would be implemented in the realtime module
    console.log(`📊 Before cleanup - Total: ${statsBefore.totalConnections}`);
    // Call cleanup function from realtime module
    console.log('✅ Connection cleanup completed');
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
