import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const testDataDir = mkdtempSync(join(tmpdir(), "deja-world-bot-storage-"));
process.env.DATA_DIR = testDataDir;

const storage = await import("../src/storage.js");

after(() => {
  rmSync(testDataDir, { recursive: true, force: true });
});

void test("serializes concurrent credit mutations without losing updates", async () => {
  await storage.upsertUser({ id: "concurrent-user", first_name: "Concurrent" });

  await Promise.all(Array.from({ length: 20 }, () => storage.addUserCredits("concurrent-user", 1)));

  const user = await storage.getUser("concurrent-user");
  assert.equal(user?.messageCredits, 20);
});

void test("persists and clears the adult age confirmation", async () => {
  await storage.upsertUser({ id: "age-user", first_name: "Age" });
  assert.equal(storage.hasConfirmedAdultAge(await storage.getUser("age-user")), false);

  await storage.setUserAgeConfirmed("age-user", true);
  assert.equal(storage.hasConfirmedAdultAge(await storage.getUser("age-user")), true);

  await storage.setUserAgeConfirmed("age-user", false);
  assert.equal(storage.hasConfirmedAdultAge(await storage.getUser("age-user")), false);
});

void test("extends an active membership instead of replacing its remaining time", async () => {
  await storage.upsertUser({ id: "renewal-user", first_name: "Renewal" });
  const request = {
    kind: "membership",
    optionKey: "girlfriend_monthly",
    label: "Monthly Girlfriend Experience",
    accessType: "girlfriend"
  } as const;

  const first = await storage.recordStarsPaymentDelivery("renewal-user", {
    offerId: "girlfriend_monthly",
    stars: 12_500,
    telegramPaymentChargeId: "renewal-charge-1",
    payload: "deja:offer:girlfriend_monthly",
    accessType: "girlfriend",
    durationDays: 30,
    request
  });
  const second = await storage.recordStarsPaymentDelivery("renewal-user", {
    offerId: "girlfriend_monthly",
    stars: 12_500,
    telegramPaymentChargeId: "renewal-charge-2",
    payload: "deja:offer:girlfriend_monthly",
    accessType: "girlfriend",
    durationDays: 30,
    request
  });

  const extensionDays =
    (Date.parse(second.user.membershipExpiresAt ?? "") - Date.parse(first.user.membershipExpiresAt ?? "")) /
    (24 * 60 * 60 * 1000);
  assert.ok(extensionDays > 29.9 && extensionDays < 30.1);
});

void test("approves only the manual request attached to an admin action", async () => {
  const telegramUser = { id: "manual-user", first_name: "Manual" };
  await storage.upsertUser(telegramUser);
  const creditRequest = await storage.createManualPaymentRequest(telegramUser, "message_credits", {
    note: "30 messages"
  });
  const vipRequest = await storage.createManualPaymentRequest(telegramUser, "vip", {
    note: "VIP access"
  });

  await storage.addUserCredits("manual-user", 30, {
    manualRequestId: creditRequest.request.requestId
  });

  const user = await storage.getUser("manual-user");
  const creditStatus = user?.manualPaymentRequests?.find(
    (request) => request.requestId === creditRequest.request.requestId
  )?.status;
  const vipStatus = user?.manualPaymentRequests?.find(
    (request) => request.requestId === vipRequest.request.requestId
  )?.status;

  assert.equal(creditStatus, "approved");
  assert.equal(vipStatus, "pending");
  assert.equal(user?.adminApprovalStatus, "pending");
});
