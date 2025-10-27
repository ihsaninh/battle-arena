import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { useViewport } from './useViewport';

describe('useViewport', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  const setWindowWidth = (width: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    window.dispatchEvent(new Event('resize'));
  };

  test('should return isMobile true when width < default breakpoint (1024)', async () => {
    setWindowWidth(768);

    const { result } = renderHook(() => useViewport());

    await waitFor(() => {
      expect(result.current.isMobile).toBe(true);
    });
  });

  test('should return isMobile false when width >= default breakpoint (1024)', async () => {
    setWindowWidth(1280);

    const { result } = renderHook(() => useViewport());

    await waitFor(() => {
      expect(result.current.isMobile).toBe(false);
    });
  });

  test('should use custom breakpoint when provided', async () => {
    setWindowWidth(800);

    const { result } = renderHook(() => useViewport(900));

    await waitFor(() => {
      expect(result.current.isMobile).toBe(true);
    });
  });

  test('should return false when width >= custom breakpoint', async () => {
    setWindowWidth(1000);

    const { result } = renderHook(() => useViewport(900));

    await waitFor(() => {
      expect(result.current.isMobile).toBe(false);
    });
  });

  test('should update isMobile when window is resized', async () => {
    setWindowWidth(1280);

    const { result } = renderHook(() => useViewport());

    await waitFor(() => {
      expect(result.current.isMobile).toBe(false);
    });

    setWindowWidth(768);

    await waitFor(() => {
      expect(result.current.isMobile).toBe(true);
    });
  });

  test('should handle edge case at exact breakpoint', async () => {
    setWindowWidth(1024);

    const { result } = renderHook(() => useViewport(1024));

    await waitFor(() => {
      expect(result.current.isMobile).toBe(false);
    });
  });

  test('should cleanup resize listener on unmount', () => {
    setWindowWidth(1280);

    const { unmount } = renderHook(() => useViewport());

    unmount();

    // After unmount, changing window width shouldn't cause any issues
    expect(() => setWindowWidth(768)).not.toThrow();
  });
});
