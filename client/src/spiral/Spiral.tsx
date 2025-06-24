import { onMount } from "solid-js";
import { createSignal } from "solid-js";

export default function Spiral() {
  const [primes, setPrimes] = createSignal<bigint[]>([]);
  let canvasRef: HTMLCanvasElement | undefined;

  const SIZE = 512; // canvas width and height

  // Convert a number to (x, y) in a spiral
  function toSpiral(n: number): [number, number] {
    let x = 0,
      y = 0,
      dx = 0,
      dy = -1;
    for (let i = 0; i < n; i++) {
      if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
        [dx, dy] = [-dy, dx]; // change direction
      }
      x += dx;
      y += dy;
    }
    return [x, y];
  }

  const drawSpiral = () => {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, SIZE, SIZE);

    const primeSet = new Set(primes().map((n) => Number(n)));
    const center = SIZE / 2;

    for (let i = 0; i < 10000; i++) {
      const [x, y] = toSpiral(i);
      const px = center + x;
      const py = center + y;
      if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
        ctx.fillStyle = primeSet.has(i) ? "white" : "black";
        ctx.fillRect(px, py, 1, 1);
      }
    }
  };

  onMount(async () => {
    const res = await fetch("/api/get-primes");
    const { primes: raw } = await res.json();
    const bigs = raw.map((n: string) => BigInt(n));
    setPrimes(bigs);
    drawSpiral();
  });

  return (
    <div class="bg-black flex justify-center items-center h-screen">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        class="border border-white"
      />
    </div>
  );
}
