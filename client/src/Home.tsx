import { createSignal, onMount, type Component } from "solid-js";
import init, { is_prime } from "./pkg/wasm";

const Home: Component = () => {
  const [primeResult, setPrimeResult] = createSignal<boolean>();

  onMount(async () => {
    // one-time Wasm
    await init();
    setPrimeResult(is_prime(10n)); // safely call your Rust fn
  });

  return (
    <div>
      <h1>"Calculating…"</h1>
      <h1>
        {primeResult() === undefined
          ? "Calculating…"
          : primeResult()
          ? "Prime!"
          : "Not prime!"}
      </h1>
    </div>
  );
};

export default Home;
