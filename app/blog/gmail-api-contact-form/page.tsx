export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          Building a Contact Form with the Gmail API and OAuth2
        </h1>
        <time className="text-gray-500">December 26, 2025</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        When I started setting up my site I wanted to include a contact form, but I didn't feel like dealing with another third-party service.  
        Turns out the Gmail API is perfect for this, and it's surprisingly straightforward once I got my arms around the OAuth2 flow.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Why the Gmail API?</h2>
      <p>
        I looked at a few options for handling contact form submissions. SendGrid and Mailgun
        are great, but they felt like overkill for a personal site. SMTP works, but managing
        app-specific passwords is kind of annoying. The Gmail API hit the sweet spot:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Use what I already have</strong> - My existing Gmail account, no new accounts needed</li>
        <li><strong>Actually secure</strong> - OAuth2 handles everything, no passwords floating around</li>
        <li><strong>Generous free tier</strong> - 2,000 emails/day is way more than I'll ever need</li>
        <li><strong>Battle-tested</strong> - Gmail handles billions of emails a day worldwide, so reliability isn't a concern</li>
        <li><strong>Deploy anywhere</strong> - Works on Cloud Run, Vercel, wherever</li>
      </ul>
      <p>
        I was surprised by how easy it was to set up the OAuth2 refresh tokens. You authorize once, get a token,
        and then emails just work automatically!
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">How OAuth2 Actually Works Here</h2>
      <ol className="list-decimal pl-6 mb-4">
        <li><strong>You click authorize</strong> - One time, in your browser, you say "yes, this app can send emails"</li>
        <li><strong>Google gives you a refresh token</strong> - Think of it as a long-lived permission slip</li>
        <li><strong>The library does the rest</strong> - googleapis automatically handles refreshing access tokens</li>
        <li><strong>Deploy and forget</strong> - Same token works on your laptop, in production, anywhere</li>
      </ol>
      <p>
        You authorize <em>once</em> on your local machine, grab the refresh
        token, and deploy it. From then on, emails just work. No clicking, no user interaction,
        no expiration headaches (unless you revoke it yourself).
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Setting Up GCP (The Fun Part)</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">First, Enable the Gmail API</h3>
      <p>This is the easy part - just one command:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud services enable gmail.googleapis.com --project=YOUR_PROJECT_ID`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Create OAuth2 Credentials</h3>
      <p>Head over to the GCP Console and:</p>
      <ol className="list-decimal pl-6 mb-4">
        <li>Go to APIs & Services → Credentials</li>
        <li>Click "Create Credentials" → "OAuth 2.0 Client ID"</li>
        <li>Application type: "Web application"</li>
        <li>Add redirect URI: <code>http://localhost:3000/api/auth/callback</code></li>
        <li>Save the Client ID and Client Secret</li>
      </ol>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">OAuth Consent Screen</h3>
      <p>
        Google needs to know what permissions you're asking for:
      </p>
      <ol className="list-decimal pl-6 mb-4">
        <li>Go to APIs & Services → OAuth consent screen</li>
        <li>Pick "External" (even though it's just you - standard Gmail accounts need this)</li>
        <li>Add the scope: <code>https://www.googleapis.com/auth/gmail.send</code></li>
        <li>Add yourself as a test user (yes, really)</li>
      </ol>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">The Code</h2>

      <p>
        Alright, let's look at how this actually works. I'm using <code>googleapis</code> and{' '}
        <code>google-auth-library</code> - Google's official packages. The full code is on{' '}
        <a href="https://github.com/gallaglo/personal-website" className="text-blue-600 hover:text-blue-800 hover:underline" target="_blank" rel="noopener noreferrer">
          GitHub
        </a> if you want to see everything.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Getting Your Refresh Token</h3>
      <p>
        I wrote a small script (<code>scripts/get-gmail-token.js</code>) that handles the
        one-time OAuth dance. It spins up a local server, opens your browser, and spits out
        the refresh token you need:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`// scripts/get-gmail-token.js
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:3000/api/auth/callback'
);

const scopes = ['https://www.googleapis.com/auth/gmail.send'];

