#![no_std]

use core::str::FromStr;

use num_bigint::BigUint;
use num_prime::{
    PrimalityTestConfig,
    nt_funcs::{is_prime, is_prime64},
};
use num_traits::ToPrimitive;
use wasm_bindgen::prelude::*;

/// Fast, *deterministic* primality check for any `u64`.
#[wasm_bindgen]
pub fn prime_u64(n: u64) -> bool {
    is_prime64(n)
}

/// Convenience wrapper for big integers.
///
/// JavaScript passes a big-endian byte array; Rust re-assembles it,
/// runs Baillie-PSW, and returns the boolean result.
#[wasm_bindgen]
pub fn prime_bigint(s_number: &str) -> bool {
    let n = match BigUint::from_str(s_number) {
        Ok(v) => v,
        Err(_) => return false,
    };

    // If n fits in u64, use the fast deterministic check
    if let Some(n_u64) = n.to_u64() {
        return is_prime64(n_u64);
    }

    let cfg = Some(PrimalityTestConfig::bpsw());
    is_prime(&n, cfg).probably() // `Primality::probably()` → bool
}
