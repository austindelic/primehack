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
use tower_http::services::{ServeDir, ServeFile};

const DIST: &str = "/var/www/primehack/client/dist";
const PRIME_EXPONENT: u64 = 89259833;
const TASK_SIZE: u64 = 1000;

type SharedIteration = Arc<Mutex<u64>>;
type SharedResults = Arc<Mutex<Vec<IterationResult>>>;

#[derive(Serialize)]
struct IterationTask {
    start_iter: u64,
    end_iter: u64,
    current_residue: String, // As decimal string
    prime_exponent: u64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct IterationResult {
    start: u64,
    end: u64,
    residue: String,
}

#[derive(Serialize)]
struct Status {
    current_iteration: u64,
    total_results: usize,
}

#[tokio::main]
async fn main() {
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
        .route(
            "/reset",
            post({
                let c = counter.clone();
                let r = results.clone();
                move || reset_state(c.clone(), r.clone())
            }),
        )
        .route(
            "/status",
            get({
                let c = counter.clone();
                let r = results.clone();
                move || get_status(c.clone(), r.clone())
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
    let end = (start + TASK_SIZE).min(PRIME_EXPONENT - 2);
    *current = end;

    let current_residue = if start == 0 {
        "4".to_string() // Initial residue
    } else {
        // TODO: Fetch last submitted residue (append a residue chain to SharedResults)
        "MISSING_PREV".to_string()
    };

    Json(IterationTask {
        start_iter: start,
        end_iter: end,
        current_residue,
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

async fn reset_state(counter: SharedIteration, results: SharedResults) -> impl IntoResponse {
    *counter.lock().unwrap() = 0;
    results.lock().unwrap().clear();
    StatusCode::OK
}

async fn get_status(counter: SharedIteration, results: SharedResults) -> impl IntoResponse {
    let current = *counter.lock().unwrap();
    let total = results.lock().unwrap().len();
    Json(Status {
        current_iteration: current,
        total_results: total,
    })
}

async fn hello_world() -> impl IntoResponse {
    Json("Hello, World!")
}
