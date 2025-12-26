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
          I&apos;m passionate about building quality software and helping others develop their
          technical skills. This is where I share my thoughts, projects, and experiences in
          software development and training.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900 font-sans">What I Do</h2>
        <p>
          As a software developer and trainer, I work on building robust applications and
          teaching others the craft of software development. I believe in writing clean,
          maintainable code and sharing knowledge with the community.
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
