# مرحله ۱: ساخت فرانت‌اند (React) با استفاده از سرورهای Hugging Face
FROM node:18 as build-step
WORKDIR /app
COPY package*.json ./
# نصب پکیج‌های جاوااسکریپت (روی سرور انجام میشه)
RUN npm install
COPY . .
# ساخت نسخه نهایی سایت
RUN npm run build

# مرحله ۲: آماده‌سازی بک‌اند (Python)
FROM python:3.9
WORKDIR /code

# کپی کردن نیازمندی‌های پایتون
COPY ./backend/requirements.txt /code/requirements.txt

# نصب پکیج‌های پایتون (روی سرور انجام میشه)
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# کپی کردن کدهای پایتون
COPY ./backend /code/app

# کپی کردن سایت ساخته شده از مرحله ۱ به داخل پوشه پایتون
COPY --from=build-step /app/dist /code/app/static

# اجرای برنامه
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]