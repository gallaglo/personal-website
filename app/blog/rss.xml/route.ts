import { posts } from "@/lib/posts";

export async function GET() {
  const siteUrl = "https://logangallagher.com";

  // Convert date string to RFC 822 format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toUTCString();
  };

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Logan Gallagher - Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Personal blog of Logan Gallagher, software developer and trainer based in Portland, OR</description>
    <language>en-us</language>
    <lastBuildDate>${formatDate(posts[0].date)}</lastBuildDate>
    <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${posts
      .map(
        (post) => `
    <item>
      <title>${post.title}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${formatDate(post.date)}</pubDate>
    </item>`
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
