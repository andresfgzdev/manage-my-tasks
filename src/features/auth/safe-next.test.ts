import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "./safe-next.ts";

test("keeps paths on this site", () => {
  assert.equal(safeNext("/week"), "/week");
  assert.equal(safeNext("/inbox?x=1#top"), "/inbox?x=1#top");
  // Encoded characters stay encoded: harmless in a path.
  assert.equal(safeNext("/%0a"), "/%0a");
});

test("falls back to /today for anything a browser could read as another site", () => {
  for (const next of [
    undefined,
    null,
    ["/week"],
    "",
    "week",
    "//evil.com",
    "/\\evil.com",
    "/\\/evil.com",
    "https://evil.com",
    "javascript:alert(1)",
    "/\tevil",
    "/\n/evil.com",
  ]) {
    assert.equal(safeNext(next), "/today", JSON.stringify(next));
  }
});
