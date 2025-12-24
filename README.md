# Logan Gallagher's Personal Website

Personal website for Logan Gallagher, software developer and trainer based in Portland, OR.

Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Hosted at [logangallagher.com](https://logangallagher.com).

## Features

- About Me page
- Blog stub (ready for your posts)
- Projects showcase stub
- Minimal, clean design inspired by great personal sites
- Fully responsive
- Ready for Cloud Run deployment

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

```bash
npm run build
npm start
```

## Deploying to Cloud Run

1. Build the Docker image:
   ```bash
   docker build -t personal-website .
   ```

2. Test locally:
   ```bash
   docker run -p 8080:8080 personal-website
   ```

3. Tag and push to Google Container Registry:
   ```bash
   docker tag personal-website gcr.io/YOUR_PROJECT_ID/personal-website
   docker push gcr.io/YOUR_PROJECT_ID/personal-website
   ```

4. Deploy to Cloud Run:
   ```bash
   gcloud run deploy personal-website \
     --image gcr.io/YOUR_PROJECT_ID/personal-website \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

## Customization

- Edit `app/page.tsx` to update your About page content
- Add blog posts in `app/blog/page.tsx`
- Add projects in `app/projects/page.tsx`
- Update social links in `app/page.tsx`
- Add your actual GitHub/Twitter handles in the Connect section

## Tech Stack

- [Next.js 16](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Lucide React](https://lucide.dev/) - Icons
