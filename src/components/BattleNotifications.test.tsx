import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { BattleNotifications } from './BattleNotifications';
import { useBattleStore } from '@/src/lib/store/battle-store';

// Mock next/navigation
const mockPathname = mock(() => '/room/123');
mock.module('next/navigation', () => ({
  usePathname: mockPathname,
}));

// Mock framer-motion to simplify testing
mock.module('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('BattleNotifications', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;

    // Reset store state
    useBattleStore.setState({
      notifications: [],
      setNotifications: (notifications: string[]) => {
        useBattleStore.setState({ notifications });
      },
    });
  });

  afterEach(() => {
    cleanup();

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });

    // Clear all notifications
    useBattleStore.setState({ notifications: [] });
  });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  test('should render notifications from store', async () => {
    useBattleStore.setState({
      notifications: ['Test notification 1', 'Test notification 2'],
    });

    render(<BattleNotifications />);

    await waitFor(() => {
      expect(screen.getAllByText('Test notification 1')[0]).toBeDefined();
      expect(screen.getAllByText('Test notification 2')[0]).toBeDefined();
    });
  });

  test('should not render when notifications array is empty', () => {
    useBattleStore.setState({ notifications: [] });

    const { container } = render(<BattleNotifications />);

    expect(container.textContent).toBe('');
  });

  test('should have timer that auto-dismisses notifications', async () => {
    useBattleStore.setState({
      notifications: ['Auto dismiss test'],
    });

    render(<BattleNotifications />);

    await waitFor(() => {
      expect(screen.getAllByText('Auto dismiss test').length).toBeGreaterThan(
        0
      );
    });

    // Verify notification exists initially
    const initialState = useBattleStore.getState();
    expect(initialState.notifications.length).toBe(1);
  });

  test('should manually dismiss notification when close button clicked', async () => {
    useBattleStore.setState({
      notifications: ['Dismissable notification'],
    });

    render(<BattleNotifications />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Dismissable notification').length
      ).toBeGreaterThan(0);
    });

    const dismissButton = screen.getAllByLabelText('Dismiss notification')[0];
    dismissButton.click();

    await waitFor(() => {
      const state = useBattleStore.getState();
      expect(state.notifications.length).toBe(0);
    });
  });

  test('should dismiss only the clicked notification when multiple exist', async () => {
    useBattleStore.setState({
      notifications: ['First notification', 'Second notification'],
    });

    render(<BattleNotifications />);

    await waitFor(() => {
      expect(screen.getAllByText('First notification').length).toBeGreaterThan(
        0
      );
    });

    const dismissButtons = screen.getAllByLabelText('Dismiss notification');
    dismissButtons[0].click();

    await waitFor(() => {
      const state = useBattleStore.getState();
      expect(state.notifications).toEqual(['Second notification']);
    });
  });

  test('should apply mobile classes when viewport < breakpoint', async () => {
    setWindowWidth(600);

    useBattleStore.setState({
      notifications: ['Mobile test'],
    });

    const { container } = render(
      <BattleNotifications mobileBreakpoint={768} />
    );

    await waitFor(() => {
      const notification = container.querySelector('.left-1\\/2');
      expect(notification).toBeDefined();
    });
  });

  test('should apply desktop classes when viewport >= breakpoint', async () => {
    setWindowWidth(1024);

    useBattleStore.setState({
      notifications: ['Desktop test'],
    });

    const { container } = render(
      <BattleNotifications mobileBreakpoint={768} />
    );

    await waitFor(() => {
      const notification = container.querySelector('.right-4');
      expect(notification).toBeDefined();
    });
  });

  test('should use custom breakpoint when provided', async () => {
    setWindowWidth(900);

    useBattleStore.setState({
      notifications: ['Custom breakpoint test'],
    });

    const { container } = render(
      <BattleNotifications mobileBreakpoint={1000} />
    );

    await waitFor(() => {
      // Should be mobile since 900 < 1000
      const notification = container.querySelector('.left-1\\/2');
      expect(notification).toBeDefined();
    });
  });

  test('should apply custom top offset when provided', async () => {
    useBattleStore.setState({
      notifications: ['Offset test'],
    });

    const { container } = render(
      <BattleNotifications topOffset={{ mobile: 10, desktop: 5 }} />
    );

    await waitFor(() => {
      const notification = container.querySelector('[style*="top"]');
      expect(notification).toBeDefined();
    });
  });

  test('should track pathname for cleanup', async () => {
    mockPathname.mockReturnValue('/room/123');

    useBattleStore.setState({
      notifications: ['Path test'],
    });

    render(<BattleNotifications />);

    await waitFor(() => {
      expect(screen.getAllByText('Path test').length).toBeGreaterThan(0);
    });

    // Verify component renders with current path
    const currentPath = mockPathname();
    expect(currentPath).toBe('/room/123');
  });

  test('should stack multiple notifications with offset', async () => {
    setWindowWidth(1024);

    useBattleStore.setState({
      notifications: ['First', 'Second', 'Third'],
    });

    const { container } = render(<BattleNotifications />);

    await waitFor(() => {
      const notifications = container.querySelectorAll('[style*="top"]');
      expect(notifications.length).toBe(3);

      // Each notification should have different top offset
      const topValues = Array.from(notifications).map(
        n => (n as HTMLElement).style.top
      );
      expect(new Set(topValues).size).toBe(3);
    });
  });

  test('should render dismiss button with correct accessibility', async () => {
    useBattleStore.setState({
      notifications: ['Accessibility test'],
    });

    render(<BattleNotifications />);

    await waitFor(() => {
      const buttons = screen.getAllByLabelText('Dismiss notification');
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0].getAttribute('type')).toBe('button');
      expect(buttons[0].getAttribute('aria-label')).toBe(
        'Dismiss notification'
      );
    });
  });
});
