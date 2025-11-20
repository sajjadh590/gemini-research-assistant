import { GoogleGenAI, Type } from "@google/genai";
import { Paper, AnalysisResult, Language } from '../types';

// Initializing Gemini Client
// The API key is strictly obtained from process.env.API_KEY as per system instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';
const MODEL_THINKING = 'gemini-3-pro-preview';

export const checkApiKey = () => {
  return !!process.env.API_KEY;
};

/**
 * Analyze papers to find research gaps using Thinking Mode for depth.
 */
export const analyzePapersForGaps = async (papers: Paper[], language: Language): Promise<AnalysisResult> => {
  const paperText = papers.map(p => `Title: ${p.title}\nAbstract: ${p.abstract}\nYear: ${p.year}`).join('\n---\n');
  
  const prompt = `
    You are a senior research scientist. 
    Analyze the following academic papers (Titles and Abstracts).
    
    Task:
    1. Identify 3 distinct, specific Research Gaps that are not fully addressed.
    2. Provide a synthesis/summary of the current state of research based on these papers.
    3. Suggest methodology for a new study to address one of these gaps.

    Language: Output EVERYTHING in ${language === Language.PERSIAN ? 'Persian (Farsi)' : 'English'}.
    
    Format your response as JSON matching this schema:
    {
      "gaps": [{ "topic": "string", "description": "string", "significance": "string" }],
      "summary": "string",
      "methodologySuggestions": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_THINKING,
      contents: [
        { text: prompt },
        { text: paperText }
      ],
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4096 } // Use thinking for deep analysis
      }
    });
    
    if (!response.text) throw new Error("No response from Gemini");
    return JSON.parse(response.text) as AnalysisResult;
  } catch (error) {
    console.error("Gap Analysis Error:", error);
    throw error;
  }
};

/**
 * Write a detailed Research Proposal.
 */
export const generateProposal = async (
  topic: string, 
  papers: Paper[], 
  structure: string, 
  language: Language
): Promise<string> => {
  const paperContext = papers.map(p => `[${p.authors[0]} et al., ${p.year}] ${p.title}: ${p.abstract}`).join('\n\n');

  const prompt = `
    Act as a world-class academic grant writer.
    Write a comprehensive research proposal on the topic: "${topic}".
    
    Use the provided papers as citations and evidence. 
    The output must be highly professional, academic, and undetectable as AI-generated (human-like flow).
    
    Required Structure:
    ${structure}

    Context Papers:
    ${paperContext}

    Language: Write entirely in ${language === Language.PERSIAN ? 'Persian (Farsi)' : 'English'}.
    Tone: Academic, persuasive, rigorous.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_THINKING,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 8192 }, // High budget for writing quality
      }
    });
    return response.text || "Failed to generate proposal.";
  } catch (error) {
    console.error("Proposal Generation Error:", error);
    throw error;
  }
};

/**
 * Statistical Assistant: Estimate Sample Size via Reasoning/Search
 */
export const estimateSampleSizeAI = async (topic: string, language: Language): Promise<string> => {
  const prompt = `
    The user wants to conduct a study on: "${topic}".
    Determine an appropriate sample size for this type of study based on standard statistical power analysis rules of thumb for similar medical/scientific studies.
    
    1. Identify the likely study design (e.g., RCT, Cross-sectional, Case-control).
    2. Estimate typical effect sizes found in this field.
    3. Recommend a sample size range (Min - Ideal).
    4. Explain the reasoning (Alpha=0.05, Power=0.80, etc.).

    Language: ${language === Language.PERSIAN ? 'Persian (Farsi)' : 'English'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST, // Flash is sufficient for general knowledge lookup or simple reasoning
      contents: prompt,
      config: {
        // Enabling Google Search to get real-world context if topic is niche
        tools: [{ googleSearch: {} }] 
      }
    });

    // Check for grounding chunks (URLs)
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let text = response.text || "";

    if (grounding && grounding.length > 0) {
      text += "\n\nReferences found via Google Search:\n";
      grounding.forEach((chunk: any) => {
        if (chunk.web?.uri) {
            text += `- [${chunk.web.title}](${chunk.web.uri})\n`;
        }
      });
    }

    return text;
  } catch (error) {
    console.error("Sample Size AI Error:", error);
    return "Error estimating sample size.";
  }
};
