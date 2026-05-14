export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          Blog Post Claude Skill
        </h1>
        <time className="text-gray-500">May 13, 2026</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        Creating my first Claude Skill and using it to create a blog post
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">The Problem</h2>
      <p className="mb-4">
        Adding a blog post to this site is a multi-step process. You need to create a new{" "}
        <code>page.tsx</code> file under <code>app/blog/[slug]/</code>, then manually
        register the post in <code>lib/posts.ts</code> so it shows up on the blog index.
        Miss either step and things break in confusing ways — a post that renders but
        doesn&apos;t appear in the list, or a link in the index that 404s.
      </p>
      <p>
        Since I can go a few months not touching the codebase, it&apos;s the kind of workflow that is easy to forget. 
        I already documented it in{" "} <code>CLAUDE.md</code> so Claude Code could follow along, but I wanted something even more automatic.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Claude Skills</h2>
      <p className="mb-4">
        Claude Code supports custom slash commands called <em>skills</em>. A skill lives under <code>.claude/skills/</code> at the root of your
        project — a directory per skill, with a <code>SKILL.md</code> file inside. When you type <code>/skill-name</code> in the Claude Code prompt, it
        loads that file as an instruction set and executes it.
      </p>
      <p>
        Skills can accept arguments (via <code>$ARGUMENTS</code>), ask follow-up
        questions, read and write files, and do anything else Claude Code can normally
        do — they just package a repeatable workflow into a single command. They follow
        the{" "}
        <a href="https://agentskills.io" target="_blank" rel="noopener noreferrer">Agent Skills</a>{" "}
        open standard, so the format is portable across AI tools that support it.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Building /new-blog-post</h2>
      <p className="mb-4">
        I created <code>.claude/skills/new-blog-post/SKILL.md</code> with instructions that
        mirror what I&apos;d tell Claude manually. The skill:
      </p>
      <ol>
        <li>
          Asks for a title, slug, excerpt, and date (or accepts the title as a direct
          argument to skip the first prompt)
        </li>
        <li>
          Creates <code>app/blog/[slug]/page.tsx</code> from a standard template with
          the correct Tailwind classes and formatting
        </li>
        <li>
          Reads <code>lib/posts.ts</code> and prepends the new entry to the{" "}
          <code>posts</code> array so the blog index stays up to date
        </li>
      </ol>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">A CMS Without the CMS</h2>
      <p className="mb-4">
        I&apos;ve played around with the idea of using a proper CMS for this website — a database, a web UI
        for writing posts, maybe a draft/publish workflow. But I keep coming back to the fact that code 
        and git already give me most of what I&apos;d want from a CMS: version history, a clear publish moment (merging to main), 
        the ability to write and preview locally (or with Cloud Run{" "}
        <a href="https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration#tags" target="_blank" rel="noopener noreferrer">revision URLs</a>) before anything goes live.
      </p>
      <p>
        The Claude Skill bridges that gap between a CMS and my git workflow — it handles the file management
        so I can focus on writing. It&apos;s not a CMS, but it gives me a similar publishing
        experience while keeping everything in the repo where I want it.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">The Meta Part</h2>
      <p className="mb-4">
        This post was created using the skill. I typed <code>/new-blog-post</code>,
        provided the title and excerpt, and Claude Code scaffolded the file and updated{" "}
        <code>lib/posts.ts</code> automatically. I wrote the content, made revisions, and published.
      </p>
      <p>
        My hope is that removing the mental overhead of remembering which files to touch will encourage me to publish more frequently.
        The goal isn&apos;t to automate writing — it&apos;s to get the scaffolding out of the way so I can.
      </p>
    </article>
  );
}
