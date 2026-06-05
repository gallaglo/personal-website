import type { Metadata } from "next";
import { SceneGenerator } from "@/components/scene-generator";

export const metadata: Metadata = {
  title: "Agent Playground — Logan Gallagher",
  description: "Interactive demos powered by AI agents",
};

export default function Playground() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 font-sans">Agent Playground</h1>
      <p className="text-gray-600 mb-10">
        Interactive demos powered by AI agents I&apos;m building and deploying.
      </p>

      <section>
        <h2 className="text-xl font-semibold mb-1 font-sans">
          Three.js Scene Generator
        </h2>
        <p className="text-gray-600 text-sm mb-6">
          Upload a photo, describe a scene in text, or both — the agent will
          generate a live interactive 3D scene rendered with Three.js r128.
        </p>

        <SceneGenerator />
      </section>
    </div>
  );
}
