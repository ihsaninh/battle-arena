interface ConnectionStatusIndicatorProps {
  status: 'connected' | 'disconnected';
}

export const ConnectionStatusIndicator = ({
  status,
}: ConnectionStatusIndicatorProps) => {
  if (status !== 'disconnected') return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 backdrop-blur-xl border border-red-400/30 rounded-xl px-4 py-2 text-white text-sm shadow-lg">
      <div className="flex items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Reconnecting...
      </div>
    </div>
  );
};
