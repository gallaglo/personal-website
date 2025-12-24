export default function Projects() {
  const projects = [
    {
      title: "Personal Website",
      description: "This website! A minimal personal site built with Next.js, TypeScript, and Tailwind CSS. Deployed on Google Cloud Run.",
      tech: ["Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "Docker", "Cloud Run"],
      link: "https://github.com/gallaglo/personal-website",
    },
    {
      title: "Whereami",
      description: "A containerized application that displays environmental details about its cloud runtime environment. Designed for deployment on Google Cloud Platform services like Cloud Run or GKE.",
      tech: ["Python", "Gemini AI", "Flask", "Docker", "GCP", "LangChain"],
      link: "https://github.com/gallaglo/whereami",
    },
    {
      title: "GCP Demos, Notes & Tricks",
      description: "Hands-on learning materials and production-ready blueprints for Google Cloud Platform.",
      tech: ["TypeScript", "Python", "Terraform", "GCP", "Kubernetes"],
      link: "https://github.com/gallaglo/gcp-demos-notes-and-tricks",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Projects</h1>

      <h2 className="text-xl font-semibold mb-6 text-gray-700">Code</h2>

      <div className="space-y-8">
        {projects.map((project, index) => (
          <div key={index} className="border-b border-gray-200 pb-6">
            <h3 className="text-xl font-semibold mb-2">
              <a
                href={project.link}
                className="text-blue-600 hover:text-blue-800 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {project.title}
              </a>
            </h3>
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

      <p className="mt-12 text-gray-600">
        More projects coming soon, including art, photography, and agentic AI projects.
      </p>
    </div>
  );
}
