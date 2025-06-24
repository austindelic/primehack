import { createSignal, For } from "solid-js";
import { pow_front } from "../pkg/wasm";
export default function Test() {
  const [status, setStatus] = createSignal("Idle");
  const [found, setFound] = createSignal<{ p: bigint; value: string }[]>([]);

  const [running, setRunning] = createSignal(false);

  const generate = async () => {
    let p = 100_000_000n;

    while (running()) {
      const value = BigInt(pow_front("2", p.toString())).toString();

      setStatus(`Generated 2^${p} - 1`);
      setFound((prev) => [{ p, value }, ...prev].slice(0, 100));
      p++;

      // Allow time for rendering
      await new Promise((r) => setTimeout(r, 1));
    }

    setStatus("Stopped.");
  };

  const start = () => {
    if (!running()) {
      setRunning(true);
      generate();
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

      <div class="bg-[#111] p-4 rounded h-64 overflow-y-scroll text-green-400 font-mono text-xs">
        <For each={found()}>
          {(item) => (
            <div>
              2^{item.p.toString()} - 1 = {item.value.length} digits
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
