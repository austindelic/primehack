import { createSignal, For } from "solid-js";
import { prime_bigint } from "./pkg/wasm";

export default function PrimeHackApp() {
  const [status, setStatus] = createSignal("Idle");
  const [found, setFound] = createSignal<bigint[]>([]);
  const [running, setRunning] = createSignal(false);

  const generateAndSubmit = async () => {
    while (running()) {
      setStatus("Fetching range...");
      const res = await fetch("/api/get-task");
      const { start, end } = await res.json();

      const startBig = BigInt(start);
      const endBig = BigInt(end);
      const results: [string, boolean][] = [];

      setStatus(`Testing numbers from ${start} to ${end}...`);

      for (let i = startBig; i <= endBig; i++) {
        const isPrime = prime_bigint(i.toString());
        results.push([i.toString(), isPrime]);
      }

      const primesOnly = results
        .filter(([, isPrime]) => isPrime)
        .map(([n]) => BigInt(n));

      setStatus(`Submitting ${primesOnly.length} primes...`);

      await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });

      setFound((prev) => [...primesOnly, ...prev].slice(0, 100));

      setStatus("Waiting for next range...");
      await new Promise((r) => setTimeout(r, 100)); // small pause
    }
    setStatus("Stopped.");
  };

  const start = () => {
    if (!running()) {
      setRunning(true);
      generateAndSubmit();
    }
  };

  const stop = () => {
    setRunning(false);
  };

  return (
    <div class="min-h-screen bg-black text-white p-6">
      <h1 class="text-3xl font-bold text-cyan-400 mb-4">PrimeHack</h1>
      <div class="mb-4">
        <button
          class="bg-green-600 px-4 py-2 rounded font-bold mr-2"
          onClick={start}
        >
          Start
        </button>
        <button class="bg-red-600 px-4 py-2 rounded font-bold" onClick={stop}>
          Stop
        </button>
      </div>

      <p class="text-gray-400 mb-4">{status()}</p>

      <div class="bg-[#111] p-4 rounded h-64 overflow-y-scroll text-green-400 font-mono">
        <For each={found()}>{(p) => <div>{p.toString()}</div>}</For>
      </div>
    </div>
  );
}
