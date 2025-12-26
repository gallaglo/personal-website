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

gcloud services enable iamcredentials.googleapis.com \
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

### Option 1: Manual Deployment from Command Line

1. Build the Docker image:
   ```bash
   docker build -t personal-website .
   ```

2. Test locally:
   ```bash
   docker run -p 8080:8080 personal-website
   ```

3. Tag and push to Artifact Registry:
   ```bash
   export REGION="us-west1"  # Use the same region as your repository

   docker tag personal-website ${REGION}-docker.pkg.dev/${PROJECT_ID}/personal-website/personal-website:latest
   docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/personal-website/personal-website:latest
   ```

4. Deploy to Cloud Run with environment variables:
   ```bash
   gcloud run deploy personal-website \
     --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/personal-website/personal-website:latest \
     --platform managed \
     --region ${REGION} \
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
     --image ${REGION}-docker.pkg.dev/${PROJECT_ID}/personal-website/personal-website:latest \
     --platform managed \
     --region ${REGION} \
     --allow-unauthenticated \
     --set-secrets GMAIL_USER=gmail-user:latest,GMAIL_APP_PASSWORD=gmail-password:latest
   ```

### Option 2: Automated Deployment with GitHub Actions

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
