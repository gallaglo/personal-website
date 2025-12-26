export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          Setting Up a Custom Domain for Cloud Run
        </h1>
        <time className="text-gray-500">December 26, 2025</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        After deploying my website to Cloud Run, the next step was mapping my custom domain.
        This guide walks through the entire process of pointing a Namecheap domain to Cloud Run,
        including domain verification, DNS configuration, and SSL certificate provisioning.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Prerequisites</h2>
      <p>Before starting, you need:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>A Cloud Run service already deployed (see my <a href="/blog/github-actions-cloud-run" className="text-blue-600 hover:underline">previous post</a> on deployment)</li>
        <li>A domain registered with a registrar (I use Namecheap)</li>
        <li>gcloud CLI installed and authenticated</li>
        <li>Control over your domain's DNS settings</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Enable Required APIs</h3>
      <p>
        Before creating the domain mapping, ensure these Google Cloud APIs are enabled in your project.
        Without them, SSL certificate provisioning will fail silently:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud services enable compute.googleapis.com \\
  certificatemanager.googleapis.com \\
  --project your-project-id`}</code>
      </pre>
      <p className="mb-4">
        <strong>Compute Engine API</strong> is required for the load balancer to perform SSL termination.
        <strong> Certificate Manager API</strong> handles the certificate provisioning process. Missing these
        APIs is the most common reason for certificates getting stuck in "pending" status.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Step 1: Verify Domain Ownership</h2>
      <p>
        Before Google Cloud will let you map a custom domain to Cloud Run, you must verify
        that you own the domain. This prevents someone from hijacking your traffic by mapping
        your domain to their service.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Using Google Search Console</h3>
      <p>The easiest verification method is through Google Search Console:</p>
      <ol className="list-decimal pl-6 mb-4">
        <li>Go to <a href="https://search.google.com/search-console/welcome" className="text-blue-600 hover:underline">Google Search Console</a></li>
        <li>Select <strong>Domain</strong> as the property type (not URL prefix)</li>
        <li>Enter your domain (e.g., <code>logangallagher.com</code>)</li>
        <li>Google will provide a TXT record for verification</li>
      </ol>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Adding the Verification Record</h3>
      <p>Add the TXT record to your DNS provider:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: TXT
Host: @
Value: google-site-verification=abc123xyz...
TTL: Automatic (or 1 minute for faster propagation)`}</code>
      </pre>
      <p className="mb-4">
        After adding the record, click <strong>Verify</strong> in Search Console. DNS propagation
        usually takes a few minutes but can take up to 48 hours.
      </p>

      <p className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-gray-700">
        <strong>Note:</strong> If your DNS is managed by cPanel or another hosting provider
        (not your domain registrar), you'll need to add the record there instead. Consider
        switching to your registrar's DNS for simpler management if you're not using other
        hosting services.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Step 2: Create Domain Mapping</h2>
      <p>
        Once your domain is verified, you can map it to your Cloud Run service. This tells
        Google Cloud to route traffic from your domain to your service.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Install gcloud Beta Components</h3>
      <p>Domain mapping requires the beta command group:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud components install beta --quiet`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Create the Mapping</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud beta run domain-mappings create \\
  --service personal-website \\
  --domain logangallagher.com \\
  --region us-west1 \\
  --project your-project-id`}</code>
      </pre>

      <p className="mb-4">
        This command will output the DNS records you need to add to your domain registrar.
        You'll see 4 A records and 4 AAAA records (IPv6).
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Step 3: Configure DNS Records</h2>
      <p>
        The domain mapping command provides specific IP addresses that you need to point
        your domain to. These IPs are Google's global load balancers that will route traffic
        to your Cloud Run service.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">A Records (IPv4)</h3>
      <p>Add these four A records to your DNS:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: A | Host: @ | Value: 216.239.32.21
