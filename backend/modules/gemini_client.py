import google.generativeai as genai
import os
import json

class GeminiClient:
    def __init__(self, api_key):
        if not api_key:
            raise ValueError("API Key is required")
        genai.configure(api_key=api_key)
        # مدل فلش بهترین گزینه برای سرعت و دقت در نسخه رایگان است
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def analyze_gap(self, text, language="en"):
        prompt = f"""
        Analyze these abstracts and find research gaps.
        Output strictly JSON: {{ "gaps": [{{"topic": "string", "description": "string", "significance": "string"}}], "summary": "string", "methodologySuggestions": "string" }}
        Language: {language}
        Abstracts: {text[:10000]}
        """
        return self._safe_generate(prompt)

    def generate_proposal(self, topic, papers_text, structure, language="fa"):
        # --- قالب استخراج شده از فایل PDF دانشگاه آزاد مشهد ---
        university_template = """
        الزامات فرمت پروپوزال (دقیقاً طبق این ساختار بنویس):
        
        1. **عنوان تحقیق (Title)**:
           - عنوان فارسی و انگلیسی دقیق.
        
        2. **بیان مسئله (Problem Statement)**:
           - تشریح ابعاد مسئله و پاتوفیزیولوژی (مکانیزم بیماری/مشکل).
           - آمارهای جهانی و آمارهای ایران (با استناد به مقالات ورودی).
           - بیان جنبه‌های مبهم و ضرورت انجام کار (Gap Analysis).
        
        3. **مرور بر مطالعات انجام شده (Literature Review)**:
           - حداقل ۳ مطالعه مرتبط را بررسی کن.
           - فرمت هر مورد: "نام محقق و همکاران در سال (Year) مطالعه‌ای در (Location) انجام دادند. هدف ... بود و نتایج نشان داد که ..."
        
        4. **اهداف و فرضیات**:
           - هدف کلی طرح.
           - اهداف اختصاصی (ریز به ریز و شماره‌گذاری شده).
           - فرضیات یا سوالات تحقیق (متناسب با اهداف).
        
        5. **روش اجرای طرح (Methodology)**:
           - نوع مطالعه (مثلاً مقطعی/توصیفی).
           - جامعه پژوهش، معیارهای ورود (Inclusion) و خروج (Exclusion).
           - حجم نمونه پیشنهادی و روش نمونه‌گیری.
           - ابزار جمع‌آوری اطلاعات (چک‌لیست، پرونده‌خوانی و...).
           - متغیرهای پژوهش (نام، نوع، نقش).
           - روش تجزیه و تحلیل آماری (نام نرم‌افزار مثل SPSS و آزمون‌ها).
        
        6. **ملاحظات اخلاقی**:
           - محرمانگی اطلاعات، عدم تحمیل هزینه، رضایت آگاهانه (یا عدم نیاز به آن در مطالعات پرونده‌ای).
        
        7. **منابع (References)**:
           - لیست منابع به سبک ونکوور (Vancouver Style).
        """

        prompt = f"""
        Act as a medical researcher submitting a thesis proposal to Islamic Azad University of Mashhad.
        
        **Research Topic:** {topic}
        
        **Task:** Write a full research proposal using the "Context Papers" below and following the "University Template" strictly.
        
        **Context Papers:**
        {papers_text[:15000]}
        
        **Template:**
        {university_template}
        
        **Language:** Persian (Farsi). Tone: Academic and Formal.
        **Output:** ONLY the proposal text.
        """
        
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating proposal: {str(e)}"

    def extract_sample_params(self, text):
        prompt = f"""
        Extract statistical parameters (Effect Size) for sample size calculation.
        Output strictly JSON: {{ "suggested_effect_size": 0.5, "reasoning": "string" }}
        Abstracts: {text[:5000]}
        """
        return self._safe_generate(prompt, default='{"suggested_effect_size": 0.5, "reasoning": "Default"}')

    def _safe_generate(self, prompt, default="{}"):
        try:
            response = self.model.generate_content(prompt)
            cleaned = response.text.replace("```json", "").replace("```", "").strip()
            if not cleaned.startswith("{"):
                 start = cleaned.find("{")
                 end = cleaned.rfind("}") + 1
                 if start != -1 and end != -1:
                     cleaned = cleaned[start:end]
            json.loads(cleaned)
            return cleaned
        except Exception as e:
            return default