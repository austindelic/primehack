#!/bin/bash
set -e

cd /var/www/primehack

echo "📥 Pulling latest changes..."
git pull origin master

echo "🔨 Building WASM..."
cd wasm && wasm-pack build --target web && cd ..

echo "🧱 Building frontend..."
cd client && npm install && npm run build && cd ..

echo "🚀 Restarting backend..."
cd server && npm install
pm2 restart prime-server || pm2 start index.js --name prime-server

echo "✅ Deployment complete!"