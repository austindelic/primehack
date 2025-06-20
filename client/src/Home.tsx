import { createSignal, onCleanup, type Component, For } from "solid-js";
import { is_prime } from "./pkg/wasm";

type Item = { value: bigint; prime: boolean };

const Home: Component = () => {
  const [n, setN] = createSignal<bigint>(0n);
  const [items, setItems] = createSignal<Item[]>([]); // every number, newest first

  const timer = setInterval(() => {
    const next = n() + 1n;
    setN(next);

    const prime = is_prime(next);
    // prepend so the list scrolls downward
    setItems((list) => [{ value: next, prime }, ...list].slice(0, 10)); // keep last 2 000
  }); // adjust speed to taste

  onCleanup(() => clearInterval(timer));

  return (
    <main style={{ padding: "1rem", "font-family": "monospace" }}>
      <h1>Prime stream</h1>
      <p>Testing n = {n().toString()}</p>

      <ul style={{ "list-style": "none", padding: 0 }}>
        <For each={items()}>
          {(item) => (
            <li
              style={{
                color: item.prime ? "green" : "red",
                "white-space": "pre",
              }}
            >
              {item.value.toString()}
            </li>
          )}
        </For>
      </ul>
    </main>
  );
};

export default Home;
