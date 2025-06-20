#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/var/www/primehack           # project root on the server TEST
FRONT_DIR="$APP_DIR/client"          # Solid/Vite code
WASM_CRATE="$APP_DIR/wasm"           # Rust → WebAssembly crate
SERVER_DIR="$APP_DIR/server"         # Axum backend
BIN_NAME=server                      # == package name in server/Cargo.toml
PORT=3000                            # change if you bind elsewhere

echo "➡️  Moving to project directory…"
cd "$APP_DIR"

echo "📥 Pulling latest changes from Git…"
git pull origin master

# ──────────────────────────────────────────────
echo "🔨 Re-building WebAssembly package…"
(
  cd "$WASM_CRATE"
  # Put the generated pkg inside the frontend *source* so Vite can pick it up
  wasm-pack build --release --target bundler \
                  --out-dir "$FRONT_DIR/src/pkg"
)

# ──────────────────────────────────────────────
echo "🧱 Building frontend (Vite)…"
(
  cd "$FRONT_DIR"
  pnpm install --frozen-lockfile --allow-scripts  # faster + deterministic
  pnpm run build                     # produces client/dist
)

# ──────────────────────────────────────────────
echo "⚙️  Building backend (Rust)…"
(
  cd "$SERVER_DIR"
  cargo build --release             # binary → target/release/$BIN_NAME
)

# ──────────────────────────────────────────────
echo "🚀 Restarting backend with PM2…"
pm2 restart "$BIN_NAME" \
  || pm2 start "$SERVER_DIR/target/release/$BIN_NAME" \
       --name "$BIN_NAME" --env production -- \
       --port "$PORT"

echo "✅ Deployment complete!"
