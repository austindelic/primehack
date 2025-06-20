import { createSignal, onCleanup, type Component, For } from "solid-js";
import { prime_u64, prime_bigint } from "./pkg";

/** Route calls to the right Rust predicate */
function rustIsPrime(n: bigint): { prime: boolean; probable: boolean } {
  if (n <= 0x1_ffff_ffff_ffff_ffn) {
    return { prime: prime_u64(n), probable: false };
  }
  return { prime: prime_bigint(n.toString()), probable: true };
}

type Item = { value: bigint; probable: boolean };

const PrimeStream: Component = () => {
  const [p, setP] = createSignal<bigint>(1_000n); // current exponent
  const [n, setN] = createSignal<bigint>((1n << 256n) - 1n); // 2^p – 1 candidate
  const [primes, setPrimes] = createSignal<Item[]>([]); // newest first

  /** tick-loop: build 2^p − 1, check, bump exponent */
  const timer = setInterval(() => {
    const nextP = p() + 1n;
    const candidate = (1n << nextP) - 1n;

    setP(nextP);
    setN(candidate);

    const { prime, probable } = rustIsPrime(candidate);
    if (prime) {
      setPrimes((list) =>
        [{ value: candidate, probable }, ...list].slice(0, 10)
      );
    }
  }); // adjust interval (ms) to taste

  onCleanup(() => clearInterval(timer));

  // ───────────────────────── UI ─────────────────────────
  return (
    <main class="p-4 font-mono max-w-md mx-auto space-y-3">
      <h1 class="text-xl font-semibold">
        Scanning&nbsp;2<sup>p</sup> − 1
      </h1>

      <p class="break-all">
        Current&nbsp;
        <code>p</code>&nbsp;=&nbsp;{p().toString()},&nbsp;
        <code>n</code>&nbsp;=&nbsp;
        <span class="break-all">{n().toString()}</span>
      </p>

      <ul class="list-none p-0 space-y-0.5">
        <For each={primes()}>
          {(item) => (
            <li
              class={`font-bold ${
                item.probable ? "text-yellow-500" : "text-green-600"
              }`}
            >
              {item.value.toString()}
            </li>
          )}
        </For>
      </ul>

      <p class="text-xs text-slate-500">
        Green = proven prime (<code>is_prime_u64</code>); yellow = probably
        prime (<code>is_probable_prime</code>).
      </p>
    </main>
  );
};

export default PrimeStream;
