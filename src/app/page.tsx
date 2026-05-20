"use client";

import dynamic from "next/dynamic";

// Force Next.js to ignore this component during server pre-rendering
const SimulationWorkspace = dynamic(
  () => import("@/scripts/simulationWorkspace"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex w-screen h-screen flex-col items-center justify-between bg-black">
      <SimulationWorkspace />
    </main>
  );
}