/**
 * MCC Solutions — Decap CMS GitHub OAuth Worker
 *
 * This is a small, separate Cloudflare Worker (NOT part of the main site deploy).
 * It exists solely to handle the GitHub OAuth handshake so Decap CMS's admin
 * panel (/admin) can authenticate and commit new blog posts to the GitHub repo.
 *
 * SETUP STEPS:
 * 1. Go to dash.cloudflare.com -> Workers & Pages -> Create -> Worker
 * 2. Name it something like "mcc-cms-auth"
 * 3. Paste this code in, replacing the placeholder values below
 * 4. Add two environment variables (Settings -> Variables) on the Worker:
 *      GITHUB_CLIENT_ID     = (from your GitHub OAuth App)
 *      GITHUB_CLIENT_SECRET = (from your GitHub OAuth App)
 * 5. Deploy. Note the Worker's URL (e.g. mcc-cms-auth.yoursubdomain.workers.dev)
 * 6. Update admin/config.yml's "base_url" to that Worker URL
 * 7. Update your GitHub OAuth App's "Authorization callback URL" to:
 *      https://mcc-cms-auth.yoursubdomain.workers.dev/callback
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Step 1: Decap CMS hits /auth, we redirect to GitHub's authorize page
    if (url.pathname === "/auth") {
      const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
      githubAuthUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      githubAuthUrl.searchParams.set("scope", "repo,user");
      githubAuthUrl.searchParams.set(
        "redirect_uri",
        `${url.origin}/callback`
      );
      return Response.redirect(githubAuthUrl.toString(), 302);
    }

    // Step 2: GitHub redirects back here with a ?code=, we exchange it for a token
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response("Missing code", { status: 400 });
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: code,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        return new Response(`OAuth error: ${tokenData.error_description || tokenData.error}`, { status: 400 });
      }

      const token = tokenData.access_token;

      // Decap CMS expects this exact postMessage handshake to complete login
      const script = `
        <!DOCTYPE html><html><body>
        <script>
          (function() {
            function receiveMessage(e) {
              window.opener.postMessage(
                'authorization:github:success:${JSON.stringify({ token }).replace(/'/g, "\\'")}',
                e.origin
              );
              window.removeEventListener("message", receiveMessage, false);
            }
            window.addEventListener("message", receiveMessage, false);
            window.opener.postMessage("authorizing:github", "*");
          })();
        </script>
        </body></html>
      `;

      return new Response(script, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("MCC Solutions CMS Auth Worker — not a public page.", { status: 404 });
  },
};
