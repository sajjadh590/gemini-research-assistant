import { Paper } from '../types';

// این آدرس به پراکسی Vite اشاره می‌کند که درخواست‌ها را به پایتون (localhost:7860) می‌فرستد
const API_URL = '/api'; 

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
    
    // ✅ اصلاح مهم: دریافت آرایه results از داخل آبجکت پاسخ
    // قبلاً return data بود که باعث می‌شد ریکت گیج شود
    return data.results || []; 

  } catch (error) {
    console.error("PubMed Search Error:", error);
    // در صورت خطا، یک لیست خالی برمی‌گردانیم تا صفحه سفید نشود
    return [];
  }
};