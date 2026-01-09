export default function BlogPost() {
  return (
    <article className="prose prose-gray max-w-none">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 font-sans">
          Monitoring Gmail API Errors with Cloud Logging
        </h1>
        <time className="text-gray-500">January 8, 2026</time>
      </header>

      <p className="lead text-xl text-gray-700 mb-6">
        My contact form stopped working with an <code>invalid_grant</code> error. Instead of waiting for users to report issues,
        I set up Cloud Logging alerts to notify me immediately when the Gmail API has problems.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">The Problem</h2>
      <p>
        My brother was checking out my site and decided to test the contact form. Instead of getting a success
        message, he got this error and texted me a screenshot:
      </p>
      <img
        src="/blog/contact-form-error.png"
        alt="Contact form error showing 'Failed to send email' message"
        className="rounded-lg border border-gray-200 shadow-md my-6"
      />

      <p>
        Not exactly the first impression I wanted to make. I immediately checked the Cloud Run logs and found
        the root cause:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`DEFAULT 2026-01-09T04:29:53.410642Z Gmail API error: Error: invalid_grant
DEFAULT 2026-01-09T04:29:53.410668Z at m._request (.next/server/chunks/[root-of-the-server]__f35854dd._.js:15:22223)
...
DEFAULT 2026-01-09T04:29:53.416475Z Error sending email: Error: Failed to send email via Gmail API`}</code>
      </pre>

      <p>
        The <code>invalid_grant</code> error meant my OAuth refresh token had expired. I had
        set up the{' '}
        <a href="/blog/gmail-api-contact-form" className="text-blue-600 hover:text-blue-800 hover:underline">
          Gmail API for my contact form
        </a>
        {' '}a few weeks ago, but I didn't realize refresh tokens could expire.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Why Gmail Refresh Tokens Expire</h2>
      <p>
        Gmail OAuth refresh tokens don't have a fixed expiration, but they can become invalid:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Inactivity</strong> - If unused for 6 months, Google may invalidate the token</li>
        <li><strong>Manual revocation</strong> - If you revoke access in your Google Account settings</li>
        <li><strong>Token limits</strong> - Google caps refresh tokens at ~50 per user per app</li>
        <li><strong>Security events</strong> - Password changes sometimes invalidate tokens</li>
      </ul>

      <p>
        In my case, the token was probably invalidated due to inactivity or a security event. The good news?
        As long as the refresh token is used regularly (even once every 6 months), it stays valid indefinitely.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">The Immediate Fix</h2>
      <p>
        First, I needed to regenerate the refresh token. I already had a script for this from the
        initial setup:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Make sure your Gmail client credentials are in .env.local
export $(grep -E "^GMAIL_CLIENT_ID=|^GMAIL_CLIENT_SECRET=" .env.local | xargs)

# Run the token generation script
npm run get-gmail-token`}</code>
      </pre>

      <p>
        This opens a browser, prompts for Google authorization, and outputs a new refresh token.
        Then I updated both my local environment and production:
      </p>

      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Update the secret in GCP Secret Manager
echo -n "your-new-refresh-token" | gcloud secrets versions add gmail-refresh-token --data-file=-

# Update Cloud Run to use the new token
gcloud run services update personal-website \\
  --region=us-west1 \\
  --update-secrets="GMAIL_REFRESH_TOKEN=gmail-refresh-token:latest"`}</code>
      </pre>

      <p>
        The contact form was back up in minutes. But I didn't want to discover these failures
        reactively - I needed proactive monitoring.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">The Long-Term Solution: Cloud Logging Alerts</h2>
      <p>
        Instead of manually checking logs or relying on users to report errors, I set up Cloud Logging
        to alert me whenever the Gmail API fails. Here's how:
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">1. Create a Log-Based Metric</h3>
      <p>
        First, create a metric that tracks Gmail API authentication errors:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud logging metrics create gmail_api_errors \\
  --description="Tracks Gmail API authentication errors (invalid_grant)" \\
  --log-filter='resource.type="cloud_run_revision"
