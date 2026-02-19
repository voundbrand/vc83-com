import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const getInitialMatches = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getInitialMatches);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia(query);

    // Update the initial state
    setMatches(media.matches);

    // Create the event listener
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };

    // Add the listener
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
    } else {
      media.addListener(listener);
    }

    // Clean up
    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", listener);
      } else {
        media.removeListener(listener);
      }
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

// Desktop shell fallback should engage for compact viewports to avoid multi-window overload.
export function useIsDesktopShellFallback() {
  return useMediaQuery("(max-width: 1023px)");
}
