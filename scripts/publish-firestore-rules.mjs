#!/usr/bin/env node
/**
 * Publishes firestore.rules via the Firebase Rules REST API.
 *
 * Why not `firebase deploy --only firestore:rules`? The CLI runs a Service
 * Usage precheck ("ensuring required API firestore.googleapis.com is enabled")
 * before it writes anything. A deploy service account without
 * serviceusage.services.get gets a 403 there and the CLI aborts — so the rules
 * never get published, even when the account *can* write them.
 *
 * Publishing rules only needs firebaserules.googleapis.com, so we mint a token
 * from the service account and talk to that API directly.
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS pointing at a service-account JSON.
 * Usage: node scripts/publish-firestore-rules.mjs <projectId> [rulesFile]
 */

import { createSign } from "node:crypto";
import { readFileSync } from "node:fs";

const [, , projectId, rulesFile = "firestore.rules"] = process.argv;
if (!projectId) {
  console.error("usage: publish-firestore-rules.mjs <projectId> [rulesFile]");
  process.exit(2);
}

const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credsPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS is not set");
  process.exit(2);
}

const creds = JSON.parse(readFileSync(credsPath, "utf8"));
const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Mints an OAuth access token from the service account (RS256 JWT bearer flow). */
async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: "https://www.googleapis.com/auth/firebase",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const signature = signer.sign(creds.private_key).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const assertion = `${header}.${claim}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${JSON.stringify(json)}`);
  return json.access_token;
}

async function api(token, method, path, body) {
  const res = await fetch(`https://firebaserules.googleapis.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

const source = readFileSync(rulesFile, "utf8");
const token = await getAccessToken();

// 1. Upload the ruleset.
const created = await api(token, "POST", `projects/${projectId}/rulesets`, {
  source: { files: [{ name: rulesFile, content: source }] },
});
if (!created.ok) {
  console.error(`Failed to create ruleset: ${created.status}`);
  console.error(JSON.stringify(created.json, null, 2));
  process.exit(1);
}
const rulesetName = created.json.name;
console.log(`Created ruleset: ${rulesetName}`);

// 2. Point the live release at it (update, falling back to create).
const releaseName = `projects/${projectId}/releases/cloud.firestore`;
let released = await api(token, "PATCH", releaseName, {
  release: { name: releaseName, rulesetName },
});
if (!released.ok && released.status === 404) {
  released = await api(token, "POST", `projects/${projectId}/releases`, {
    name: releaseName,
    rulesetName,
  });
}
if (!released.ok) {
  console.error(`Failed to release ruleset: ${released.status}`);
  console.error(JSON.stringify(released.json, null, 2));
  process.exit(1);
}

console.log(`Released ${rulesetName} to cloud.firestore`);
