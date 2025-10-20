import { useEffect, useState } from "react";

export const useViewport = (breakpoint: number = 1024) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, [breakpoint]);

  return { isMobile };
};