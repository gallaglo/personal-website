import type { Metadata } from "next";
import { PlaygroundChat } from "@/components/playground-chat";

export const metadata: Metadata = {
  title: "Agent Playground — Logan Gallagher",
  description: "Interactive demos powered by AI agents",
};

export default function Playground() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-1 font-sans">Agent Playground</h1>
      <p className="text-gray-600 text-sm mb-6">
        Describe a scene or upload a photo — the agent generates a live 3D animation.
      </p>
      <PlaygroundChat />
    </div>
  );
}
