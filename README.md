# Logan Gallagher's Personal Website

Personal website for Logan Gallagher, software developer and trainer based in Portland, OR.

Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Hosted at [logangallagher.com](https://logangallagher.com).

## Features

- About Me page with contact form
- Contact form using Gmail API with OAuth2 (secure, no app passwords)
- Blog with technical posts
- Projects showcase with GitHub repos
- Minimal, clean design with papyrus-inspired background
- Fully responsive
- Cloud Run deployment with GitHub Actions CI/CD

## Local Development

Install dependencies:

```bash
npm install
```

### Configure the Contact Form

The contact form uses the Gmail API with OAuth2 authentication. Set up your credentials:

1. **Enable Gmail API in GCP:**
   ```bash
   gcloud services enable gmail.googleapis.com --project=YOUR_PROJECT_ID
   ```

2. **Create OAuth2 Credentials** in GCP Console:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add redirect URI: `http://localhost:3000/api/auth/callback`
   - Save the Client ID and Client Secret

3. **Configure OAuth Consent Screen:**
   - Go to APIs & Services → OAuth consent screen
   - User Type: External
   - Add scope: `https://www.googleapis.com/auth/gmail.send`
   - Add your Gmail as test user

4. **Get Refresh Token:**
   ```bash
   export GMAIL_CLIENT_ID="your-client-id"
   export GMAIL_CLIENT_SECRET="your-client-secret"
   npm run get-gmail-token
   ```
   This opens a browser for authorization and outputs your refresh token.

5. **Create `.env.local` with your credentials:**
   ```bash
   cp .env.example .env.local
   ```
   Then update `.env.local` with your actual values:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GMAIL_CLIENT_SECRET=your-client-secret
   GMAIL_REFRESH_TOKEN=your-refresh-token
   GMAIL_REDIRECT_URI=http://localhost:3000/api/auth/callback
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

This project uses GitHub Actions for automated deployments. See the [CI/CD blog post](/blog/github-actions-cloud-run) for setup details.

### Production Secrets Setup

Store Gmail API credentials in Secret Manager:

```bash
# Create secrets
echo -n "your-email@gmail.com" | gcloud secrets create gmail-user --data-file=-
echo -n "your-client-id" | gcloud secrets create gmail-client-id --data-file=-
echo -n "your-client-secret" | gcloud secrets create gmail-client-secret --data-file=-
echo -n "your-refresh-token" | gcloud secrets create gmail-refresh-token --data-file=-

# Get your Cloud Run service account
gcloud run services describe personal-website \
  --region=YOUR_REGION \
  --format="value(spec.template.spec.serviceAccountName)"

# Grant access to secrets (replace YOUR_SERVICE_ACCOUNT)
for secret in gmail-user gmail-client-id gmail-client-secret gmail-refresh-token; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Manual Deployment

If you need to deploy manually:

```bash
# Build and push
docker build -t YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/personal-website/main:latest .
docker push YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/personal-website/main:latest

# Deploy with secrets
gcloud run deploy personal-website \
  --image YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/personal-website/main:latest \
  --platform managed \
  --region YOUR_REGION \
  --allow-unauthenticated \
  --update-secrets="GMAIL_USER=gmail-user:latest,GMAIL_CLIENT_ID=gmail-client-id:latest,GMAIL_CLIENT_SECRET=gmail-client-secret:latest,GMAIL_REFRESH_TOKEN=gmail-refresh-token:latest"
```

The GitHub Actions workflow automatically deploys on every push to `main`.

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
