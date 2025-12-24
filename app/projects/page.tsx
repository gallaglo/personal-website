export default function Projects() {
  const projects = [
    {
      title: "Example Project",
      description: "A brief description of your project and what it does.",
      tech: ["TypeScript", "Next.js", "Tailwind CSS"],
      link: "#",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Projects</h1>

      <div className="space-y-8">
        {projects.map((project, index) => (
          <div key={index} className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-2">
              <a
                href={project.link}
                className="hover:text-gray-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.title}
              </a>
            </h2>
            <p className="text-gray-700 mb-3">{project.description}</p>
            <div className="flex gap-2 flex-wrap">
              {project.tech.map((tech, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-12 text-gray-500 text-sm">
        More projects coming soon...
      </p>
    </div>
  );
}
