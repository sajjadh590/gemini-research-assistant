import { Paper } from '../types';

// Update to point to local Python backend (via Vite proxy or direct)
const API_URL = '/api'; // Vite proxy will handle forwarding to localhost:8000

export const searchPubMed = async (query: string, maxResults: number = 10): Promise<Paper[]> => {
  try {
    const response = await fetch(`${API_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, max_results: maxResults }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to fetch papers from backend');
    }

    const data = await response.json();
    return data; // Backend returns structured Paper[]
  } catch (error) {
    console.error("PubMed Search Error:", error);
    // Return empty array to prevent UI crash, but log error
    return [];
  }
};
