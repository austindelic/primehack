/* @refresh reload */
import "./index.css";
import { render } from "solid-js/web";

import Home from "./Home";
import Bench from "./bench/Bench";
import Spiral from "./spiral/Spiral";
import Test from "./test/Test";
import { Route, Router } from "@solidjs/router";

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/bench" component={Bench} />
      <Route path="/spiral" component={Spiral} />
      <Route path="/test" component={Test} />
    </Router>
  ),
  root!
);
