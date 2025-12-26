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

## Setting Up a Custom Domain

Once your Cloud Run service is deployed, you can map a custom domain to it.

### Prerequisites

- A deployed Cloud Run service
- A domain registered with a registrar (e.g., Namecheap, Google Domains, etc.)
- Access to your domain's DNS settings

### Enable Required APIs

Before creating the domain mapping, ensure these APIs are enabled in your project:

```bash
gcloud services enable compute.googleapis.com \
  certificatemanager.googleapis.com \
  --project ${PROJECT_ID}
```

**Important:** Without these APIs, SSL certificate provisioning will fail. The Compute Engine API is required for load balancer SSL termination, and Certificate Manager API handles certificate provisioning.

### Step 1: Verify Domain Ownership

Google Cloud requires domain verification before allowing domain mapping:

1. Go to [Google Search Console](https://search.google.com/search-console/welcome)
2. Select **Domain** as the property type (not URL prefix)
3. Enter your domain (e.g., `logangallagher.com`)
4. Google will provide a TXT record for verification

Add the TXT record to your DNS provider:
```
Type: TXT
Host: @
Value: google-site-verification=abc123xyz...
TTL: Automatic (or 1 minute for faster propagation)
```

Click **Verify** in Search Console after adding the record.

**Note:** If your DNS is managed by cPanel or another hosting provider, you may need to switch DNS management to your registrar (usually called "BasicDNS") for simpler management.

### Step 2: Install gcloud Beta Components

Domain mapping requires the beta command group:

```bash
gcloud components install beta --quiet
```

### Step 3: Create Domain Mapping

Map your verified domain to your Cloud Run service:

```bash
gcloud beta run domain-mappings create \
  --service personal-website \
  --domain your-domain.com \
  --region us-west1 \
  --project ${PROJECT_ID}
```

This command will output DNS records that you need to add to your domain registrar.

### Step 4: Configure DNS Records

Add the following records to your DNS provider (the exact IPs will be provided by the command above):

**A Records (IPv4):**
```
Type: A | Host: @ | Value: 216.239.32.21
Type: A | Host: @ | Value: 216.239.34.21
Type: A | Host: @ | Value: 216.239.36.21
Type: A | Host: @ | Value: 216.239.38.21
```

**AAAA Records (IPv6):**
```
Type: AAAA | Host: @ | Value: 2001:4860:4802:32::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:34::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:36::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:38::15
```

**Important:** Use `@` for the Host field (represents the root domain). Delete any existing A or AAAA records that conflict.

### Step 5: Verify DNS Propagation

Check that DNS is propagating correctly:

```bash
dig +short your-domain.com A
```

You should see all four IP addresses. DNS propagation usually takes a few minutes but can take up to 48 hours.

### Step 6: Wait for SSL Certificate

Google Cloud automatically provisions a free SSL certificate. This process takes 15-60 minutes.

Check certificate status:
```bash
gcloud beta run domain-mappings describe \
  --domain your-domain.com \
  --region us-west1 \
  --project ${PROJECT_ID}
```

Look for `CertificateProvisioned: True` in the output.

### Optional: Add www Subdomain

To support both `www.your-domain.com` and `your-domain.com`:

```bash
gcloud beta run domain-mappings create \
  --service personal-website \
  --domain www.your-domain.com \
  --region us-west1 \
  --project ${PROJECT_ID}
```

Unlike the root domain which uses A and AAAA records, the www subdomain uses a **CNAME record**:

```
Type: CNAME
Host: www
Value: ghs.googlehosted.com.
TTL: Automatic
```

Add this single CNAME record to your DNS provider. The SSL certificate will be automatically provisioned for the www subdomain (15-60 minutes). Once complete, both domains will work with HTTPS.

### Verifying the Setup

Once the SSL certificate is provisioned, test your domain:

```bash
# Test HTTP (should redirect to HTTPS)
curl -I http://your-domain.com

# Test HTTPS (should return 200 OK)
curl -I https://your-domain.com
```

### Troubleshooting

**Certificate Stuck in "Pending" Status:**

If your certificate shows "Unknown" status with "Certificate issuance pending" message:

1. **Enable Required APIs** (most common fix):
   ```bash
   gcloud services enable compute.googleapis.com \
     certificatemanager.googleapis.com \
     --project ${PROJECT_ID}
   ```
   Wait 15-20 minutes for the next automatic retry cycle.

2. **Verify DNS Records:**
   ```bash
   dig +short your-domain.com A
   dig +short your-domain.com AAAA
   ```
   All 4 A records and 4 AAAA records should be returned.

3. **Recreate Mapping** (if still stuck after 30+ minutes):
   ```bash
   # Delete and recreate to trigger fresh certificate request
   gcloud beta run domain-mappings delete \
     --domain your-domain.com \
     --region us-west1 \
     --project ${PROJECT_ID}

   gcloud beta run domain-mappings create \
     --service personal-website \
     --domain your-domain.com \
     --region us-west1 \
     --project ${PROJECT_ID}
   ```

### Benefits

- **Free SSL certificates** - Automatically provisioned and renewed
- **Global load balancing** - Traffic routed to nearest Google edge location
- **Automatic HTTPS redirect** - HTTP traffic redirects to HTTPS by default
- **Persistent across deployments** - Domain mapping survives service updates
- **No additional configuration** - Future deployments automatically work with your custom domain

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
