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
      console.log('\n\nAdd this to your .env.local file:');
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      process.exit(0);
    }
  }).listen(3000, () => {
    console.log('Listening on http://localhost:3000');
  });
}

getToken();
