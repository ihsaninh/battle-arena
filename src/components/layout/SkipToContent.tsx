'use client';

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:px-6 focus:py-3 focus:bg-purple-600 focus:text-white focus:rounded-xl focus:font-semibold focus:shadow-xl focus:outline-none focus:ring-4 focus:ring-purple-400/50"
    >
      Skip to main content
    </a>
  );
}
