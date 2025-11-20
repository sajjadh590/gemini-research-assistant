# Stage 1: Build React App
FROM node:18 as build-step
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup Python Backend
# تغییر نسخه به 3.10 برای حل مشکل کتابخانه‌های گوگل
FROM python:3.10-slim
WORKDIR /code

# نصب نیازمندی‌های سیستم (اختیاری ولی برای اطمینان)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY ./backend/requirements.txt /code/requirements.txt

# نصب پکیج‌های پایتون
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# کپی کد بک‌اند به داخل کانتینر
COPY ./backend /code/app

# کپی بیلد فرانت‌اند از مرحله اول به پوشه استاتیک پایتون
COPY --from=build-step /app/dist /code/app/static

# اجرای برنامه
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]