use axum::{
    Router,
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};

use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::net::TcpListener;
use tower_http::services::ServeDir;

// === Shared number range tracker ===
type SharedCounter = Arc<Mutex<u64>>;

#[derive(Serialize)]
struct Range {
    start: u64,
    end: u64,
}

#[derive(Deserialize)]
struct PrimeResult {
    primes: Vec<u64>,
}

const DIST: &str = "/var/www/primehack/client/dist";

#[tokio::main]
async fn main() {
    // Start counter at 1,000,000
    let counter = Arc::new(Mutex::new(1_000_000u64));
    let api_router = Router::new()
        .route(
            "/range",
            get({
                let c = counter.clone();
                move || get_range(c)
            }),
        )
        .route("/submit", post(receive_primes))
        // static files afterwards
        .route("/submit", post(receive_primes));
    // Build the app

    let app = Router::new()
        .nest("/api", api_router)
        // Serve static files for all other routes (SPA)
        .fallback_service(ServeDir::new(DIST));

    // Start the server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = TcpListener::bind(addr).await.unwrap();
    println!("🚀 Server running at http://{}", addr);

    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

// === API Handlers ===

async fn get_range(counter: SharedCounter) -> impl IntoResponse {
    let mut current = counter.lock().unwrap();
    let range = Range {
        start: *current,
        end: *current + 100,
    };
    *current += 101;
    Json(range)
}

async fn receive_primes(Json(data): Json<PrimeResult>) -> impl IntoResponse {
    println!("📬 Received primes: {:?}", data.primes);
    StatusCode::OK
}
