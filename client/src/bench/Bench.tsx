/* -------------------------------------------------------------------------
 * bench.tsx  –  Browser benchmark page for the WASM prime testers
 * ------------------------------------------------------------------------ */

import { Component, createSignal } from "solid-js";
import { prime_u64, prime_bigint } from "../pkg/wasm"; // adjust the path if needed

/* ───────────────────────── helpers ────────────────────────── */

function randBigInt(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  buf[0] |= 0b1000_0000; // keep it 'bits' wide
  let n = 0n;

  for (const b of buf) n = (n << 8n) | BigInt(b);
  return n;
}

function time<T>(fn: () => T): [number, T] {
  const t0 = performance.now();
  const r = fn();
  return [performance.now() - t0, r];
}

/* ───────────────────────── page component ────────────────────────── */

const Bench: Component = () => {
  /* UI state */
  const [running, setRunning] = createSignal(false);
  const [samples, setSamples] = createSignal(5_000); // default
  const [bits, setBits] = createSignal(256); // default

  const [u64Avg, setU64Avg] = createSignal<number | null>(null);
  const [bigAvg, setBigAvg] = createSignal<number | null>(null);
  const [log, setLog] = createSignal<string[]>([]);

  /* core benchmark */
  async function runBench() {
    setRunning(true);
    setLog([]);
    const s = samples();
    const b = bits();

    /* — 64-bit deterministic test — */
    let total = 0;
    for (let i = 0; i < s; i++) {
      const n = randBigInt(64);
      const [dt] = time(() => prime_u64(n));
      total += dt;
      if (i % 500 === 0) await Promise.resolve(); // yield to UI
    }
    const avg64 = total / s;
    setU64Avg(avg64);
    setLog((l) => [
      ...l,
      `prime_u64 × ${s.toLocaleString()} → ${avg64.toFixed(4)} ms/op`,
    ]);

    /* — big-int probable-prime test — */
    total = 0;
    for (let i = 0; i < s; i++) {
      const n = randBigInt(b);
      const [dt] = time(() => prime_bigint(n.toString()));
      total += dt;
      if (i % 250 === 0) await Promise.resolve(); // yield
    }
    const avgbig = total / s;
    setBigAvg(avgbig);
    setLog((l) => [
      ...l,
      `prime_bigint(${b}-bit) × ${s.toLocaleString()} → ${avgbig.toFixed(
        4
      )} ms/op`,
    ]);

    setRunning(false);
  }

  /* ────────────────  UI  ──────────────── */
  return (
    <main class="max-w-lg mx-auto p-6 space-y-4 font-mono">
      <h1 class="text-2xl font-bold">WASM Primality Benchmarks</h1>

      <div class="flex flex-wrap gap-4 items-end">
        <label class="flex flex-col">
          <span class="text-sm">Samples / test</span>
          <input
            type="number"
            min="1"
            step="100"
            class="border rounded px-2 py-1 w-28"
            value={samples()}
            onInput={(e) => setSamples(e.currentTarget.valueAsNumber || 1)}
          />
        </label>

        <label class="flex flex-col">
          <span class="text-sm">Big-int width (bits)</span>
          <input
            type="number"
            min="65"
            step="64"
            class="border rounded px-2 py-1 w-28"
            value={bits()}
            onInput={(e) => setBits(e.currentTarget.valueAsNumber || 65)}
          />
        </label>

        <button
          class={`px-4 py-1 rounded bg-blue-600 text-white disabled:opacity-40`}
          disabled={running()}
          onClick={runBench}
        >
          {running() ? "Running…" : "Run"}
        </button>
      </div>

      <section class="space-y-1">
        {u64Avg() !== null && (
          <p>
            <strong>u64:</strong> {u64Avg()!.toFixed(4)} ms/op
          </p>
        )}
        {bigAvg() !== null && (
          <p>
            <strong>{bits()}-bit:</strong> {bigAvg()!.toFixed(4)} ms/op
          </p>
        )}
      </section>

      <pre class="bg-slate-100 p-3 rounded text-sm leading-5 overflow-auto">
        {log().join("\n")}
      </pre>
    </main>
  );
};

export default Bench;
