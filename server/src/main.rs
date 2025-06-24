use axum::{
    Router,
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use num_bigint::BigUint;
use num_traits::Zero;
use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    str::FromStr,
    sync::{Arc, Mutex},
};
use tokio::net::TcpListener;
use tower_http::services::{ServeDir, ServeFile};

type SharedCounter = Arc<Mutex<BigUint>>;
type SharedPrimes = Arc<Mutex<Vec<bool>>>;

#[derive(Serialize)]
struct Range {
    start: String,
    end: String,
}

#[derive(Deserialize, Debug)]
struct PrimeResult {
    results: Vec<(String, bool)>,
}

const DIST: &str = "/var/www/primehack/client/dist";

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(BigUint::zero()));
    let found_primes = Arc::new(Mutex::new(Vec::new()));

    let api_router = Router::new()
        .route(
            "/get-task",
            get({
                let c = counter.clone();
                move || get_range(c)
            }),
        )
        .route(
            "/submit",
            post({
                let primes = found_primes.clone();
                move |payload| receive_primes(primes.clone(), payload)
            }),
        )
        .route(
            "/get-primes",
            get({
                let primes = found_primes.clone();
                move || get_primes(primes.clone())
            }),
        )
        .route("/hello-world", get(hello_world));

    let app = Router::new().nest("/api", api_router).fallback_service(
        ServeDir::new(DIST).not_found_service(ServeFile::new(format!("{}/index.html", DIST))),
    );

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

async fn get_range(counter: SharedCounter) -> impl IntoResponse {
    let mut current = counter.lock().unwrap();
    let start = current.clone();

    // Estimate time per op based on bit length
    let bit_len = start.bits();
    let ops = if bit_len <= 64 {
        2_500_000u64 // u64
    } else if bit_len <= 256 {
        21_000u64 // 256-bit
    } else {
        // Slow zone: scale down range even more
        (3000.0 / (0.1408 * (bit_len as f64 / 256.0))).round() as u64
    };

    let end = &start + BigUint::from(ops);
    *current += BigUint::from(ops);

    Json(Range {
        start: start.to_string(),
        end: end.to_string(),
    })
}

async fn receive_primes(state: SharedPrimes, Json(data): Json<PrimeResult>) -> impl IntoResponse {
    let mut primes = state.lock().unwrap();
    for (num_str, is_prime) in data.results {
        if let Ok(big) = BigUint::from_str(&num_str) {
            if let Ok(idx) = usize::try_from(big) {
                if idx >= primes.len() {
                    primes.resize(idx + 1, false);
                }
                primes[idx] = is_prime;
            }
        }
    }
    println!("📬 Updated primes. Length: {}", primes.len());
    StatusCode::OK
}

async fn get_primes(state: SharedPrimes) -> impl IntoResponse {
    let primes = state.lock().unwrap();
    Json(primes.clone())
}

async fn hello_world() -> impl IntoResponse {
    Json("Hello, World!")
}
