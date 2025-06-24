use axum::{
    Router,
    extract::Json,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
};
use tokio::net::TcpListener;
use tower_http::services::{ServeDir, ServeFile};

const DIST: &str = "/var/www/primehack/client/dist";
const PRIME_EXPONENT: u64 = 89259833;
const TASK_SIZE: u64 = 1000;

type SharedIteration = Arc<Mutex<u64>>;
type SharedResidues = Arc<Mutex<BTreeMap<u64, String>>>;

#[derive(Serialize)]
struct IterationTask {
    start_iter: u64,
    end_iter: u64,
    current_residue: String,
    prime_exponent: u64,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
struct IterationResult {
    start: u64,
    end: u64,
    residue: String,
}

#[tokio::main]
async fn main() {
    let counter = Arc::new(Mutex::new(0u64));
    let residues = Arc::new(Mutex::new(BTreeMap::new()));
    residues.lock().unwrap().insert(0, "4".to_string());

    let api_router = Router::new()
        .route(
            "/get-task",
            get({
                let c = counter.clone();
                let r = residues.clone();
                move || get_iteration_task(c.clone(), r.clone())
            }),
        )
        .route(
            "/submit",
            post({
                let r = residues.clone();
                move |payload| submit_result(r.clone(), payload)
            }),
        );

    let app = Router::new().nest("/api", api_router).fallback_service(
        ServeDir::new(DIST).not_found_service(ServeFile::new(format!("{}/index.html", DIST))),
    );

    let addr = SocketAddr::from(([0, 0, 0, 0], 3000));
    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service())
        .await
        .unwrap();
}

async fn get_iteration_task(
    counter: SharedIteration,
    residues: SharedResidues,
) -> impl IntoResponse {
    let mut current = counter.lock().unwrap();
    let start = *current;
    let end = (start + TASK_SIZE).min(PRIME_EXPONENT - 2);
    *current = end;

    let residues_guard = residues.lock().unwrap();
    let residue = residues_guard
        .get(&start)
        .cloned()
        .unwrap_or("4".to_string());

    Json(IterationTask {
        start_iter: start,
        end_iter: end,
        prime_exponent: PRIME_EXPONENT,
        current_residue: residue,
    })
}

async fn submit_result(
    residues: SharedResidues,
    Json(data): Json<IterationResult>,
) -> impl IntoResponse {
    let mut residues_guard = residues.lock().unwrap();
    residues_guard.insert(data.end, data.residue);
    StatusCode::OK
}
