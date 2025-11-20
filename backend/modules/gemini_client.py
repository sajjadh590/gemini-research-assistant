import google.generativeai as genai

class GeminiClient:
    def __init__(self, api_key):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')

    def analyze_gap(self, text, language="en"):
        prompt = f"""
        Analyze these abstracts and find research gaps.
        Output strictly JSON: {{ "gaps": [{{"topic": "string", "description": "string", "significance": "string"}}], "summary": "string", "methodologySuggestions": "string" }}
        Language: {language}
        Abstracts: {text[:8000]}
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.replace("```json", "").replace("```", "").strip()
        except Exception as e:
            return "{}"

    def extract_sample_params(self, text):
        prompt = f"""
        Extract statistical parameters (Effect Size) for sample size calculation.
        Output strictly JSON: {{ "suggested_effect_size": 0.5, "reasoning": "string" }}
        Abstracts: {text[:5000]}
        """
        try:
            response = self.model.generate_content(prompt)
            return response.text.replace("```json", "").replace("```", "").strip()
        except:
            return '{"suggested_effect_size": 0.5, "reasoning": "Error in AI extraction"}'