import { createSignal, For } from "solid-js";
import { prime_bigint } from "./pkg/wasm"; // wasm-pack must be loaded beforehand

export default function PrimeHackApp() {
  const [status, setStatus] = createSignal("Idle");
  const [found, setFound] = createSignal<bigint[]>([]);

  const generateAndSubmit = async () => {
    setStatus("Fetching range...");
    const res = await fetch("/api/range");
    const { start, end } = await res.json();

    const results: bigint[] = [];

    setStatus(`Testing numbers from ${start} to ${end}...`);

    for (let i = start; i <= end; i++) {
      const isPrime = prime_bigint(i.toString());
      if (isPrime) results.push(BigInt(i));
    }

    setStatus(`Submitting ${results.length} primes...`);
    await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ primes: results.map((n) => n.toString()) }),
    });

    setFound([...found(), ...results]);
    setStatus("Done.");
  };

  return (
    <div class="min-h-screen bg-black text-white p-6">
      <h1 class="text-3xl font-bold text-cyan-400 mb-4">PrimeHack</h1>
      <button
        class="bg-cyan-500 px-4 py-2 rounded font-bold mb-4"
        onClick={generateAndSubmit}
      >
        Get Range & Check Primes
      </button>

      <p class="text-gray-400 mb-4">{status()}</p>

      <div class="bg-[#111] p-4 rounded h-64 overflow-y-scroll text-green-400 font-mono">
        <For each={found()}>{(p) => <div>{p.toString()}</div>}</For>
      </div>
    </div>
  );
}
