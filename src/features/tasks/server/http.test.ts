import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORBIDDEN,
  MAX_BODY_BYTES,
  PAYLOAD_TOO_LARGE,
  UNSUPPORTED_MEDIA_TYPE,
  isSameSite,
  readJsonBody,
  statusFor,
} from "./http.ts";
import { NOT_FOUND, UNAUTHORIZED } from "./tasks.ts";

// The server sees its own host in req.url (here "internal"), not the browser's.
const URL_ = "http://internal:3000/api/tasks";
const write = (body: string, headers: Record<string, string> = {}) =>
  new Request(URL_, { method: "POST", body, headers: { "content-type": "application/json", ...headers } });
const del = (headers: Record<string, string>) => new Request(URL_, { method: "DELETE", headers });

test("reads JSON from this site", async () => {
  assert.deepEqual(await readJsonBody(write('{"title":"x"}', { "sec-fetch-site": "same-origin" })), {
    ok: true,
    value: { title: "x" },
  });
  // No Sec-Fetch-Site: the Origin host must be the requested host.
  assert.deepEqual(await readJsonBody(write("[1]", { origin: "https://tasks.example", host: "tasks.example" })), {
    ok: true,
    value: [1],
  });
  // Non-browser clients send neither header; they still need the session.
  assert.deepEqual(await readJsonBody(write("{", { "content-type": "application/json; charset=utf-8" })), {
    ok: true,
    value: null,
  });
});

test("same site does not depend on req.url", () => {
  assert.equal(isSameSite(del({ "sec-fetch-site": "same-origin", origin: "https://tasks.example" })), true);
  assert.equal(isSameSite(del({ origin: "https://tasks.example", "x-forwarded-host": "tasks.example", host: "internal:3000" })), true);
});

test("refuses writes from another site", async () => {
  const cases: Record<string, string>[] = [
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
    { origin: "https://evil.example", host: "tasks.example" },
    { origin: "not a url", host: "tasks.example" },
  ];
  for (const headers of cases) {
    assert.deepEqual(await readJsonBody(write("{}", headers)), { ok: false, error: FORBIDDEN }, JSON.stringify(headers));
    assert.equal(isSameSite(del(headers)), false);
  }
});

test("refuses bodies that are not JSON (a cross-site form posts text/plain)", async () => {
  assert.deepEqual(await readJsonBody(write("{}", { "content-type": "text/plain" })), {
    ok: false,
    error: UNSUPPORTED_MEDIA_TYPE,
  });
});

test("refuses bodies over the limit", async () => {
  const big = JSON.stringify({ note: "x".repeat(MAX_BODY_BYTES) });
  assert.deepEqual(await readJsonBody(write(big)), { ok: false, error: PAYLOAD_TOO_LARGE });
});

test("maps errors to statuses", () => {
  assert.equal(statusFor(UNAUTHORIZED), 401);
  assert.equal(statusFor(FORBIDDEN), 403);
  assert.equal(statusFor(NOT_FOUND), 404);
  assert.equal(statusFor(PAYLOAD_TOO_LARGE), 413);
  assert.equal(statusFor(UNSUPPORTED_MEDIA_TYPE), 415);
  assert.equal(statusFor("Title is required"), 400);
});
