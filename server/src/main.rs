use axum::{
    Router,
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::{
    fs::File,
    io::Write,
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::net::TcpListener;
use tower_http::services::{ServeDir, ServeFile};

const DIST: &str = "/var/www/primehack/client/dist";
const PRIME_EXPONENT: u64 = 89259833;
const TASK_SIZE: u64 = 1000;

type SharedIteration = Arc<Mutex<u64>>;
type SharedResults = Arc<Mutex<Vec<IterationResult>>>;

#[derive(Serialize)]
struct IterationTask {
    iteration_start: u64,
    iteration_end: u64,
    prime_exponent: u64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct IterationResult {
    start: u64,
    end: u64,
    status: String,
}

#[tokio::main]
async fn main() {
    // Write largest known prime representation to a file
    let mut file = File::create("largest_prime.txt").expect("Failed to create file");
    let message = format!(
        "The current largest known prime is 2^{} - 1\n",
        PRIME_EXPONENT
    );
    file.write_all(message.as_bytes())
        .expect("Failed to write to file");

    let counter = Arc::new(Mutex::new(0u64));
    let results = Arc::new(Mutex::new(Vec::new()));

    let api_router = Router::new()
        .route(
            "/get-task",
            get({
                let c = counter.clone();
                move || get_iteration_task(c)
            }),
        )
        .route(
            "/submit",
            post({
                let r = results.clone();
                move |payload| submit_result(r.clone(), payload)
            }),
        )
        .route(
            "/results",
            get({
                let r = results.clone();
                move || get_all_results(r.clone())
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

async fn get_iteration_task(counter: SharedIteration) -> impl IntoResponse {
    let mut current = counter.lock().unwrap();
    let start = *current;
    let end = start + TASK_SIZE;
    *current += TASK_SIZE;

    Json(IterationTask {
        iteration_start: start,
        iteration_end: end,
        prime_exponent: PRIME_EXPONENT,
    })
}

async fn submit_result(
    state: SharedResults,
    Json(data): Json<IterationResult>,
) -> impl IntoResponse {
    let mut results = state.lock().unwrap();
    results.push(data);
    StatusCode::OK
}

async fn get_all_results(state: SharedResults) -> impl IntoResponse {
    let results = state.lock().unwrap();
    Json(results.clone())
}

async fn hello_world() -> impl IntoResponse {
    Json("Hello, World!")
}
