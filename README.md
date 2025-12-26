# Logan Gallagher's Personal Website

Personal website for Logan Gallagher, software developer and trainer based in Portland, OR.

Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Hosted at [logangallagher.com](https://logangallagher.com).

## Features

- About Me page with contact form
- Contact form using Gmail SMTP (no third-party services)
- Blog stub (ready for your posts)
- Projects showcase with GitHub repos
- Minimal, clean design with papyrus-inspired background
- Fully responsive
- Ready for Cloud Run deployment

## Local Development

Install dependencies:

```bash
npm install
```

### Configure the Contact Form

The contact form uses Gmail SMTP to send emails. Set up your environment variables:

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```

2. Get a Gmail App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. Update `.env.local` with your credentials:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
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

4. Deploy to Cloud Run with environment variables:
   ```bash
   gcloud run deploy personal-website \
     --image gcr.io/YOUR_PROJECT_ID/personal-website \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars GMAIL_USER=your-email@gmail.com,GMAIL_APP_PASSWORD=your-app-password
   ```

   **Note:** For better security, use Secret Manager instead of environment variables:
   ```bash
   # Create secrets
   echo -n "your-email@gmail.com" | gcloud secrets create gmail-user --data-file=-
   echo -n "your-app-password" | gcloud secrets create gmail-password --data-file=-

   # Deploy with secrets
   gcloud run deploy personal-website \
     --image gcr.io/YOUR_PROJECT_ID/personal-website \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-secrets GMAIL_USER=gmail-user:latest,GMAIL_APP_PASSWORD=gmail-password:latest
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

## License

This project uses a dual licensing structure:

- **Code**: Licensed under the [MIT License](LICENSE) - feel free to use, modify, and learn from the code
- **Content**: Licensed under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) - personal writing, images, and creative content are protected

See the [LICENSE](LICENSE) file for full details.
