import { generateShortCode, getShortLink, storeShortLink } from "./db.ts";
import { Router } from "./router.ts";

import { HomePage } from "./ui.tsx";
import { render } from "npm:preact-render-to-string";

import { createGitHubOAuthConfig, createHelpers } from "jsr:@deno/kv-oauth";
import { handleGithubCallback } from "./auth.ts";

const app = new Router();

const oauthConfig = createGitHubOAuthConfig({
  redirectUri: Deno.env.get("REDIRECT_URI"),
});
const { signIn, signOut } = createHelpers(oauthConfig);

app.get("/oauth/signin", (req: Request) => signIn(req));
app.get("/oauth/signout", signOut);
app.get("/oauth/callback", handleGithubCallback);

app.get("/", () => {
  return new Response(render(HomePage({ user: app.currentUser })), {
    status: 200,
    headers: {
      "content-type": "text/html",
    },
  });
});

app.post("/links", async (req) => {
  const { longUrl } = await req.json();

  const shortCode = await generateShortCode(longUrl);
  await storeShortLink(longUrl, shortCode, "testUser");

  return new Response("success!", {
    status: 201,
  });
});

app.get("/links/:id", async (_req, _info, params) => {
  const shortCode = params?.id;

  const data = await getShortLink(shortCode!);

  return new Response(JSON.stringify(data), {
    status: 201,
    headers: {
      "content-type": "application/json",
    },
  });
});

export default {
  fetch(req) {
    return app.handler(req);
  },
} satisfies Deno.ServeDefaultExport;
