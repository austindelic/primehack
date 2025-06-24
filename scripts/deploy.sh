#!/usr/bin/env bash

set -euxo pipefail
trap 'echo "❌ Deployment failed on line $LINENO"' ERR

APP_DIR=/var/www/primehack           # project root on the server
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
  wasm-pack build --release --target bundler \
                  --out-dir "$FRONT_DIR/src/pkg"
)

# ──────────────────────────────────────────────
echo "🧱 Building frontend (Vite)…"
(
  cd "$FRONT_DIR"

  export PNPM_CHILD_CONCURRENCY=2
  export PNPM_CONFIG_NETWORK_CONCURRENCY=2
  export NODE_OPTIONS="--max_old_space_size=256"

  pnpm install --reporter=silent

  echo "🚧 Running Vite build..."
  pnpm run build

)
# ─────────────────────────────────── ──────────
echo "⚙️  Building backend (Rust)…"
(
  cd "$SERVER_DIR"

  export CARGO_BUILD_JOBS=1
  export RUSTFLAGS="-C codegen-units=1"

  cargo build --release
)

# ──────────────────────────────────────────────
echo "🚀 Restarting backend with PM2…"
pm2 restart "$BIN_NAME" \
  || pm2 start "$SERVER_DIR/target/release/$BIN_NAME" \
       --name "$BIN_NAME" --env production -- \
       --port "$PORT"

echo "✅ Deployment complete!"
exit 0
