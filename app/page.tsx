"use client";

import dynamic from "next/dynamic";

// Local-first: game state lives in localStorage, so render client-side only.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
