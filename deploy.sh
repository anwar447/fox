#!/usr/bin/env bash

# ==============================================================================
# Setup & Deploy Script for Dell PowerEdge R720 (Ubuntu / Debian / CentOS / RHEL)
# نظام حضورك الذكي - منظومة الحضور والانصراف المدرسية بالسياج الجغرافي
# ==============================================================================

set -e

echo "========================================================"
echo "🚀 بدء تثبيت وتشغيل نظام حضورك الذكي على سيرفر Dell R720"
echo "========================================================"

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️ لم يتم العثور على Docker، جاري التثبيت التلقائي..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        rm -f get-docker.sh
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
fi

# 2. Check if Docker Compose is available
if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "⚠️ جاري تثبيت Docker Compose plugin..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get update && sudo apt-get install -y docker-compose-plugin
    fi
fi

# 3. Enable Docker Service
sudo systemctl enable docker || true
sudo systemctl start docker || true

# 4. Build and Launch Containers
echo "📦 جاري بناء وتشغيل الحاوية المخصصة للإنتاج..."
if docker compose version &> /dev/null; then
    docker compose down || true
    docker compose up --build -d
else
    docker-compose down || true
    docker-compose up --build -d
fi

echo "========================================================"
echo "✅ تم تشغيل المنظومة بنجاح على السيرفر!"
echo "🌐 يمكنك الآن الدخول للنظام عبر متصفح الويب من خلال IP السيرفر:"
echo "👉 http://$(hostname -I | awk '{print $1}')"
echo "========================================================"
