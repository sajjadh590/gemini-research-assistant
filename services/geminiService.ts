import { Paper, AnalysisResult, Language, StatsEstimationResult } from '../types';

const API_URL = '/api';

// No longer needed client-side, but kept for interface compatibility if referenced
export const checkApiKey = () => true;

export const analyzePapersForGaps = async (papers: Paper[], language: Language): Promise<AnalysisResult> => {
  try {
    const response = await fetch(`${API_URL}/analyze/gaps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ papers, language })
    });
    
    if (!response.ok) throw new Error("Gap Analysis Failed at Backend");
    
    return await response.json();
  } catch (error) {
    console.error("Analysis Error:", error);
    throw error;
  }
};

export const generateProposal = async (
  topic: string, 
  papers: Paper[], 
  structure: string, 
  language: Language
): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, papers, structure, language })
    });

    if (!response.ok) throw new Error("Proposal Generation Failed");
    const data = await response.json();
    return data.content;
  } catch (error) {
    console.error("Proposal Error:", error);
    throw error;
  }
};

export const estimateSampleSizeAI = async (topic: string, language: Language): Promise<StatsEstimationResult> => {
  try {
    const response = await fetch(`${API_URL}/stats/auto-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, language })
    });

    if (!response.ok) throw new Error("Stats Calculation Failed");
    return await response.json();
  } catch (error) {
    console.error("Stats Error:", error);
    throw error;
  }
};
