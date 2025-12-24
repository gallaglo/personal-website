export default function Home() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="text-3xl font-bold mb-6">About Me</h1>

      <div className="space-y-4 text-gray-700 leading-relaxed">
        <p>
          Hi, I&apos;m Logan Gallagher, a software developer and trainer based in Portland, OR.
        </p>

        <p>
          I&apos;m passionate about building quality software and helping others develop their
          technical skills. This is where I share my thoughts, projects, and experiences in
          software development and training.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">What I Do</h2>
        <p>
          As a software developer and trainer, I work on building robust applications and
          teaching others the craft of software development. I believe in writing clean,
          maintainable code and sharing knowledge with the community.
        </p>

        <h2 className="text-xl font-semibold mt-8 mb-4 text-gray-900">Connect</h2>
        <p>
          You can find me on{" "}
          <a href="https://github.com/gallaglo" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>{" "}
          or{" "}
          <a href="mailto:hello@logangallagher.com" className="text-blue-600 hover:underline">email me</a>.
        </p>
      </div>
    </div>
  );
}