async function getToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force to get refresh token
  });

  console.log('Authorize this app by visiting this url:', authUrl);

  // Use dynamic import for ES module
  const open = (await import('open')).default;
  await open(authUrl);

  const server = http.createServer(async (req, res) => {
    if (req.url.indexOf('/api/auth/callback') > -1) {
      const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
      const code = qs.get('code');

      res.end('Authentication successful! You can close this window.');
      server.close();

      const { tokens } = await oauth2Client.getToken(code);
      console.log('\\n\\nAdd this to your .env.local file:');
      console.log(\`GMAIL_REFRESH_TOKEN=\${tokens.refresh_token}\`);
      process.exit(0);
    }
  }).listen(3000);
}

getToken();`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Run It Once</h3>
      <p>Set your credentials and run it - it'll pop open a browser and you click "allow":</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`export GMAIL_CLIENT_ID="your-client-id"
export GMAIL_CLIENT_SECRET="your-client-secret"
npm run get-gmail-token`}</code>
      </pre>
      <p>
        Copy the refresh token it outputs. That's it. Never have to do this again.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">The Gmail Utility Module</h3>
      <p>
        All the Gmail API stuff lives in <code>lib/gmail.ts</code>. It handles OAuth,
        constructs properly formatted MIME messages and sends them via the API:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`// lib/gmail.ts
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

function getOAuth2Client(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return oauth2Client;
}

function createMimeMessage(params: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const { to, from, replyTo, subject, text, html } = params;

  const messageParts = [
    \`From: \${from}\`,
    \`To: \${to}\`,
    \`Reply-To: \${replyTo}\`,
    \`Subject: \${subject}\`,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="boundary"',
    '',
    '--boundary',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    text,
    '',
    '--boundary',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html,
    '',
    '--boundary--',
  ];

  return messageParts.join('\\r\\n');
}

export async function sendEmail(params: {
  to: string;
  from: string;
  replyTo: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const oauth2Client = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const mimeMessage = createMimeMessage(params);
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\\+/g, '-')
    .replace(/\\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  });
}`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">The Contact Form Endpoint</h3>
      <p>
        The actual API route (<code>app/api/contact/route.ts</code>) simply validates the form data and calls our Gmail utility:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`// app/api/contact/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendEmail, validateGmailConfig } from "@/lib/gmail";

export async function POST(request: NextRequest) {
  try {
    validateGmailConfig();

    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    await sendEmail({
      from: process.env.GMAIL_USER!,
      to: process.env.GMAIL_USER!,
      replyTo: email,
      subject: \`Contact form submission from \${name}\`,
      text: \`Name: \${name}\\nEmail: \${email}\\n\\nMessage:\\n\${message}\`,
      html: \`
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> \${name}</p>
        <p><strong>Email:</strong> \${email}</p>
        <p><strong>Message:</strong></p>
        <p>\${message.replace(/\\n/g, "<br>")}</p>
      \`,
    });

    return NextResponse.json(
      { success: true, message: "Email sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}`}</code>
      </pre>

      <p className="mt-4">Here's what the contact form looks like when someone fills it out:</p>
      <img
        src="/blog/contact-form-submission-redacted.png"
        alt="Screenshot of a filled contact form showing name, email, and message fields with a submit button"
        className="rounded-lg border border-gray-200 shadow-md my-6"
      />

      <p className="mt-4">And here's the email I receive in my Gmail inbox:</p>
      <img
        src="/blog/email-received-redacted.png"
        alt="Screenshot of Gmail inbox showing a received contact form submission email with sender details and message content"
        className="rounded-lg border border-gray-200 shadow-md my-6"
      />

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Deploying to Production</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Use Secret Manager</h3>
      <p>
        Don't put your credentials directly in environment variables - use Secret Manager.
        It's built for this and works great with Cloud Run:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Create secrets
echo -n "your-email@gmail.com" | gcloud secrets create gmail-user --data-file=-
echo -n "your-client-id" | gcloud secrets create gmail-client-id --data-file=-
echo -n "your-client-secret" | gcloud secrets create gmail-client-secret --data-file=-
echo -n "your-refresh-token" | gcloud secrets create gmail-refresh-token --data-file=-

# Grant Cloud Run access
for secret in gmail-user gmail-client-id gmail-client-secret gmail-refresh-token; do
  gcloud secrets add-iam-policy-binding $secret \\
    --member="serviceAccount:YOUR_SERVICE_ACCOUNT" \\
    --role="roles/secretmanager.secretAccessor"
done`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Wire Up GitHub Actions</h3>
      <p>
        I use GitHub Actions for deployments (wrote about that{' '}
        <a href="/blog/github-actions-cloud-run" className="text-blue-600 hover:text-blue-800 hover:underline">
          here
        </a>). Just tell Cloud Run to grab the secrets:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`- name: Deploy to Cloud Run (main branch)
  if: github.ref == 'refs/heads/main'
  run: |
    gcloud run deploy personal-website \\
      --image=\${{ secrets.GCP_REGION }}-docker.pkg.dev/\${{ secrets.GCP_PROJECT_ID }}/\${{ env.REPOSITORY }}/\${{ env.IMAGE }}:latest \\
      --region=\${{ secrets.GCP_REGION }} \\
      --platform=managed \\
      --allow-unauthenticated \\
      --update-secrets="GMAIL_USER=gmail-user:latest,GMAIL_CLIENT_ID=gmail-client-id:latest,GMAIL_CLIENT_SECRET=gmail-client-secret:latest,GMAIL_REFRESH_TOKEN=gmail-refresh-token:latest"`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">A Few Things Worth Knowing</h2>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">One Token to Rule Them All</h3>
      <p>
        The refresh token works everywhere. Local dev? Same token in <code>.env.local</code>.
        Production? Same token in Secret Manager. The googleapis library just handles refreshing
        access tokens automatically.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">Email Is Weirdly Complicated</h3>
      <p>
        The Gmail API wants messages in RFC 2822 format with MIME boundaries and base64url
        encoding. The utility function allowed me to never think about it again. 
        Just call <code>sendEmail()</code>.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">No Runtime Surprises</h3>
      <p>
        This isn't one of those OAuth flows where users have to click "allow" when they submit
        your form. You authorize once, the token lives on your server, and emails just go out.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Why I Like This Setup</h2>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Secure by default</strong> - OAuth2 tokens, no passwords to leak</li>
        <li><strong>Completely free</strong> - 2,000 emails/day is way more than I'll ever need</li>
        <li><strong>Set and forget</strong> - Token refresh is automatic, deploys anywhere</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Final Thoughts</h2>
      <p>
        This turned out way simpler than I expected. Setting up the OAuth2 flow seemed intimidating at first, 
        but once I understood the refresh token pattern, it's just a one-time setup. After that, it's fire-and-forget.
      </p>
      <p className="mt-4">
        For a personal website or small project, this hits the sweet spot. You get enterprise-grade security 
        without the complexity, and in my case it allowed me to use tools I already rely on (Gmail, GCP). 
        No new accounts, no additional billing, no third-party dependencies. Just clean, simple email that works.
      </p>
    </article>
  );
}
