import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import { errorHandler } from "@destinoway/shared";
import routes from "../src/modules/gateways/routes/paymentGateway.routes.js";
import PaymentGateway from "../src/modules/gateways/models/paymentGateway.model.js";
import User from "../src/modules/user/user.model.js";
import { createPaymentGatewayConfig } from "../src/modules/gateways/services/paymentGateway.service.js";

test("payment gateway creation enforces auth, permissions, validation and uniqueness", async (t) => {
  let account = { _id: "test-admin", isActive: true, role: { name: "admin", type: "admin", isActive: true, permissions: {} } };
  const saved = [];
  t.mock.method(User, "findById", () => ({ select() { return this; }, populate: async () => account }));
  t.mock.method(PaymentGateway, "findOne", async ({ name }) => saved.find(x => x.name === name));
  t.mock.method(PaymentGateway, "create", async (value) => {
    const doc = { _id: "gateway-id", ...value };
    saved.push(doc);
    return doc;
  });
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "gateway-config-test-secret";
  t.after(() => previousSecret === undefined ? delete process.env.JWT_SECRET : process.env.JWT_SECRET = previousSecret);
  const token = jwt.sign({ id: "test-admin" }, process.env.JWT_SECRET);
  const app = express();
  app.use(express.json());
  app.use("/api/v1/payment-gateways", routes);
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const endpoint = `http://127.0.0.1:${server.address().port}/api/v1/payment-gateways`;
  const post = async (payload, auth = true) => {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await post({ name: "razorpay", supportedCurrencies: ["INR"] }, false)).status, 401);
  account.role = { name: "customer", type: "customer", isActive: true, permissions: {} };
  assert.equal((await post({ name: "razorpay", supportedCurrencies: ["INR"] })).status, 403);
  assert.equal(saved.length, 0);
  account.role = { name: "admin", type: "admin", isActive: true, permissions: {} };

  const result = await post({ name: " Razorpay ", supportedCurrencies: ["inr"] });
  assert.equal(result.status, 201);
  assert.deepEqual(result.body.data, { _id: "gateway-id", name: "razorpay", supportedCurrencies: ["INR"], priority: 1, isActive: true });
  assert.equal(result.body.success, true);
  assert.equal((await post({ name: "razorpay", supportedCurrencies: ["USD"] })).status, 409);
  assert.deepEqual(saved[0].supportedCurrencies, ["INR"], "duplicate create must not overwrite existing settings");

  for (const payload of [
    {}, { name: "paypal", supportedCurrencies: ["INR"] },
    { name: "stripe", supportedCurrencies: [] },
    { name: "stripe", supportedCurrencies: ["INR", "inr"] },
    { name: "stripe", supportedCurrencies: ["RUPEES"] },
    { name: "stripe", supportedCurrencies: ["USD"], priority: -1 },
    { name: "stripe", supportedCurrencies: ["USD"], isActive: "false" },
    { name: "stripe", supportedCurrencies: ["USD"], secretKey: "not-accepted" },
  ]) assert.equal((await post(payload)).status, 400);

  account.role = { name: "finance", type: "staff", isActive: true, permissions: { paymentGateways: { write: true } } };
  const stripe = await post({ name: "stripe", supportedCurrencies: ["USD", "EUR"], isActive: false, priority: 2 });
  assert.equal(stripe.status, 201);
  assert.equal(stripe.body.data.isActive, false);
  assert.equal(saved.length, 2);

  t.mock.method(PaymentGateway, "findOne", async () => null);
  t.mock.method(PaymentGateway, "create", async () => { throw Object.assign(new Error("Duplicate key"), { code: 11000 }); });
  await assert.rejects(createPaymentGatewayConfig({ name: "stripe", supportedCurrencies: ["USD"] }), { statusCode: 409 });
  assert(PaymentGateway.schema.indexes().some(([keys, options]) => keys.name === 1 && options.unique));
});
