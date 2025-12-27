export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          Setting Up a Custom Domain for Cloud Run
        </h1>
        <time className="text-gray-500">December 27, 2025</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        After deploying my website to Cloud Run, I pointed my custom domain to it using Cloud Run's <a href="https://docs.cloud.google.com/run/docs/mapping-custom-domains" className="text-blue-600 hover:underline">domain mapping</a> feature.
        Cloud Run automatically provisions SSL certificates and routes traffic through Google's global load balancers. This post covers domain verification, DNS configuration, and certificate provisioning.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">What I Started With</h2>
      <p>Before I jumped into this, I already had:</p>
      <ul className="list-disc pl-6 mb-4">
        <li>A Cloud Run service already deployed (see my <a href="/blog/github-actions-cloud-run" className="text-blue-600 hover:underline">previous post</a> on deployment)</li>
        <li>A domain registered with Namecheap</li>
        <li>gcloud CLI installed and authenticated</li>
        <li>Control over my domain's DNS settings</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">First Step: Enable Required APIs</h3>
      <p>
        I started by enabling a couple of Google Cloud APIs. Without these APIs,
        SSL certificate provisioning fails silently and you'll be stuck wondering why:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud services enable compute.googleapis.com \\
  certificatemanager.googleapis.com \\
  --project your-project-id`}</code>
      </pre>
      <p className="mb-4">
        The <strong>Compute Engine API</strong> is needed for the load balancer to perform SSL termination,
        and the <strong>Certificate Manager API</strong> handles the certificate provisioning process. Missing these
        was the most common gotcha I ran into when my certificates got stuck in "pending" status.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Verifying Domain Ownership</h2>
      <p>
        Before Google Cloud would let me map my custom domain to Cloud Run, I had to prove
        I actually owned it. Otherwise anyone could hijack traffic by mapping
        someone else's domain to their service.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Using Google Search Console</h3>
      <p>I used Google Search Console for verification since it was the easiest method:</p>
      <ol className="list-decimal pl-6 mb-4">
        <li>I went to <a href="https://search.google.com/search-console/welcome" className="text-blue-600 hover:underline">Google Search Console</a></li>
        <li>Selected <strong>Domain</strong> as the property type (not URL prefix)</li>
        <li>Entered my domain (<code>logangallagher.com</code>)</li>
        <li>Google provided a TXT record for verification</li>
      </ol>

      <img
        src="/blog/google-search-console.png"
        alt="Google Search Console welcome screen showing Domain and URL prefix property type options with domain field filled in"
        className="my-6 rounded-lg border border-gray-200"
      />

      <p className="mb-4">
        After entering my domain and clicking Continue, Google provided me with a TXT record:
      </p>

      <img
        src="/blog/verify-domain-ownership-redacted.png"
        alt="Google Search Console domain verification screen displaying the TXT record value to copy and add to DNS settings"
        className="my-6 rounded-lg border border-gray-200"
      />

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Adding the Verification Record</h3>
      <p>I added the TXT record to my DNS provider (Namecheap):</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: TXT
Host: @
Value: google-site-verification=abc123xyz...
TTL: Automatic (or 1 minute for faster propagation)`}</code>
      </pre>

      <img
        src="/blog/txt-record-redacted.png"
        alt="Namecheap DNS configuration panel showing the Google verification TXT record added with host @ and automatic TTL"
        className="my-6 rounded-lg border border-gray-200"
      />

      <p className="mb-4">
        After adding the record, I clicked <strong>Verify</strong> in Search Console. DNS propagation
        usually takes a few minutes but can take up to 48 hours. Mine went through pretty quickly.
      </p>

      <img
        src="/blog/ownership-verified.png"
        alt="Google Search Console success message showing 'Ownership verified' with green checkmark for domain verification"
        className="my-6 rounded-lg border border-gray-200"
      />

      <p className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 text-gray-700">
        <strong>Note:</strong> If your DNS is managed by another hosting provider
        (not your domain registrar), you'll need to add the record there instead. I switched
        to my registrar's DNS for simpler management since I wasn't using other hosting services.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Creating the Domain Mapping</h2>
      <p>
        Once my domain was verified, I could map it to my Cloud Run service. This tells
        Google Cloud to route traffic from my domain to the service.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Install gcloud Beta Components</h3>
      <p>I needed the beta command group for domain mapping:</p>
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
        This command outputted the DNS records I needed to add to my domain registrar.
        I got 4 A records and 4 AAAA records (IPv6).
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Configuring DNS Records</h2>
      <p>
        The domain mapping command gave me specific IP addresses to point
        my domain to. These are Google's global load balancers that route traffic
        to the Cloud Run service.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">A Records (IPv4)</h3>
      <p>I added these four A records to my DNS:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: A | Host: @ | Value: 216.239.32.21
Type: A | Host: @ | Value: 216.239.34.21
Type: A | Host: @ | Value: 216.239.36.21
Type: A | Host: @ | Value: 216.239.38.21`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">AAAA Records (IPv6)</h3>
      <p>Then I added these four AAAA records:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`Type: AAAA | Host: @ | Value: 2001:4860:4802:32::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:34::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:36::15
