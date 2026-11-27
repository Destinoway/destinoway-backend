import test from "node:test";
import assert from "node:assert/strict";
import twilio from "twilio";
import { parseMobileNumber, normalizeMobileCountryCode, assertMobileCountryMatches } from "../src/utils/mobileNumber.js";
import { normalizeSupportPhones } from "../src/modules/supportContact/support.phones.js";
import User from "../src/modules/user/user.model.js";
import { findOrCreateAndMergeUser } from "../src/modules/auth/customer-auth/auth.service.js";
import { sendOTPService, verifyOTPService } from "../src/modules/auth/customer-auth/otp/otp.service.js";
import {
  serializeCustomerProfile,
  updateProfileService,
} from "../src/modules/auth/customer-auth/customerProfile/profile.service.js";
import { mapContactInfo, mapStoredContactInfo, mapStoredRooms } from "../src/modules/hotel/hotel/itinerary/hotelItineraryContact.mapper.js";

test("phone normalization preserves national numbers and validates calling codes", () => {
  assert.deepEqual(parseMobileNumber("9876543210"), { mobile: "9876543210", mobileCountryCode: "+91" });
  assert.deepEqual(parseMobileNumber("+44 7700 900123", "44"), { mobile: "7700900123", mobileCountryCode: "+44" });
  assert.equal(parseMobileNumber("12345678", "+65").mobile, "12345678");
  for (const value of [null, "", "+012", "+1234", {}, 91]) assert.throws(() => normalizeMobileCountryCode(value), { statusCode: 400 });
  for (const value of [undefined, "abc9876543210", "9876543210123456", "++919876543210"])
    assert.throws(() => parseMobileNumber(value), { statusCode: 400 });
  assert.throws(() => parseMobileNumber("+447700900123", "+91"), { statusCode: 400 });
  assert.throws(() => assertMobileCountryMatches({ mobileCountryCode: "+44" }, "+91"), { statusCode: 400 });
  assert.throws(() => assertMobileCountryMatches({}, "+44"), { statusCode: 400 });
  assert.equal(new User({ type: "customer" }).mobileCountryCode, "+91");
});

