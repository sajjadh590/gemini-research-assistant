import { Paper, AnalysisResult, Language, StatsEstimationResult } from '../types';

export const checkApiKey = () => {
  // The key is now managed on the server side.
  return true; 
};

export const analyzePapersForGaps = async (papers: Paper[], language: Language): Promise<AnalysisResult> => {
  const response = await fetch('/api/analyze/gaps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ papers, language })
  });
  
  if (!response.ok) throw new Error("Analysis Failed");
  return await response.json();
};

export const generateProposal = async (
  topic: string, 
  papers: Paper[], 
  structure: string, 
  language: Language
): Promise<string> => {
  const response = await fetch('/api/proposal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, papers, structure, language })
  });

  if (!response.ok) throw new Error("Proposal Generation Failed");
  const data = await response.json();
  return data.content;
};

export const estimateSampleSizeAI = async (topic: string, language: Language): Promise<StatsEstimationResult> => {
  const response = await fetch('/api/stats/auto-estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, language })
  });

  if (!response.ok) throw new Error("Stats Calculation Failed");
  return await response.json();
};