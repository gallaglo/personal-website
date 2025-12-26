# Logan Gallagher's Personal Website

Personal website for Logan Gallagher, software developer and trainer based in Portland, OR.

Built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui. Hosted at [logangallagher.com](https://logangallagher.com).

## Features

- About Me page
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

   ```env
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

This project can be deployed to Google Cloud Run either manually from your local machine or automatically via GitHub Actions.

### Prerequisites

Before deploying, ensure you have:

- A Google Cloud project with billing enabled
- The gcloud CLI installed and authenticated
- Docker installed (for local deployments)

### Enable Required APIs

These APIs must be enabled in your GCP project:

```bash
export PROJECT_ID="your-project-id"

gcloud services enable gmail.googleapis.com \
  iamcredentials.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  --project=${PROJECT_ID}
```

**Important:** The IAM Service Account Credentials API (`iamcredentials.googleapis.com`) is required for Workload Identity Federation.

### Create Artifact Registry Repository

```bash
gcloud artifacts repositories create personal-website \
  --repository-format=docker \
  --location=us-west1 \
  --project=${PROJECT_ID} \
  --description="Container images for personal website"
```

## Deployment

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

### Automated Deployment with GitHub Actions

For a secure, automated CI/CD pipeline using Workload Identity Federation (no long-lived credentials required):

#### 1. Create a Workload Identity Pool

```bash
export GITHUB_REPO="your-org/your-repo"  # e.g., "logangallagher/personal-website"

gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"
```

#### 2. Create the OIDC Provider

```bash
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '$(echo $GITHUB_REPO | cut -d'/' -f1)'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

#### 3. Create and Configure Service Account

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions"

# Grant Artifact Registry Writer permission
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

# Grant Cloud Run Admin permission
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

# Grant Service Account User permission
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

#### 4. Allow GitHub to Impersonate Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe ${PROJECT_ID} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}"
```

#### 5. Set Up GitHub Secrets

Create a production environment in your GitHub repository and add these secrets:

- `WIF_PROVIDER`: Full path to your Workload Identity Provider

  ```bash
  # Get the provider path
  gcloud iam workload-identity-pools providers describe github-provider \
    --workload-identity-pool=github-pool \
    --location=global \
    --project=${PROJECT_ID} \
    --format='value(name)'
  ```

- `WIF_SERVICE_ACCOUNT`: `github-actions@${PROJECT_ID}.iam.gserviceaccount.com`
- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCP_REGION`: Region for Artifact Registry and Cloud Run (e.g., `us-west1`)

#### How It Works

The GitHub Actions workflow (`.github/workflows/deploy.yml`) will:
1. **Build on every branch** - Docker images are built and tagged with the commit SHA
2. **Push to Artifact Registry** - All images are stored for auditability
3. **Deploy to Cloud Run**:
   - **Main branch**: Deploys to production with `:latest` tag and receives all traffic
   - **Other branches**: Creates preview URLs with `--no-traffic` flag for testing

**Note:** The first deployment must come from the main branch. Cloud Run doesn't allow `--no-traffic` when creating a new service.

#### Benefits of GitHub Actions Deployment

- **Security**: No long-lived credentials to manage or rotate
- **Preview URLs**: Test every branch before merging with unique URLs like `https://branch-name---service-name-hash.region.run.app`
- **Automated**: Deploys on every push
- **Audit Trail**: All images tagged with commit SHA
- **Isolation**: Branch deployments don't affect production

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
