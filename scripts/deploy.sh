#!/usr/bin/env bash
set -euo pipefail

### ─── CONFIG ───────────────────────────────────────────────
APP_DIR=/var/www/primehack
FRONT_DIR="$APP_DIR/client"
WASM_CRATE="$APP_DIR/wasm"
SERVER_DIR="$APP_DIR/server"
BIN_NAME=server
PORT=3000
TEST_URL="http://localhost:$PORT"

# Routes to smoke-test
ROUTES=(
  "/"
  "/bench"
  "/saigfdhasdidjfhajhsfbasjhfb"
  "/api/range"
)

### ─── PREPARE ──────────────────────────────────────────────
cd "$APP_DIR"
# remember the commit we started from
PREV_HEAD=$(git rev-parse HEAD)
# timestamp for tagging
TS=$(date +%Y%m%d%H%M)

echo "➡️  Pulling latest changes…"
git pull origin master

### ─── BUILD WASM ───────────────────────────────────────────
echo "🔨  Building WASM…"
(
  cd "$WASM_CRATE"
  wasm-pack build --release --target bundler \
                  --out-dir "$FRONT_DIR/src/pkg"
)

### ─── BUILD FRONTEND ───────────────────────────────────────
echo "🧱  Building frontend…"
(
  export PNPM_CHILD_CONCURRENCY=2
  export PNPM_CONFIG_NETWORK_CONCURRENCY=2
  export NODE_OPTIONS="--max_old_space_size=256"

  cd "$FRONT_DIR"
  pnpm install --frozen-lockfile --reporter=silent
  pnpm run build
)

### ─── BUILD BACKEND ────────────────────────────────────────
echo "⚙️   Building backend…"
(
  cd "$SERVER_DIR"
  export CARGO_BUILD_JOBS=1
  export RUSTFLAGS="-C codegen-units=1"
  cargo build --release
)

### ─── DEPLOY ───────────────────────────────────────────────
echo "🚀  Deploying with PM2…"
pm2 restart "$BIN_NAME" \
  || pm2 start "$SERVER_DIR/target/release/$BIN_NAME" \
       --name "$BIN_NAME" --env production -- --port "$PORT"

# give it a moment
sleep 5

### ─── SMOKE-TEST ────────────────────────────────────────────
for route in "${ROUTES[@]}"; do
  echo "🔍  Testing $route …"
  if ! curl --silent --fail "$TEST_URL$route"; then
    echo "❌  Test failed on $route"
    ERROR_TAG="error-$TS-$(git rev-parse --short HEAD)"
    git tag -a "$ERROR_TAG" -m "Deploy error at $TS on $(git rev-parse --short HEAD)"
    git push origin "$ERROR_TAG"
    echo "↩️  Rolling back to $PREV_HEAD"
    git reset --hard "$PREV_HEAD"

    echo "🔨  Re-building backend (rollback)…"
    (
      cd "$SERVER_DIR"
      cargo build --release
    )
    echo "🚀  Restarting backend (rollback)…"
    pm2 restart "$BIN_NAME"

    echo "⚠️  Deployment failed. Rolled back. (error tag: $ERROR_TAG)"
    exit 1
  fi
done

### ─── MARK STABLE & FINISH ─────────────────────────────────
STABLE_TAG="stable-$TS-$(git rev-parse --short HEAD)"
git tag -a "$STABLE_TAG" -m "Stable deploy at $TS on $(git rev-parse --short HEAD)"
git push origin "$STABLE_TAG"

# move the `stable` branch pointer
git branch -f stable HEAD
git push -f origin stable

echo "✅  Deployment succeeded! (stable tag: $STABLE_TAG)"
exit 0