resource.labels.service_name="personal-website"
severity>=ERROR
(jsonPayload.message=~"Gmail API error.*invalid_grant" OR
 textPayload=~"Gmail API error.*invalid_grant")'`}</code>
      </pre>

      <p>
        This metric increments every time Cloud Run logs contain both "Gmail API error" and "invalid_grant".
        The regex pattern catches the error regardless of how Next.js formats the log message.
      </p>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">2. Set Up a Notification Channel</h3>
      <p>
        Create an email notification channel:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud beta monitoring channels create \\
  --display-name="Gmail API Errors - Email Alert" \\
  --type=email \\
  --channel-labels=email_address=your-email@gmail.com`}</code>
      </pre>

      <h3 className="text-xl font-semibold mt-6 mb-3 font-sans">3. Create the Alert Policy</h3>
      <p>
        I created a YAML policy file that triggers when any Gmail errors occur:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# monitoring/gmail-alert-policy.yaml
displayName: "Gmail API Authentication Error Alert"
documentation:
  content: "Alert when Gmail API returns invalid_grant error, indicating the refresh token needs to be regenerated."
  mimeType: "text/markdown"
conditions:
  - displayName: "Gmail API invalid_grant error detected"
    conditionThreshold:
      filter: 'resource.type = "cloud_run_revision" AND metric.type = "logging.googleapis.com/user/gmail_api_errors"'
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 0s
      aggregations:
        - alignmentPeriod: 60s
          perSeriesAligner: ALIGN_RATE
notificationChannels:
  - projects/YOUR_PROJECT/notificationChannels/YOUR_CHANNEL_ID
alertStrategy:
  autoClose: 86400s
combiner: OR`}</code>
      </pre>

      <p>Then deploy the policy:</p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`gcloud alpha monitoring policies create --policy-from-file=monitoring/gmail-alert-policy.yaml`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">How It Works</h2>
      <p>
        Now when the Gmail API fails:
      </p>
      <ol className="list-decimal pl-6 mb-4">
        <li>Cloud Run logs the error with "Gmail API error" and "invalid_grant"</li>
        <li>The log-based metric <code>gmail_api_errors</code> increments</li>
        <li>The alert policy detects the metric value {'>'} 0 within 60 seconds</li>
        <li>An email notification is sent immediately</li>
        <li>The alert auto-closes after 24 hours if no new errors occur</li>
      </ol>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Why This is Better Than Periodic Refreshing</h2>
      <p>
        My first instinct was to set up a cron job to periodically regenerate the refresh token. But that's
        unnecessary:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Tokens don't expire on a schedule</strong> - They stay valid as long as they're used</li>
        <li><strong>Each contact form submission resets the timer</strong> - The googleapis library automatically uses the refresh token to get new access tokens</li>
        <li><strong>Alerts are reactive to real problems</strong> - No false work, only actionable notifications</li>
        <li><strong>Monitors all Gmail API failures</strong> - Not just token expiration</li>
      </ul>

      <p>
        With monitoring in place, I only need to regenerate the token when I actually get an alert.
        No wasted effort, no unnecessary automation.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Verifying the Setup</h2>
      <p>
        You can verify everything is configured correctly:
      </p>
      <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
        <code>{`# Check the log-based metric
gcloud logging metrics describe gmail_api_errors

# List alert policies
gcloud alpha monitoring policies list --filter="displayName:'Gmail API'"

# View notification channels
gcloud beta monitoring channels list`}</code>
      </pre>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Cost Considerations</h2>
      <p>
        Cloud Logging and Monitoring have generous free tiers:
      </p>
      <ul className="list-disc pl-6 mb-4">
        <li><strong>Cloud Logging</strong> - First 50 GB of logs per month are free</li>
        <li><strong>Log-based metrics</strong> - First 50 metrics are free</li>
        <li><strong>Cloud Monitoring</strong> - First 150 MB of metric data per month are free</li>
        <li><strong>Alerting</strong> - Unlimited alert policies and notifications</li>
      </ul>
      <p>
        For a personal website with low traffic, this monitoring setup costs nothing.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4 font-sans">Conclusion</h2>
      <p>
        Setting up Cloud Logging alerts transformed how I handle errors. Instead of discovering problems
        days later or relying on users to report issues, I get immediate notifications when something breaks.
      </p>
      <p className="mt-4">
        The entire setup took about 15 minutes, and now I have confidence that my contact form is working
        correctly. If the Gmail API fails for any reason - expired tokens, API quota issues, authentication
        problems - I'll know within minutes and can fix it before it impacts users.
      </p>
      <p className="mt-4">
        This approach applies beyond Gmail API monitoring. Any critical service integration or external API
        call is a candidate for log-based alerting. The pattern is simple: identify the error signature in
        your logs, create a metric, and set up an alert. Your future self will thank you.
      </p>
    </article>
  );
}
