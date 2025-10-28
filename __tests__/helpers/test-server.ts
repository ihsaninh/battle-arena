/**
 * Test Server Helper
 * Utility to start/stop Next.js dev server for integration tests
 */

let serverUrl: string | null = null;

/**
 * Get the test server URL
 * Assumes server is already running (manual start)
 */
export function getTestServerUrl(): string {
  const port = process.env.TEST_PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * Wait for server to be ready by polling
 */
export async function waitForServer(
  url: string,
  timeout: number = 10000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.status < 500) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return false;
}

/**
 * Check if server is running
 */
export async function isServerRunning(): Promise<boolean> {
  try {
    const url = getTestServerUrl();
    const response = await fetch(url, { method: 'HEAD' });
    return response.status < 500;
  } catch {
    return false;
  }
}
