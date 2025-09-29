import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Update the initial state
    setMatches(media.matches);

    // Create the event listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add the listener
    media.addEventListener("change", listener);

    // Clean up
    return () => {
      media.removeEventListener("change", listener);
    };
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile() {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsDesktop() {
  return useMediaQuery("(min-width: 768px)");
}