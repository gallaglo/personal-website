export interface BlogPost {
  title: string;
  date: string;
  slug: string;
  excerpt: string;
}

export const posts: BlogPost[] = [
  {
    title: "Setting Up a Custom Domain for Cloud Run",
    date: "12/27/2025",
    slug: "custom-domain-cloud-run",
    excerpt: "A complete guide to mapping a custom domain to Cloud Run, including domain verification, DNS configuration, and SSL certificate provisioning.",
  },
  {
    title: "Building a Contact Form with the Gmail API and OAuth2",
    date: "12/26/2025",
    slug: "gmail-api-contact-form",
    excerpt: "Why I used the Gmail API with OAuth2 for my contact form instead of third-party email services.",
  },
  {
    title: "Deploying to Cloud Run with GitHub Actions and Workload Identity Federation",
    date: "12/26/2025",
    slug: "github-actions-cloud-run",
    excerpt: "How I built a secure, automated pipeline for deploying my site to Cloud Run, featuring branch preview URLs and keyless authentication.",
  },
];
