// CORS Proxy utilities for file downloads
export const corsProxies = [
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://thingproxy.freeboard.io/fetch/',
];

export function addCorsProxy(url: string, proxyIndex: number = 0): string {
  if (proxyIndex >= corsProxies.length) {
    throw new Error('No more CORS proxies available');
  }
  
  const proxy = corsProxies[proxyIndex];
  return `${proxy}${encodeURIComponent(url)}`;
}

export async function fetchWithCorsProxy(url: string, maxRetries: number = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const proxyUrl = addCorsProxy(url, i);
      console.log(`[CORS Proxy] Attempting with proxy ${i + 1}:`, proxyUrl);
      
      const response = await fetch(proxyUrl);
      
      if (response.ok) {
        console.log(`[CORS Proxy] Success with proxy ${i + 1}`);
        return response;
      }
      
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.warn(`[CORS Proxy] Proxy ${i + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }
  
  throw lastError || new Error('All CORS proxies failed');
}

// Alternative: Use a local development proxy
export function getLocalProxyUrl(url: string): string {
  // If you have a local proxy server running
  return `/api/proxy?url=${encodeURIComponent(url)}`;
} 