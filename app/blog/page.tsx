export default function Blog() {
  const posts = [
    {
      title: "Example Blog Post",
      date: "2025-01-01",
      excerpt: "This is a placeholder for your first blog post.",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Blog</h1>

      <div className="space-y-8">
        {posts.map((post, index) => (
          <article key={index} className="border-b border-gray-200 pb-6">
            <h2 className="text-xl font-semibold mb-2">
              <a href="#" className="hover:text-gray-600">
                {post.title}
              </a>
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
