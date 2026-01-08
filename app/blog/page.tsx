import { posts } from "@/lib/posts";

export default function Blog() {

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold font-sans">Blog</h1>
        <a
          href="/blog/rss.xml"
          className="text-sm text-gray-600 hover:text-blue-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          RSS Feed
        </a>
      </div>

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
