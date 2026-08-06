# Deploying the Project ABC Worker

This is the small server-side piece that holds your Anthropic API key so it
never sits in the phone app. You only need to do this once.

## 1. Install the Cloudflare CLI (Wrangler)

```
npm install -g wrangler
```

## 2. Log in

```
wrangler login
```

This opens a browser tab to authorise Wrangler against your (free)
Cloudflare account. Sign up at cloudflare.com first if you don't have one.

## 3. Add your Anthropic API key as a secret

From inside the `worker/` folder:

```
wrangler secret put ANTHROPIC_API_KEY
```

It will prompt you to paste the key. This stores it encrypted on
Cloudflare's side — it is never written to any file in this project.

## 4. Deploy

```
wrangler deploy
```

This prints a URL like:

```
https://project-abc-api.<your-subdomain>.workers.dev
```

## 5. Point the app at it

In the main project folder, create a file called `.env` (same level as
`package.json`) containing:

```
VITE_WORKER_URL=https://project-abc-api.<your-subdomain>.workers.dev
```

Rebuild the app (`npm run build`) so it picks up the URL. `.env` should
NOT be committed to GitHub — add it to `.gitignore`.

## Notes

- The free Cloudflare Workers tier (100,000 requests/day) is far more than
  a personal app will ever use.
- `ALLOWED_ORIGIN` in `worker.js` is left as `*` for now. Once your app is
  live on GitHub Pages, change it to your actual Pages URL
  (e.g. `https://yourname.github.io`) so only your app can call the worker.
- If you ever regenerate your Anthropic API key, just re-run step 3.
