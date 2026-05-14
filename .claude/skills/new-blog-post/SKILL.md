Create a new blog post for this Next.js personal website.

Arguments: $ARGUMENTS

If arguments are provided, treat them as the post title. If no arguments are provided, ask the user for:
1. **Title** — the full post title
2. **Slug** — URL-friendly slug (suggest one derived from the title, e.g. "My Great Post" → "my-great-post")
3. **Excerpt** — one or two sentence summary shown on the blog index
4. **Date** — publication date (default to today's date in MM/DD/YYYY format)

Once you have all four values, do the following in order:

## Step 1 — Create the page file

Create `app/blog/[slug]/page.tsx` (where `[slug]` is the actual slug value) with this structure:

```tsx
export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          TITLE HERE
        </h1>
        <time className="text-gray-500">MONTH DD, YYYY</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        EXCERPT HERE
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Introduction</h2>
      <p className="mb-4">
        Write your introduction here.
      </p>
    </article>
  );
}
```

- The `<time>` element should use the long date format, e.g. "May 13, 2026"
- The function name should always be `BlogPost`

## Step 2 — Register in lib/posts.ts

Read the current `lib/posts.ts` and prepend a new entry to the `posts` array (newest first):

```ts
{
  title: "TITLE",
  date: "MM/DD/YYYY",
  slug: "slug-value",
  excerpt: "Excerpt text.",
},
```

## Step 3 — Confirm

Tell the user:
- The file that was created: `app/blog/[slug]/page.tsx`
- That `lib/posts.ts` was updated
- That the RSS feed at `/blog/rss.xml` auto-generates from `lib/posts.ts` — no manual update needed
- A reminder to fill in the post body in the new `page.tsx`
