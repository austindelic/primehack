#![no_std]

extern crate alloc;

use alloc::string::{String, ToString};
use core::str::FromStr;
use num_bigint::BigUint;
use num_prime::{
    PrimalityTestConfig,
    nt_funcs::{is_prime, is_prime64},
};
use num_traits::ToPrimitive;
use num_traits::{One, Zero};
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

#[wasm_bindgen]
pub fn is_power_prime(p: &str) -> bool {
    let power = match BigUint::from_str(p) {
        Ok(v) => v,
        Err(_) => return false,
    };
    lucas_lehmer_test(&power)
}

pub fn lucas_lehmer_test(power: &BigUint) -> bool {
    if power <= &BigUint::from(1u32) {
        return false;
    }
    if power == &BigUint::from(2u32) {
        return true;
    }

    let mersenne = pow(&BigUint::from(2u32), power) - BigUint::one();
    let mut sum = BigUint::from(4u32);

    let mut i = BigUint::zero();
    while i < power - &BigUint::from(2u32) {
        sum = (sum.clone() * sum.clone() - BigUint::from(2u32)) % &mersenne;
        i += BigUint::one();
    }

    sum == BigUint::zero()
}

pub fn pow(base: &BigUint, exp: &BigUint) -> BigUint {
    // Modular exponentiation
    let mut result = BigUint::one();
    let mut current_base = base.clone();

    let zero = BigUint::zero();
    let one = BigUint::one();

    let two = BigUint::from(2u32);

    let mut power = exp.clone();

    while power > zero {
        if &power % &two == one {
            result = &result * &current_base;
        }

        let shifted_power: BigUint = &power >> 1;
        power = shifted_power.clone();
        current_base = &current_base * &current_base;
    }

    result
}

#[wasm_bindgen]
pub fn pow_front(b: &str, e: &str) -> String {
    let base = match BigUint::from_str(b) {
        Ok(v) => v,
        Err(_) => return String::from("error"),
    };
    let exp = match BigUint::from_str(e) {
        Ok(v) => v,
        Err(_) => return String::from("error"),
    };

    let mut result = BigUint::one();
    let mut current_base = base;
    let mut power = exp;
    let two = BigUint::from(2u32);

    while power > BigUint::zero() {
        if &power % &two == BigUint::one() {
            result *= &current_base;
        }
        power >>= 1;
        current_base *= current_base.clone();
    }

    result.to_string()
}