Type: AAAA | Host: @ | Value: 2001:4860:4802:38::15`}</code>
      </pre>

      <img
        src="/blog/txt-a-and-aaaa-records-redacted.png"
        alt="Namecheap DNS panel displaying all configured records including the TXT verification record, four A records for IPv4, and four AAAA records for IPv6"
        className="my-6 rounded-lg border border-gray-200"
      />

      <p className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-500 text-gray-700">
        <strong>Important:</strong> I used <code>@</code> for the Host field, which represents
        the root domain. I also deleted any existing A or AAAA records that pointed to other IPs to
        avoid conflicts.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Verifying DNS Propagation</h2>
      <p>
        After adding the DNS records, I verified they were propagating correctly using the <code>dig</code> command:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`dig +short logangallagher.com A`}</code>
      </pre>
      <p className="mb-4">
        I should see all four IP addresses returned. If they don't show up immediately, wait
        a few minutes and try again.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">SSL Certificate Provisioning</h2>
      <p>
        Once DNS was configured, Google Cloud automatically provisioned a free SSL certificate
        using Google-managed certificates (similar to Let's Encrypt). This process was completely
        automatic but took about 15 minutes.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Checking Certificate Status</h3>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud beta run domain-mappings describe \\
  --domain logangallagher.com \\
  --region us-west1 \\
  --project your-project-id`}</code>
      </pre>

      <p className="mb-4">I looked for the <code>CertificateProvisioned</code> status in the output:</p>
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
        <li>Google verifies the DNS records point to their load balancers</li>
        <li>A certificate is requested from Google's certificate authority</li>
        <li>The certificate is validated and provisioned</li>
        <li>HTTPS becomes available for the domain</li>
      </ol>

      <p className="mb-4">
        During this time, HTTP (port 80) worked and redirected to HTTPS, but the HTTPS
        connection didn't succeed until the certificate was ready.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Verifying the Setup</h2>
      <p>Once the certificate was provisioned, I tested my domain:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Test HTTP (should redirect to HTTPS)
curl -I http://logangallagher.com

# Test HTTPS (should return 200 OK)
curl -I https://logangallagher.com`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Issues I Ran Into</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">"The provided domain does not appear to be verified"</h3>
      <p className="mb-4">
        I hit this when I tried to create the domain mapping before completing verification.
        The fix was to complete domain verification through Google Search Console first.
        I checked my verified domains with:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud domains list-user-verified --project your-project-id`}</code>
      </pre>

      <p className="mb-4">
        When verification failed, I saw an error message like this:
      </p>

      <img
        src="/blog/ownership-verification-failed.png"
        alt="Google Search Console error showing 'Ownership verification failed' message indicating the TXT record could not be found"
        className="my-6 rounded-lg border border-gray-200"
      />

      <p className="mb-4">
        This typically means the TXT record hasn't propagated yet. I waited a few hours and tried again, and also
        double-checked that I'd added the record to the correct DNS provider (my registrar, not a hosting provider).
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">DNS Not Managed by Registrar</h3>
      <p className="mb-4">
        I initially had my DNS managed by a hosting provider (cPanel) rather than my registrar (Namecheap). I either needed to add
        the records there or switch DNS management back to my registrar (usually called "BasicDNS" or similar).
        I switched to my registrar's DNS for simpler management. 
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Certificate Stuck in "Pending"</h3>
      <p className="mb-4">
        The certificate status may show "Unknown" with a message like "Certificate issuance pending. The challenge data was not visible through the public internet." 
        This is usually caused by missing API enablement (Solution 1), but if that doesn't resolve it, work through the following troubleshooting steps.
      </p>
      <p className="mb-4">
        <strong>Solution 1 - Enable Required APIs:</strong> Missing API enablement is the most common cause. Enable both required APIs:
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
        <strong>Solution 2 - Verify DNS:</strong> Confirm DNS records are correct using <code>dig</code>:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`dig +short your-domain.com A
dig +short your-domain.com AAAA`}</code>
      </pre>
      <p className="mb-4">
        All 4 A records and 4 AAAA records should be returned. If not, wait for DNS propagation.
      </p>
      <p className="mb-4">
        <strong>Solution 3 - Recreate Mapping:</strong> If the certificate is still stuck after enabling APIs and waiting 30+ minutes, delete and recreate the domain mapping:
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

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Optional: Setting Up www Subdomain</h2>
      <p>
        I also wanted to support both the root domain and the www subdomain. To add www support,
        I created another domain mapping:
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
        I added this single CNAME record to my DNS provider. The SSL certificate was automatically
        provisioned for the www subdomain just like the root domain (took about 15 minutes). Once complete,
        both <code>logangallagher.com</code> and <code>www.logangallagher.com</code> worked with HTTPS.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">How It All Works</h2>
      <p>Here's what happens when someone visits my custom domain:</p>
      <ol className="list-decimal pl-6 mb-4">
        <li><strong>DNS Resolution:</strong> My domain's A/AAAA records point to Google's global load balancers</li>
        <li><strong>Load Balancer:</strong> Routes traffic to my Cloud Run service based on the domain mapping</li>
        <li><strong>Cloud Run:</strong> Serves the containerized application</li>
        <li><strong>SSL/TLS:</strong> Google-managed certificates handle HTTPS encryption automatically</li>
      </ol>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">What I Like About This Setup</h2>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Free SSL certificates</strong> - Automatically provisioned and renewed</li>
        <li><strong>Global load balancing</strong> - Traffic routed to the nearest Google edge location</li>
        <li><strong>Automatic HTTPS redirect</strong> - HTTP traffic redirects to HTTPS by default</li>
        <li><strong>No server management</strong> - Everything is managed by Google Cloud</li>
        <li><strong>Persistent across deployments</strong> - Domain mapping survives service updates</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Final Thoughts</h2>
      <p>
        Setting up a custom domain for Cloud Run is straightforward: verify domain ownership through Search Console, configure DNS records, and let Google provision SSL certificates automatically. 
        After the initial setup, the domain mapping persists across deployments—no additional configuration needed.
      </p>
      <p className="mt-4">
        After the initial setup, my domain mapping persists across all future deployments.
        I can continue deploying my service through GitHub Actions and my custom domain just keeps working
        without any additional configuration.
      </p>
    </article>
  );
}
