export default function Blog() {
  const posts = [
    {
      title: "Building a Contact Form with the Gmail API and OAuth2",
      date: "2024-12-25",
      slug: "gmail-api-contact-form",
      excerpt: "Learn how to implement a contact form using the official Gmail API with OAuth2 authentication - a production-ready solution without third-party email services.",
    },
    {
      title: "Deploying to Cloud Run with GitHub Actions and Workload Identity Federation",
      date: "2024-12-25",
      slug: "github-actions-cloud-run",
      excerpt: "Learn how to set up a secure CI/CD pipeline that builds Docker containers, pushes them to Google Artifact Registry, and deploys to Cloud Run with automatic preview URLs for every branch.",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 font-sans">Blog</h1>

      <div className="space-y-8">
        {posts.map((post, index) => (
          <article key={index} className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-2 font-sans">
              {post.slug ? (
                <a href={`/blog/${post.slug}`} className="text-blue-600 hover:text-blue-800 hover:underline">
                  {post.title}
                </a>
              ) : (
                <a href="#" className="hover:text-gray-600">
                  {post.title}
                </a>
              )}
            </h2>
            <time className="text-sm text-gray-500 mb-3 block">{post.date}</time>
            <p className="text-gray-700">{post.excerpt}</p>
          </article>
        ))}
      </div>

      <p className="mt-12 text-gray-500 text-sm">
        More blog posts coming soon...
      </p>
    </div>
  );
}
