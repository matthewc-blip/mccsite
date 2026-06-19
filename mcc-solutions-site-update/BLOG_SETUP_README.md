# MCC Solutions Blog — Setup Guide

This adds blog functionality to mcc-solutionsnj.com without touching anything
else on the site. New posts publish without ever needing to manually redeploy.

## What was added

```
/blog/index.html          <- Blog listing page (matches site design exactly)
/blog/post.html           <- Single post template (renders any post dynamically)
/blog/posts/index.json    <- List of all posts (auto-updated by Decap CMS)
/blog/posts/{slug}.json   <- Individual post content files
/admin/index.html         <- Decap CMS admin panel (loads the CMS UI)
/admin/config.yml         <- Decap CMS config (defines post fields, GitHub backend)
/cms-auth-worker.js       <- Cloudflare Worker code (NOT part of main site —
                              deployed as its own separate Worker)
```

Nav and footer on index.html got one new "Blog" link each. Nothing else changed.

## How it works day-to-day (once setup below is done)

1. Go to `mcc-solutionsnj.com/admin`
2. Log in with GitHub (one click, via the OAuth Worker)
3. Click "New Post," fill in title/category/excerpt/body
4. Hit "Publish"
5. Decap CMS commits a new file to `/blog/posts/{slug}.json` and updates
   `/blog/posts/index.json` in your GitHub repo
6. The post is live within seconds — `index.html` and `post.html` fetch the
   JSON files directly via JavaScript, so there's **no rebuild step** for new
   posts to appear. Cloudflare Pages only needs to redeploy if you change the
   actual page templates, not when you publish content.

## One-time setup (do this once)

### 1. Push these files to your GitHub repo
Add this `blog/`, `admin/` folder structure to whatever repo your Cloudflare
Pages site is already connected to. Commit and push — this one push is the
only "real" deploy needed; everything after this is just JSON file commits
from the CMS, which don't require a manual redeploy trigger.

### 2. Create a GitHub OAuth App
- Go to github.com/settings/developers -> OAuth Apps -> New OAuth App
- Application name: "MCC Solutions CMS"
- Homepage URL: https://mcc-solutionsnj.com
- Authorization callback URL: (you'll fill this in after step 3 below —
  it'll be your Worker's URL + /callback)
- Save it, copy the **Client ID**, generate and copy the **Client Secret**

### 3. Deploy the OAuth Worker
- Go to dash.cloudflare.com -> Workers & Pages -> Create -> Worker
- Name it `mcc-cms-auth` (or anything you like)
- Paste in the contents of `cms-auth-worker.js`
- Go to the Worker's Settings -> Variables -> add two **secret** environment
  variables:
  - `GITHUB_CLIENT_ID` = the Client ID from step 2
  - `GITHUB_CLIENT_SECRET` = the Client Secret from step 2
- Deploy. Cloudflare gives you a URL like:
  `https://mcc-cms-auth.your-subdomain.workers.dev`

### 4. Finish connecting the pieces
- Go back to your GitHub OAuth App settings, update the **Authorization
  callback URL** to: `https://mcc-cms-auth.your-subdomain.workers.dev/callback`
- Open `admin/config.yml` and update:
  - `repo:` to your actual `username/repo-name`
  - `base_url:` to your actual Worker URL (no trailing slash)

### 5. Test it
- Go to `mcc-solutionsnj.com/admin`
- Click to log in with GitHub, authorize the app
- You should land in the Decap CMS dashboard with "Blog Posts" as a collection
- Try publishing a test post, confirm it shows up at `mcc-solutionsnj.com/blog/`
  within a few seconds, no manual redeploy

## Cost
Everything here is free at this scale:
- Cloudflare Pages: free tier, unlimited bandwidth, 500 builds/month
- Cloudflare Workers: free tier, 100,000 requests/day (the OAuth handshake
  uses maybe a dozen requests a month)
- Decap CMS: free, open-source, no account needed
- GitHub: free for a repo this size
