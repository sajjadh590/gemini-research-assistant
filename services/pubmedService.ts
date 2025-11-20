import { Paper } from '../types';

export const searchPubMed = async (query: string, maxResults: number = 10): Promise<Paper[]> => {
  try {
    // Direct call to the python backend proxy
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, max_results: maxResults }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Backend Search Error:", error);
    return [];
  }
};