export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          Deploying to Cloud Run with GitHub Actions and Workload Identity Federation
        </h1>
        <time className="text-gray-500">December 25, 2024</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        Learn how to set up a secure CI/CD pipeline that builds Docker containers,
        pushes them to Google Artifact Registry, and deploys to Cloud Run with
        automatic preview URLs for every branch.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Why Workload Identity Federation?</h2>
      <p>
        Traditionally, authenticating GitHub Actions to Google Cloud required creating
        and storing service account keys as secrets. This approach has several drawbacks:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li>Long-lived credentials that need rotation</li>
        <li>Risk of key exposure if not properly managed</li>
        <li>Additional operational overhead</li>
      </ul>
      <p>
        Workload Identity Federation solves these problems by allowing GitHub Actions
        to authenticate using short-lived tokens instead of static keys. No credentials
        to manage, rotate, or worry about leaking.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Architecture Overview</h2>
      <p>Our CI/CD pipeline does the following:</p>
      <ol className="list-decimal pl-6 mb-4">
        <li><strong>Build on every branch</strong> - Docker images are built and tagged with the commit SHA</li>
        <li><strong>Push to Artifact Registry</strong> - All images are stored for auditability</li>
        <li><strong>Deploy to Cloud Run</strong> - Main branch deploys to production, other branches create preview URLs</li>
      </ol>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Setting Up Workload Identity Federation</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">1. Create a Workload Identity Pool</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`export PROJECT_ID="your-project-id"
export GITHUB_REPO="your-org/your-repo"

# Create the identity pool
gcloud iam workload-identity-pools create "github-pool" \\
  --project="\${PROJECT_ID}" \\
  --location="global" \\
  --display-name="GitHub Actions Pool"`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">2. Create the OIDC Provider</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud iam workload-identity-pools providers create-oidc "github-provider" \\
  --project="\${PROJECT_ID}" \\
  --location="global" \\
  --workload-identity-pool="github-pool" \\
  --display-name="GitHub Provider" \\
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \\
  --attribute-condition="assertion.repository_owner == '$(echo $GITHUB_REPO | cut -d'/' -f1)'" \\
  --issuer-uri="https://token.actions.githubusercontent.com"`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">3. Create and Configure Service Account</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Create service account
gcloud iam service-accounts create github-actions \\
  --project="\${PROJECT_ID}" \\
  --display-name="GitHub Actions"

# Grant Artifact Registry Writer permission
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:github-actions@\${PROJECT_ID}.iam.gserviceaccount.com" \\
  --role="roles/artifactregistry.writer"

# Grant Cloud Run Admin permission
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:github-actions@\${PROJECT_ID}.iam.gserviceaccount.com" \\
  --role="roles/run.admin"

# Grant Service Account User permission
gcloud projects add-iam-policy-binding \${PROJECT_ID} \\
  --member="serviceAccount:github-actions@\${PROJECT_ID}.iam.gserviceaccount.com" \\
  --role="roles/iam.serviceAccountUser"`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">4. Allow GitHub to Impersonate Service Account</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud iam service-accounts add-iam-policy-binding \\
  "github-actions@\${PROJECT_ID}.iam.gserviceaccount.com" \\
  --project="\${PROJECT_ID}" \\
  --role="roles/iam.workloadIdentityUser" \\
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe \${PROJECT_ID} --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/\${GITHUB_REPO}"`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">GitHub Actions Workflow</h2>
      <p>
        The workflow builds on all branches but deploys differently based on the branch:
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Main Branch Deployment</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Tagged with <code>:latest</code></li>
        <li>Receives all production traffic</li>
        <li>Deployed to the main service URL</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Feature Branch Deployment</h3>
      <ul className="list-disc pl-6 mb-4">
        <li>Tagged with commit SHA</li>
        <li>Deployed with <code>--no-traffic</code> flag</li>
        <li>Creates a tagged URL: <code>https://branch-name---service-name-hash.region.run.app</code></li>
        <li>Perfect for testing before merging to main</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Setting Up GitHub Secrets</h2>
      <p>
        Create a production environment in your GitHub repository and add these secrets:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><code>WIF_PROVIDER</code> - Full path to your Workload Identity Provider</li>
        <li><code>WIF_SERVICE_ACCOUNT</code> - Email of your service account</li>
        <li><code>GCP_PROJECT_ID</code> - Your Google Cloud project ID</li>
        <li><code>GCP_REGION</code> - Region for Artifact Registry and Cloud Run (e.g., us-west1)</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Key Workflow Features</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Conditional Deployments</h3>
      <p>
        The workflow uses GitHub's conditional expressions to handle different branches:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`if: github.ref == 'refs/heads/main'  # Production deployment
if: github.ref != 'refs/heads/main'  # Preview deployment`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Branch Name Sanitization</h3>
      <p>
        Cloud Run tags must be lowercase alphanumeric with hyphens. The workflow
        sanitizes branch names automatically:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`BRANCH_NAME=$(echo "\${{ github.ref_name }}" | sed 's/[^a-zA-Z0-9-]/-/g' | tr '[:upper:]' '[:lower:]')`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Benefits of This Approach</h2>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Security</strong> - No long-lived credentials to manage</li>
        <li><strong>Preview URLs</strong> - Test every branch before merging</li>
        <li><strong>Automated</strong> - Deploys on every push</li>
        <li><strong>Audit Trail</strong> - All images tagged with commit SHA</li>
        <li><strong>Isolation</strong> - Branch deployments don't affect production</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Conclusion</h2>
      <p>
        This setup provides a secure, automated deployment pipeline with preview URLs
        for every branch. Workload Identity Federation eliminates the need to manage
        service account keys, while Cloud Run's revision URLs make it easy to test
        changes before they hit production.
      </p>
      <p className="mt-4">
        The combination of GitHub Actions, Workload Identity Federation, and Cloud Run
        creates a modern, secure CI/CD pipeline that scales with your team.
      </p>
    </article>
  );
}
