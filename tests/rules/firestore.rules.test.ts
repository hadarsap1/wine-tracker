import { readFileSync } from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { Timestamp } from "firebase/firestore";

/**
 * Firestore security-rules tests. Run inside the emulator:
 *   npx firebase-tools emulators:exec --only firestore --project demo-wine-tracker "npm run test:rules"
 *
 * These are regression tests for the household-takeover vulnerability where
 * any signed-in user could self-create a member doc in any household.
 */

let testEnv: RulesTestEnvironment;

const HOUSEHOLD = "house-1";
const CREATOR = "creator-uid";
const MEMBER = "member-uid";
const ATTACKER = "attacker-uid";

function memberDoc(uid: string, role: string) {
  return {
    userId: uid,
    displayName: "Someone",
    email: "someone@example.com",
    role,
    joinedAt: Timestamp.now(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-wine-tracker",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed: a household created by CREATOR with CREATOR as admin and MEMBER as member.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.doc(`households/${HOUSEHOLD}`).set({
      name: "Test Household",
      createdBy: CREATOR,
      memberCount: 2,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    await db.doc(`households/${HOUSEHOLD}/members/${CREATOR}`).set(memberDoc(CREATOR, "admin"));
    await db.doc(`households/${HOUSEHOLD}/members/${MEMBER}`).set(memberDoc(MEMBER, "member"));
    await db.doc(`households/${HOUSEHOLD}/wines/wine-1`).set({
      name: "Test Wine",
      nameNormalized: "test wine",
      type: "Red",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });
});

describe("household member creation (S1 regression)", () => {
  it("DENIES a stranger self-creating a member doc (member role)", async () => {
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(
      db.doc(`households/${HOUSEHOLD}/members/${ATTACKER}`).set(memberDoc(ATTACKER, "member"))
    );
  });

  it("DENIES a stranger self-creating a member doc (admin role)", async () => {
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(
      db.doc(`households/${HOUSEHOLD}/members/${ATTACKER}`).set(memberDoc(ATTACKER, "admin"))
    );
  });

  it("DENIES creating a member doc for someone else without admin", async () => {
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(
      db.doc(`households/${HOUSEHOLD}/members/other-uid`).set(memberDoc(ATTACKER, "member"))
    );
  });

  it("ALLOWS the household creator to bootstrap their own membership", async () => {
    // Fresh household without member docs yet
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("households/new-house").set({
        name: "New",
        createdBy: CREATOR,
        memberCount: 1,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
    const db = testEnv.authenticatedContext(CREATOR).firestore();
    await assertSucceeds(
      db.doc("households/new-house/members/" + CREATOR).set(memberDoc(CREATOR, "admin"))
    );
  });

  it("ALLOWS an admin to add a member", async () => {
    const db = testEnv.authenticatedContext(CREATOR).firestore();
    await assertSucceeds(
      db.doc(`households/${HOUSEHOLD}/members/new-member`).set(memberDoc("new-member", "member"))
    );
  });

  it("DENIES a non-admin member adding another member", async () => {
    const db = testEnv.authenticatedContext(MEMBER).firestore();
    await assertFails(
      db.doc(`households/${HOUSEHOLD}/members/new-member`).set(memberDoc("new-member", "member"))
    );
  });
});

describe("household data access", () => {
  it("ALLOWS members to read wines", async () => {
    const db = testEnv.authenticatedContext(MEMBER).firestore();
    await assertSucceeds(db.doc(`households/${HOUSEHOLD}/wines/wine-1`).get());
  });

  it("DENIES non-members reading wines", async () => {
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(db.doc(`households/${HOUSEHOLD}/wines/wine-1`).get());
  });

  it("DENIES unauthenticated reads", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(db.doc(`households/${HOUSEHOLD}/wines/wine-1`).get());
  });
});

describe("invites (S3 regression)", () => {
  const invite = (overrides: Record<string, unknown> = {}) => ({
    householdId: HOUSEHOLD,
    createdBy: CREATOR,
    used: false,
    expiresAt: Timestamp.fromMillis(Date.now() + 48 * 3600 * 1000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    ...overrides,
  });

  it("ALLOWS an admin to create a valid invite", async () => {
    const db = testEnv.authenticatedContext(CREATOR).firestore();
    await assertSucceeds(db.doc("invites/inv-1").set(invite()));
  });

  it("DENIES a non-admin member creating an invite", async () => {
    const db = testEnv.authenticatedContext(MEMBER).firestore();
    await assertFails(db.doc("invites/inv-2").set(invite({ createdBy: MEMBER })));
  });

  it("DENIES creating an invite that is already expired", async () => {
    const db = testEnv.authenticatedContext(CREATOR).firestore();
    await assertFails(
      db.doc("invites/inv-3").set(invite({ expiresAt: Timestamp.fromMillis(Date.now() - 1000) }))
    );
  });

  it("DENIES creating an invite valid for more than 7 days", async () => {
    const db = testEnv.authenticatedContext(CREATOR).firestore();
    await assertFails(
      db
        .doc("invites/inv-4")
        .set(invite({ expiresAt: Timestamp.fromMillis(Date.now() + 30 * 24 * 3600 * 1000) }))
    );
  });

  it("DENIES any client updating an invite (redemption is server-side only)", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("invites/inv-5").set(invite());
    });
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(db.doc("invites/inv-5").update({ used: true }));
  });

  it("DENIES listing the invites collection", async () => {
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(db.collection("invites").get());
  });
});

describe("user profiles", () => {
  const profile = (uid: string) => ({
    uid,
    email: "user@example.com",
    displayName: "User",
    householdIds: [],
    preferences: { currency: "USD", theme: "system" },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  it("ALLOWS a user to create their own profile", async () => {
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertSucceeds(db.doc("users/u1").set(profile("u1")));
  });

  it("DENIES creating a profile for another uid", async () => {
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(db.doc("users/u1").set(profile("u1")));
  });

  it("DENIES changing the email on update", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("users/u1").set(profile("u1"));
    });
    const db = testEnv.authenticatedContext("u1").firestore();
    await assertFails(db.doc("users/u1").update({ email: "evil@example.com" }));
  });

  it("DENIES reading someone else's profile", async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().doc("users/u1").set(profile("u1"));
    });
    const db = testEnv.authenticatedContext(ATTACKER).firestore();
    await assertFails(db.doc("users/u1").get());
  });
});

describe("rateLimits and unknown collections", () => {
  it("DENIES clients reading/writing rateLimits", async () => {
    const db = testEnv.authenticatedContext(MEMBER).firestore();
    await assertFails(db.doc(`rateLimits/${MEMBER}`).get());
    await assertFails(db.doc(`rateLimits/${MEMBER}`).set({ date: "2026-01-01" }));
  });

  it("DENIES access to vivinoCache", async () => {
    const db = testEnv.authenticatedContext(MEMBER).firestore();
    await assertFails(db.doc("vivinoCache/some-key").get());
  });
});