test("OTP send and verify pass the selected country code through to Twilio", async (t) => {
  const env = { TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`, TWILIO_AUTH_TOKEN: "test-token", TWILIO_VERIFY_SERVICE_SID: `VA${"b".repeat(32)}` };
  const before = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => { for (const [key, value] of Object.entries(before)) value === undefined ? delete process.env[key] : process.env[key] = value; });
  const requests = [];
  t.mock.method(twilio.Twilio.prototype, "request", async (options) => {
    requests.push(options);
    return { statusCode: 200, body: { status: options.uri.includes("VerificationCheck") ? "approved" : "pending" } };
  });
  await sendOTPService("7700900123", "+44");
  await verifyOTPService("7700900123", "123456", "+44");
  assert.equal(requests.length, 2);
  assert.equal(requests[0].data.To, "+447700900123");
  assert.equal(requests[1].data.To, "+447700900123");
  await sendOTPService("9876543210");
  assert.equal(requests[2].data.To, "+919876543210");
});

test("OTP login saves the calling code and rejects accounts belonging to another country", async (t) => {
  let existing = null;
  t.mock.method(User, "findOne", async () => existing);
  t.mock.method(User, "create", async (values) => values);
  const user = await findOrCreateAndMergeUser({ mobile: "7700900123", mobileCountryCode: "+44", provider: "otp" });
  assert.equal(user.mobileCountryCode, "+44");
  existing = { mobileCountryCode: "+91", providers: ["otp"], save: async () => {} };
  await assert.rejects(findOrCreateAndMergeUser({ mobile: "7700900123", mobileCountryCode: "+44", provider: "otp" }), { statusCode: 400 });
});

test("profile number/code changes clear verification and preserve the saved code when omitted", async (t) => {
  const existing = { mobile: "7700900123", mobileCountryCode: "+44" };
  t.mock.method(User, "findById", async () => existing);
  let saved;
  t.mock.method(User, "findByIdAndUpdate", async (_id, update) => {
    saved = update.$set;
    return { name: "Test", ...saved, save: async () => {} };
  });
  await updateProfileService("id", { mobile: "7700900456", isMobileVerified: true });
  assert.equal(saved.mobileCountryCode, "+44");
  assert.equal(saved.isMobileVerified, false);
  await updateProfileService("id", { mobileCountryCode: "+1" });
  assert.equal(saved.mobileCountryCode, "+1");
  assert.equal(saved.mobile, "7700900123");
});

test("profile updates ignore protected fields and keep email unverified after a change", async (t) => {
  const existing = { email: "old@example.com", mobile: "9876543210", mobileCountryCode: "+91" };
  t.mock.method(User, "findById", async () => existing);
  let saved;
  t.mock.method(User, "findByIdAndUpdate", async (_id, update) => {
    saved = update.$set;
    return { name: "Test", ...saved, save: async () => {} };
  });

  await updateProfileService("id", {
    name: "Updated",
    email: " NEW@example.com ",
    role: "admin-role",
    type: "admin",
    isActive: false,
    providers: ["google"],
    googleId: "attacker-value",
    refreshToken: "attacker-value",
    password: "attacker-value",
    isEmailVerified: true,
    isMobileVerified: true,
  });

  assert.equal(saved.name, "Updated");
  assert.equal(saved.email, "new@example.com");
  assert.equal(saved.isEmailVerified, false);
  for (const field of ["role", "type", "isActive", "providers", "googleId", "refreshToken", "password", "isMobileVerified"]) {
    assert.equal(Object.hasOwn(saved, field), false, `${field} must not be updated`);
  }
});

test("customer profile serializer omits credentials and authorization fields", () => {
  const profile = serializeCustomerProfile({
    _id: "user-id",
    email: "customer@example.com",
    isMobileVerified: true,
    password: "hashed-password",
    refreshToken: "refresh-token",
    role: "role-id",
    type: "customer",
    providers: ["google"],
    googleId: "google-subject",
    isActive: true,
  });

  assert.equal(profile.email, "customer@example.com");
  assert.equal(profile.isMobileVerified, true);
  for (const field of ["password", "refreshToken", "role", "type", "providers", "googleId", "isActive"]) {
    assert.equal(Object.hasOwn(profile, field), false, `${field} must not be returned`);
  }
});

test("hotel stores separate calling codes and maps contact code to the supplier", () => {
  const contact = { title: "Mr", firstName: "Test", lastName: "Guest", mobile: "7700900123", mobileCountryCode: "+44", phone: "12345678", phoneCountryCode: "+65", gstMobile: "9876543210", gstMobileCountryCode: "+91", email: "test@example.com", address: "Test", state: "Test", city: "Test", pin: "123456" };
  assert.equal(mapContactInfo(contact).MobileCountryCode, "+44");
  assert.equal(mapContactInfo(contact).Mobile, "7700900123");
  const stored = mapStoredContactInfo(contact);
  assert.equal(stored.mobileCountryCode, "+44");
  assert.equal(stored.phoneCountryCode, "+65");
  assert.equal(stored.gstMobileCountryCode, "+91");
  const rooms = mapStoredRooms([{ occupancyId: 1, adults: [{ title: "Mr", firstName: "Test", lastName: "Guest", mobileNo: "12345678", mobileCountryCode: "+65" }], children: [] }]);
  assert.equal(rooms[0].adults[0].mobileCountryCode, "+65");
});

test("support calling codes stay aligned with existing number arrays", () => {
  assert.deepEqual(normalizeSupportPhones({ whatsappSupport: ["7700900123", "9876543210"], whatsappSupportCountryCodes: ["44", "+91"] }).whatsappSupportCountryCodes, ["+44", "+91"]);
  assert.deepEqual(normalizeSupportPhones({ immidiateHelpNumber: "9876543210" }).immidiateHelpNumberCountryCodes, ["+91"]);
  assert.deepEqual(normalizeSupportPhones({ whatsappSupport: ["7700900456"] }, { whatsappSupportCountryCodes: ["+44"] }).whatsappSupportCountryCodes, ["+44"]);
  assert.throws(() => normalizeSupportPhones({ whatsappSupport: ["12345678"], whatsappSupportCountryCodes: [] }), { statusCode: 400 });
  assert.throws(() => normalizeSupportPhones({ whatsappSupportCountryCodes: ["invalid"] }, { whatsappSupport: ["12345678"] }), { statusCode: 400 });
});
