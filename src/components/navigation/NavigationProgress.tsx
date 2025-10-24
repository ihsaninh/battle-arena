'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function NavigationProgress() {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setIsNavigating(true);

    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px] bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
          style={{
            boxShadow: '0 0 10px #a855f7, 0 0 5px #a855f7',
          }}
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={{ scaleX: 1 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      )}
    </AnimatePresence>
  );
}
