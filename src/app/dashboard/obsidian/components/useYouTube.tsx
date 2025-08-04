import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';

type Ctx = { 
  getActiveTime: () => number | null; 
  register: (iframeId: string) => void; 
  seekTo: (time: number) => void;
};
const YouTubeCtx = createContext<Ctx>({ 
  getActiveTime: () => null, 
  register: () => {}, 
  seekTo: () => {} 
});

let apiPromise: Promise<void> | null = null;
function loadAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => resolve();
  });
  return apiPromise;
}

export function YouTubeProvider({ children }: { children: React.ReactNode }) {
  const activeRef = useRef<YT.Player | null>(null);

  const register = useCallback((iframeId: string) => {
    loadAPI().then(() => {
      // Bind a YT.Player to the existing iframe
      const player = new window.YT.Player(iframeId, {
        events: {
          onReady: () => {},
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) activeRef.current = player;
          },
        },
      });
    });
  }, []);

  const getActiveTime = useCallback(() => {
    const p = activeRef.current;
    if (!p || typeof p.getCurrentTime !== 'function') return null;
    return p.getCurrentTime(); // seconds (float)
  }, []);

  const seekTo = useCallback((time: number) => {
    const p = activeRef.current;
    if (!p || typeof p.seekTo !== 'function') return;
    p.seekTo(time, true); // seek to time, allowSeekAhead = true
  }, []);

  return (
    <YouTubeCtx.Provider value={{ getActiveTime, seekTo, register }}>
      {children}
    </YouTubeCtx.Provider>
  );
}

export const useYouTube = () => useContext(YouTubeCtx); 