Type: A | Host: @ | Value: 216.239.34.21
Type: A | Host: @ | Value: 216.239.36.21
Type: A | Host: @ | Value: 216.239.38.21`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">AAAA Records (IPv6)</h3>
      <p>Add these four AAAA records:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: AAAA | Host: @ | Value: 2001:4860:4802:32::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:34::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:36::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:38::15`}</code>
      </pre>

      <p className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-gray-700">
        <strong>Important:</strong> Use <code>@</code> for the Host field, which represents
        the root domain. Delete any existing A or AAAA records that point to other IPs to
        avoid conflicts.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Step 4: Verify DNS Propagation</h2>
      <p>
        After adding the DNS records, you can verify they're propagating correctly using the <code>dig</code> command:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`dig +short logangallagher.com A`}</code>
      </pre>
      <p className="mb-4">
        You should see all four IP addresses returned. If you don't see them immediately, wait
        a few minutes and try again.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Step 5: SSL Certificate Provisioning</h2>
      <p>
        Once DNS is configured, Google Cloud automatically provisions a free SSL certificate
        using Google-managed certificates (similar to Let's Encrypt). This process is completely
        automatic but can take 15-60 minutes.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Check Certificate Status</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud beta run domain-mappings describe \\
  --domain logangallagher.com \\
  --region us-west1 \\
  --project your-project-id`}</code>
      </pre>

      <p className="mb-4">Look for the <code>CertificateProvisioned</code> status in the output:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`status:
  conditions:
  - type: CertificateProvisioned
    status: True  # Certificate is ready
    # or
    status: Unknown  # Still provisioning`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">What Happens During Provisioning</h3>
      <ol className="list-decimal pl-6 mb-4">
        <li>Google verifies your DNS records point to their load balancers</li>
        <li>A certificate is requested from Google's certificate authority</li>
        <li>The certificate is validated and provisioned</li>
        <li>HTTPS becomes available for your domain</li>
      </ol>

      <p className="mb-4">
        During this time, HTTP (port 80) will work and redirect to HTTPS, but the HTTPS
        connection won't succeed until the certificate is ready.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Verifying the Setup</h2>
      <p>Once the certificate is provisioned, test your domain:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Test HTTP (should redirect to HTTPS)
curl -I http://logangallagher.com

# Test HTTPS (should return 200 OK)
curl -I https://logangallagher.com`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Common Issues</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Issue: "The provided domain does not appear to be verified"</h3>
      <p className="mb-4">
        <strong>Solution:</strong> Complete domain verification through Google Search Console first.
        You can check verified domains with:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud domains list-user-verified --project your-project-id`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Issue: DNS Not Managed by Registrar</h3>
      <p className="mb-4">
        <strong>Solution:</strong> If your DNS is managed by cPanel or another hosting provider,
        either add the records there or switch DNS management back to your registrar (usually
        called "BasicDNS" or similar).
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Issue: Certificate Stuck in "Pending"</h3>
      <p className="mb-4">
        This is the most common issue. The certificate status shows "Unknown" with a message like
        "Certificate issuance pending. The challenge data was not visible through the public internet."
      </p>
      <p className="mb-4">
        <strong>Solution 1 - Enable Required APIs:</strong> The most common cause is missing API enablement.
        Ensure both Compute Engine API and Certificate Manager API are enabled:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Enable the required APIs
gcloud services enable compute.googleapis.com \\
  certificatemanager.googleapis.com \\
  --project your-project-id

# Wait 15-20 minutes for the next retry cycle
# Google retries certificate provisioning every ~15 minutes`}</code>
      </pre>
      <p className="mb-4">
        <strong>Solution 2 - Verify DNS:</strong> Confirm your DNS records are correct using <code>dig</code>:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`dig +short your-domain.com A
dig +short your-domain.com AAAA`}</code>
      </pre>
      <p className="mb-4">
        All 4 A records and 4 AAAA records should be returned. If not, wait for DNS propagation.
      </p>
      <p className="mb-4">
        <strong>Solution 3 - Recreate Mapping:</strong> If the certificate is still stuck after enabling
        the APIs and waiting 30+ minutes, delete and recreate the domain mapping:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Delete the mapping
gcloud beta run domain-mappings delete \\
  --domain your-domain.com \\
  --region us-west1 \\
  --project your-project-id

# Recreate it (this triggers a fresh certificate request)
gcloud beta run domain-mappings create \\
  --service personal-website \\
  --domain your-domain.com \\
  --region us-west1 \\
  --project your-project-id`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Optional: Set Up www Subdomain</h2>
      <p>
        Many sites support both the root domain and the www subdomain. To add www support,
        create another domain mapping:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud beta run domain-mappings create \\
  --service personal-website \\
  --domain www.logangallagher.com \\
  --region us-west1 \\
  --project your-project-id`}</code>
      </pre>

      <p className="mb-4">
        Unlike the root domain which uses A and AAAA records, the www subdomain uses a <strong>CNAME record</strong>:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: CNAME
Host: www
Value: ghs.googlehosted.com.
TTL: Automatic`}</code>
      </pre>

      <p className="mb-4">
        Add this single CNAME record to your DNS provider. The SSL certificate will be automatically
        provisioned for the www subdomain just like the root domain (15-60 minutes). Once complete,
        both <code>your-domain.com</code> and <code>www.your-domain.com</code> will work with HTTPS.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Understanding the Architecture</h2>
      <p>Here's what happens when someone visits your custom domain:</p>
      <ol className="list-decimal pl-6 mb-4">
        <li><strong>DNS Resolution:</strong> Your domain's A/AAAA records point to Google's global load balancers</li>
        <li><strong>Load Balancer:</strong> Routes traffic to your Cloud Run service based on the domain mapping</li>
        <li><strong>Cloud Run:</strong> Serves your containerized application</li>
        <li><strong>SSL/TLS:</strong> Google-managed certificates handle HTTPS encryption automatically</li>
      </ol>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Benefits of This Setup</h2>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Free SSL certificates</strong> - Automatically provisioned and renewed</li>
        <li><strong>Global load balancing</strong> - Traffic routed to the nearest Google edge location</li>
        <li><strong>Automatic HTTPS redirect</strong> - HTTP traffic redirects to HTTPS by default</li>
        <li><strong>No server management</strong> - Everything is managed by Google Cloud</li>
        <li><strong>Persistent across deployments</strong> - Domain mapping survives service updates</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Conclusion</h2>
      <p>
        Setting up a custom domain for Cloud Run is straightforward once you understand the steps.
        The domain verification through Search Console is a one-time process, and the DNS
        configuration takes just a few minutes. The automated SSL certificate provisioning is
        one of Cloud Run's best features—no dealing with Let's Encrypt renewals or certificate management.
      </p>
      <p className="mt-4">
        After the initial setup, your domain mapping persists across all future deployments.
        You can continue deploying your service through GitHub Actions (or any other method)
        and your custom domain will keep working without any additional configuration.
      </p>
    </article>
  );
}
