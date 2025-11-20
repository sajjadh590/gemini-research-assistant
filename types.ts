export enum Language {
  ENGLISH = 'en',
  PERSIAN = 'fa'
}

export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year: string;
  journal: string;
  doi?: string;
  url: string;
  source: 'PubMed' | 'arXiv';
  selected?: boolean;
}

export interface ResearchGap {
  topic: string;
  description: string;
  significance: string;
}

export interface AnalysisResult {
  gaps: ResearchGap[];
  summary: string;
  methodologySuggestions: string;
}

export interface SampleSizeParams {
  populationSize?: number;
  confidenceLevel: number; // 0.90, 0.95, 0.99
  marginOfError: number; // 0.05 etc.
  proportion: number; // 0.5 default
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}
