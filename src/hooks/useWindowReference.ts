import { useRef } from "react";

// Custom hook for managing window references
export function useWindowReference(windowName: string) {
  const windowRef = useRef<Window | null>(null);

  const openWindow = (url: string) => {
    // Only open if window doesn't exist or is closed
    if (!windowRef.current || windowRef.current.closed) {
      windowRef.current = window.open(url, windowName);
    } else {
      // If window exists, just focus it
      windowRef.current.focus();
    }
  };

  return openWindow;
} 