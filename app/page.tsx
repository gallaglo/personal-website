import { Github, Linkedin } from "lucide-react";

export default function Home() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold mb-6 font-sans">About Me</h1>

      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Hi, I&apos;m Logan Gallagher, a software developer and trainer based in Portland, OR.
        </p>

        <p>
          I build cloud-based applications in Python, Go, and TypeScript, and teach others to do the same. 
          Beyond technical tutorials and project writeups, I write about how technology shapes society and share photography and art.
        </p>

        <div className="flex gap-4 mt-8">
          <a
            href="https://github.com/gallaglo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900 transition-colors"
            aria-label="GitHub"
          >
            <Github size={24} />
          </a>
          <a
            href="https://www.linkedin.com/in/logan-gallagher-9ba44895/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900 transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin size={24} />
          </a>
        </div>
      </div>
    </div>
  );
}
