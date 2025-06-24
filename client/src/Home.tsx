import { createSignal, For } from "solid-js";
import { llt_chunked } from "./pkg/wasm"; // Make sure this is exported from your WASM

export default function PrimeHackApp() {
  const [status, setStatus] = createSignal("Idle");
  const [found, setFound] = createSignal<string[]>([]);
  const [running, setRunning] = createSignal(false);
  const [progress, setProgress] = createSignal(0);

  const generateAndSubmit = async () => {
    while (running()) {
      setStatus("Fetching chunk...");

      try {
        const res = await fetch("/api/get-task");
        const text = await res.text();
        const task = JSON.parse(text);

        console.log("Parsed task:", task);
        setStatus(
          `Running LLT iterations ${task.start_iter} to ${task.end_iter}...`
        );

        let residue = "error";
        try {
          residue = llt_chunked(
            BigInt(task.start_iter),
            BigInt(task.end_iter),
            task.current_residue,
            task.prime_exponent.toString()
          );
          console.log("llt_chunked result:", residue);
        } catch (err) {
          console.error("🔥 WASM crashed:", err);
          setStatus("Error in WASM computation");
          stop();
          return;
        }

        // Update progress
        const percent = (task.end_iter / (task.prime_exponent - 2)) * 100;
        setProgress(percent);

        setStatus(`Submitting residue for iter ${task.end_iter}...`);
        await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: task.start_iter,
            end: task.end_iter,
            residue,
          }),
        });

        setFound((prev) => [residue, ...prev].slice(0, 100));
        setStatus("Waiting for next task...");
        await new Promise((r) => setTimeout(r, 100));
      } catch (err) {
        console.error("Error fetching or processing task:", err);
        setStatus("Failed to fetch task");
        stop();
        return;
      }
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

      {/* Progress bar */}
      <div class="w-full bg-gray-700 rounded h-4 mb-4 overflow-hidden">
        <div
          class="bg-green-500 h-full transition-all duration-300"
          style={{ width: `${progress()}%` }}
        ></div>
      </div>

      <p class="text-gray-400 mb-4">{status()}</p>

      <div class="bg-[#111] p-4 rounded h-64 overflow-y-scroll text-green-400 font-mono text-xs">
        <For each={found()}>{(res) => <div>Residue: {res}</div>}</For>
      </div>
    </div>
  );
}
