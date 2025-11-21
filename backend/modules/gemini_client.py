import google.generativeai as genai
import os
import json
import time

class GeminiClient:
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("API Key is required")
        genai.configure(api_key=api_key)
        # تعریف مدل‌ها
        self.model_pro = genai.GenerativeModel('gemini-1.5-pro') # مدل قوی
        self.model_flash = genai.GenerativeModel('gemini-1.5-flash') # مدل سریع و ارزان

    def _generate_with_fallback(self, prompt):
        """تلاش با مدل قوی، اگر نشد با مدل سریع"""
        try:
            return self.model_pro.generate_content(prompt).text
        except Exception as e:
            print(f"⚠️ Gemini Pro Error (Quota/Server): {e}. Switching to Flash...")
            try:
                time.sleep(1) # مکث کوتاه
                return self.model_flash.generate_content(prompt).text
            except Exception as e2:
                return f"Error: AI Service Unavailable. {str(e2)}"

    def analyze_gap(self, text, language="en"):
        prompt = f"""
        Analyze these abstracts and find research gaps.
        Output strictly JSON with this structure: 
        {{ 
            "gaps": [
                {{"topic": "string", "description": "string", "significance": "string"}}
            ], 
            "summary": "string", 
            "methodologySuggestions": "string" 
        }}
        Language: {language}
        Abstracts: {text[:15000]}
        """
        response_text = self._generate_with_fallback(prompt)
        return self._clean_json(response_text)

    def generate_proposal(self, topic, papers_text, structure, language="fa"):
        # (قالب دانشگاه که قبلاً اضافه کردیم اینجا هست)
        university_template = """
        1. **عنوان تحقیق (Title)**: فارسی و انگلیسی.
        2. **بیان مسئله**: تشریح دقیق، آمارها، ضرورت.
        3. **مرور متون**: ۳ مطالعه با ذکر نام، سال، روش و نتیجه.
        4. **اهداف و فرضیات**: هدف کلی، اختصاصی، سوالات.
        5. **روش کار**: نوع مطالعه، جامعه، حجم نمونه، ابزار، تحلیل آماری.
        6. **اخلاق**: محرمانگی و رضایت.
        7. **منابع**: ونکوور.
        """
        
        prompt = f"""
        Act as a PhD researcher. Write a thesis proposal for Islamic Azad University.
        Topic: {topic}
        Context Papers: {papers_text[:20000]}
        Template: {university_template}
        Language: Persian (Farsi). Tone: Academic.
        Output: ONLY the proposal text.
        """
        return self._generate_with_fallback(prompt)

    def extract_sample_params(self, text):
        prompt = f"""
        Extract statistical parameters (Effect Size) for sample size calculation.
        Output strictly JSON: {{ "suggested_effect_size": 0.5, "reasoning": "string" }}
        Abstracts: {text[:5000]}
        """
        response_text = self._generate_with_fallback(prompt)
        return self._clean_json(response_text, default='{"suggested_effect_size": 0.5, "reasoning": "Default due to error"}')

    def _clean_json(self, text, default="{}"):
        try:
            cleaned = text.replace("```json", "").replace("```", "").strip()
            if not cleaned.startswith("{"):
                 start = cleaned.find("{")
                 end = cleaned.rfind("}") + 1
                 if start != -1 and end != -1:
                     cleaned = cleaned[start:end]
            # تست معتبر بودن JSON
            json.loads(cleaned)
            return cleaned
        except:
            print(f"JSON Parse Error. Raw text: {text[:100]}...")
            # ساخت یک JSON مصنوعی تا برنامه کرش نکند
            return json.dumps({
                "gaps": [{"topic": "Error parsing AI response", "description": "Please try again.", "significance": "N/A"}],
                "summary": "Could not generate summary.",
                "methodologySuggestions": "N/A"
            })