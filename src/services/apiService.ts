/**
 * API Service for soccer data collection
 * Uses SportAPI.ai as Primary and TheRundown as Secondary provider
 */
export async function fetchFixturesFromAPI(targetDate?: string): Promise<{
  success: boolean;
  provider: 'sportapi_ai' | 'therundown' | 'none';
  data: any[];
  error?: string;
}> {
  try {
    // In browser or server environment, query the server ingestion endpoint for unified, protected access
    const res = await fetch('/api/upcoming-fixtures');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.fixtures) && json.fixtures.length > 0) {
        return {
          success: true,
          provider: json.fixtures[0]?.provider === 'therundown' ? 'therundown' : 'sportapi_ai',
          data: json.fixtures,
        };
      }
    }
  } catch (err: any) {
    console.warn('[API Service] Client-side fetch failed, trying local direct check:', err);
  }

  return { success: false, provider: 'none', data: [] };
}

