import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import mongoose from "mongoose";

const MONGO_URL = process.env.CMS_TEST_MONGO_URL || "mongodb://127.0.0.1:27017";
const DB_NAME = `zz_cms_seo_test_${process.pid}_${Date.now()}`;

let S;
let R;
let Page;
let Redirect;
let available = true;

const fresh = (id) =>
  mongoose.connection.collection("cmspages").findOne({
    _id: new mongoose.Types.ObjectId(String(id)),
  });

before(async () => {
  try {
    // indexes are created explicitly below so a legacy index conflict cannot crash the test run
    mongoose.set("autoIndex", false);
    await mongoose.connect(`${MONGO_URL}/${DB_NAME}`, {
      serverSelectionTimeoutMS: 2000,
    });
  } catch {
    available = false;
    return;
  }

  Page = (await import("./cms.model.js")).default;
  Redirect = (await import("./cms.redirect.model.js")).default;
  S = await import("./cms.service.js");
  R = await import("./cms.redirect.service.js");

  await Page.collection.createIndex({ slug: 1 }, { unique: true });
  await Redirect.createIndexes();
});

after(async () => {
  if (!available) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const guard = (fn) => async (t) => {
  if (!available) return t.skip("MongoDB not reachable");
  return fn(t);
};

describe("CMS SEO", () => {
  test("slug normalization and duplicates", guard(async () => {
    const a = await S.createCMSPage({
      title: "Any",
      slug: "  My  Fancy_Slug & Co! ",
      entityType: "static",
    });
    assert.equal(a.slug, "my-fancy_slug-and-co");

    await assert.rejects(
      S.createCMSPage({ title: "Other", slug: "My Fancy_Slug and co", entityType: "marketing" }),
      { statusCode: 400, message: "Slug already exists" },
    );

    await assert.rejects(
      S.createCMSPage({ title: "Bad", slug: "!!!", entityType: "static" }),
      { statusCode: 400, message: "Slug is invalid" },
    );

    const b = await S.createCMSPage({ title: "Second Page", entityType: "static" });
    await assert.rejects(S.updateCMSPage(b._id, { slug: "MY-FANCY_SLUG-AND-CO" }), {
      statusCode: 400,
      message: "Slug already exists",
    });

    const unchanged = await S.updateCMSPage(b._id, { slug: b.slug, title: "Renamed" });
    assert.equal(unchanged.slug, "second-page");
    assert.equal((await R.getCMSPageRedirects(b._id)).length, 0);
  }));

  test("metadata persistence and duplicate check", guard(async () => {
    const p = await S.createCMSPage({
      title: "Meta One",
      entityType: "static",
      metaTitle: "Unique Meta Title",
      metaDescription: "Unique description",
    });
    assert.equal(p.metaTitle, "Unique Meta Title");
    assert.equal(p.metaDescription, "Unique description");

    const q = await S.createCMSPage({
      title: "Meta Two",
      entityType: "static",
      metaTitle: "unique meta title",
    });
    assert.equal(q.metaTitle, "unique meta title");

    const res = await S.checkCMSMetadata({
      metaTitle: " UNIQUE META TITLE ",
      metaDescription: "nothing like this",
      excludeId: String(p._id),
    });
    assert.equal(res.metaTitle.duplicate, true);
    assert.equal(res.metaTitle.count, 1);
    assert.equal(res.metaTitle.pages[0].slug, "meta-two");
    assert.equal(res.metaDescription.duplicate, false);

    const regexSafe = await S.checkCMSMetadata({ metaTitle: ".*" });
    assert.equal(regexSafe.metaTitle.duplicate, false);

    await assert.rejects(S.checkCMSMetadata({ metaTitle: { $ne: "x" } }), { statusCode: 400 });
    await assert.rejects(S.checkCMSMetadata({ metaTitle: "x", excludeId: "nope" }), {
      statusCode: 400,
    });

    const kept = await S.updateCMSPage(p._id, { description: "d" });
    assert.equal(kept.metaTitle, "Unique Meta Title");
    const cleared = await S.updateCMSPage(p._id, { metaDescription: "" });
    assert.equal(cleared.metaDescription, "");
  }));

  test("canonicalUrl persistence and clearing", guard(async () => {
    const p = await S.createCMSPage({
      title: "Canon",
      entityType: "static",
      canonicalUrl: "https://destinoway.com/canon",
    });
    assert.equal(p.canonicalUrl, "https://destinoway.com/canon");

    let u = await S.updateCMSPage(p._id, { title: "Canon 2" });
    assert.equal(u.canonicalUrl, "https://destinoway.com/canon");

    u = await S.updateCMSPage(p._id, { canonicalUrl: "" });
    assert.equal(u.canonicalUrl, "");
    assert.equal((await fresh(p._id)).canonicalUrl, "");
  }));

  test("imageAlt, featuredImageAlt and content blocks preserved", guard(async () => {
    const blocks = [
      { type: "image", data: { src: "a.jpg", imageAlt: "A beach" } },
      { type: "text", data: { text: "hello" } },
    ];
    const p = await S.createCMSPage({
      title: "Alt Page",
      entityType: "static",
      featuredImage: "f.jpg",
      featuredImageAlt: "Featured alt",
      data: { blocks, faqs: [{ q: "q", a: "a" }], cityMeta: { destination: "Goa" } },
    });
    assert.equal(p.featuredImageAlt, "Featured alt");
    assert.equal(p.data.blocks[0].data.imageAlt, "A beach");

    const u = await S.updateCMSPage(p._id, { data: { extra: 1 } });
    assert.equal(u.featuredImageAlt, "Featured alt");
    assert.equal(u.data.blocks[0].data.imageAlt, "A beach");
    assert.equal(u.data.faqs.length, 1);
    assert.equal(u.data.cityMeta.destination, "Goa");

    // legacy record without the new field
    const { insertedId } = await Page.collection.insertOne({
      title: "Legacy", slug: "legacy-alt", entityType: "static", keywords: [], data: {},
    });
    assert.equal((await S.getCMSPageById(insertedId)).featuredImageAlt, "");
  }));

  test("slug change creates 301 redirect, no chains or loops", guard(async () => {
    const p = await S.createCMSPage({ title: "Redirect Me", entityType: "static" });
    assert.equal(p.slug, "redirect-me");

    let u = await S.updateCMSPage(p._id, { slug: "Redirect Two" });
    assert.equal(u.slug, "redirect-two");
    let r = await R.resolveCMSRedirect("/redirect-me");
    assert.deepEqual(r, { statusCode: 301, location: "/redirect-two" });

    u = await S.updateCMSPage(p._id, { slug: "redirect-three" });
    assert.deepEqual(await R.resolveCMSRedirect("/redirect-me"), { statusCode: 301, location: "/redirect-three" });
    assert.deepEqual(await R.resolveCMSRedirect("/redirect-two/"), { statusCode: 301, location: "/redirect-three" });

    const stored = await R.getCMSPageRedirects(p._id);
    assert.equal(stored.length, 2);
    assert.ok(stored.every((x) => x.toPath === "/redirect-three" && x.statusCode === 301));

    // reverting to an old slug removes the redirect that would loop
    await S.updateCMSPage(p._id, { slug: "redirect-me" });
    assert.equal(await R.resolveCMSRedirect("/redirect-me"), null);
    assert.deepEqual(await R.resolveCMSRedirect("/redirect-three"), { statusCode: 301, location: "/redirect-me" });
    assert.deepEqual(await R.resolveCMSRedirect("/redirect-two"), { statusCode: 301, location: "/redirect-me" });

    assert.equal(await R.resolveCMSRedirect("//evil.com"), null);
    assert.equal(await R.resolveCMSRedirect("https://evil.com/x"), null);
    assert.equal(await R.resolveCMSRedirect("/never-existed"), null);
  }));

  test("redirects follow entity URL patterns", guard(async () => {
    const city = await S.createCMSPage({
      title: "Goa Hotels", entityType: "hotelCity", slug: "goa",
      data: { cityMeta: { destination: "Goa, India" } },
    });
    await S.updateCMSPage(city._id, { slug: "north-goa" });
    assert.deepEqual(await R.resolveCMSRedirect("/hotels/goa"), { statusCode: 301, location: "/hotels/north-goa" });

    const hotel = await S.createCMSPage({
      title: "Sea View", entityType: "hotel", entityId: "H1", slug: "sea-view",
      data: { hotelMeta: { hotelName: "Sea View" }, cityMeta: { destination: "Goa, India" } },
    });
    await S.updateCMSPage(hotel._id, { slug: "sea-view-resort" });
    assert.deepEqual(await R.resolveCMSRedirect("/hotel-details/goa/sea-view?hid=H1"), {
      statusCode: 301,
      location: "/hotel-details/goa/sea-view-resort?hid=H1",
    });
  }));

  test("redirect model rejects unsafe targets", guard(async () => {
    const id = new mongoose.Types.ObjectId();
    await assert.rejects(Redirect.create({ fromPath: "/a", toPath: "https://evil.com", pageId: id }));
    await assert.rejects(Redirect.create({ fromPath: "/a", toPath: "//evil.com", pageId: id }));
    await assert.rejects(Redirect.create({ fromPath: "evil", toPath: "/ok", pageId: id }));
  }));
});
