#!/usr/bin/env bash

# ==============================================================================
# Seamless Auto-Updater Script for Dell PowerEdge R720 & Linux Servers
# تحديث المنظومة بنقرة واحدة بدون أي توقف
# ==============================================================================

set -e

echo "========================================================"
echo "🔄 جاري سحب وتطبيق آخر تحديثات نظام حضورك الذكي من GitHub..."
echo "========================================================"

# 1. Pull latest code from remote git repository
if [ -d .git ]; then
    echo "📥 جاري سحب آخر التعديلات عبر Git..."
    git pull origin main || git pull
else
    echo "⚠️ لم يتم العثور على مجلد Git، سيتم إعادة بناء الحاوية الحالية مباشرة..."
fi

# 2. Rebuild and restart docker container seamlessly
echo "🔨 جاري إعادة بناء الحاوية بنسخة الإنتاج النظيفة..."
if docker compose version &> /dev/null; then
    docker compose up --build -d --remove-orphans
else
    docker-compose up --build -d --remove-orphans
fi

# 3. Clean unused dangling images to preserve server disk space on Dell R720
echo "🧹 تنظيف مخلفات الصور المؤقتة لتوفير مساحة التخزين على السيرفر..."
docker image prune -f > /dev/null 2>&1 || true

echo "========================================================"
echo "✅ تم تطبيق التحديث بنجاح وأصبح النظام يعمل بآخر إصدار!"
echo "🌐 الرابط: http://$(hostname -I | awk '{print $1}')"
echo "========================================================"
