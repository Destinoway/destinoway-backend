import mongoose from "mongoose";
import ApiError from "../../utils/response/ApiError.js";
import { generateCMSSlug } from "../../utils/slug/cmsSlug.js";
import { generateSlug } from "../../utils/slug/slugify.js";
import { serializeCMSPage } from "./cms.serializer.js";
import { buildCMSUrl } from "../../utils/cms/buildCMSUrl.js";
import MasterData from "../master-data/masterData.model.js";
import User from "../user/user.model.js";
import CMSPage from "./cms.model.js";
import { CMS_TEMPLATES } from "./cms.templates.js";
import { getCMSPublicUrl, recordCMSRedirect } from "./cms.redirect.service.js";

// Normalizes an explicitly supplied slug the same way auto-generated slugs are built.
const normalizeSlugInput = (slug) => {
  const normalized = generateSlug(String(slug));

  if (!normalized) {
    throw new ApiError(400, "Slug is invalid");
  }

  return normalized;
};

// Writes only the legacy `schema` field; the key is hardcoded, never client-supplied.
const setSchemaField = (id, value) =>
  CMSPage.findByIdAndUpdate(
    id,
    { $set: { schema: value } },
    { new: true, runValidators: true, strict: false },
  );

/*
CREATE
*/
export const createCMSPage = async (input) => {
  const { schema, ...payload } = input;
  const { entityType, entityId } = payload;

  // auto slug
  let slug = payload.slug
    ? normalizeSlugInput(payload.slug)
    : generateCMSSlug(payload);

  if (!slug) {
    // HOTEL
    if (payload.entityType === "hotel" && payload?.data?.hotelMeta?.hotelName) {
      slug = generateSlug(payload.data.hotelMeta.hotelName);
    }

    // HOTEL CITY
    else if (
      payload.entityType === "hotelCity" &&
      payload?.data?.cityMeta?.destination
    ) {
      slug = generateSlug(payload.data.cityMeta.destination.split(",")[0]);
    }

    // DEFAULT
    else {
      slug = generateSlug(payload.title);
    }
  }

  // slug duplicate check
  const existingSlug = await CMSPage.findOne({
    slug,
  });

  if (existingSlug) {
    throw new ApiError(400, "Slug already exists");
  }

  // entity duplicate
  if (entityId && entityType !== "static" && entityType !== "marketing") {
    const existingEntity = await CMSPage.findOne({
      entityType,
      entityId,
    });

    if (existingEntity) {
      throw new ApiError(400, "CMS page already exists for this entity");
    }
  }

  payload.slug = slug;

  const page = await CMSPage.create(payload);

  if (schema === undefined) {
    return serializeCMSPage(page);
  }

  try {
    return serializeCMSPage(await setSchemaField(page._id, schema));
  } catch (error) {
    await CMSPage.deleteOne({ _id: page._id }).catch(() => {});
    throw error;
  }
};

/*
GET ALL
*/
export const getAllCMSPages = async (query) => {
  const { page = 1, limit = 10, entityType, search } = query;

  const filter = {};

  if (entityType) {
    filter.entityType = entityType;
  }

  if (search) {
    filter.title = {
      $regex: search,
      $options: "i",
    };
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    CMSPage.find(filter)
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(Number(limit)),

    CMSPage.countDocuments(filter),
  ]);

  return {
    data: data.map((item) => serializeCMSPage(item)),
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

/*
GET SINGLE
*/
export const getCMSPageById = async (id) => {
  const page = await CMSPage.findById(id);

  if (!page) {
    throw new ApiError(404, "CMS page not found");
  }

  return serializeCMSPage(page);
};

/*
UPDATE
*/
export const updateCMSPage = async (id, input) => {
  const { schema, ...payload } = input;
  const page = await CMSPage.findById(id);

  if (!page) {
    throw new ApiError(404, "CMS page not found");
  }

  // unchanged slugs are left untouched; supplied ones are normalized
  if (payload.slug && payload.slug !== page.slug) {
    payload.slug = normalizeSlugInput(payload.slug);
  }

  const previousUrl = getCMSPublicUrl(page);

  // slug duplicate check
  if (payload.slug && payload.slug !== page.slug) {
    const slugExists = await CMSPage.findOne({
      slug: payload.slug,
      _id: {
        $ne: id,
      },
    });

    if (slugExists) {
      throw new ApiError(400, "Slug already exists");
    }
  }

  // merge `data` so omitted blocks (faqs, cityMeta, breadcrumbs...) survive partial updates
  const { data, ...rest } = payload;

  // slug is only changed when explicitly sent
  if (!rest.slug) delete rest.slug;

  Object.assign(page, rest);

  if (data && typeof data === "object") {
    page.data = { ...(page.data || {}), ...data };
    page.markModified("data");
  }

  await page.save();

  const currentUrl = getCMSPublicUrl(page);

  if (currentUrl !== previousUrl) {
    try {
      await recordCMSRedirect(page._id, previousUrl, currentUrl, page.entityType);
    } catch (error) {
      console.error("CMS redirect could not be recorded:", error);
    }
  }

  if (schema === undefined) {
    return serializeCMSPage(page);
  }

  return serializeCMSPage(await setSchemaField(id, schema));
};

/*
DELETE
*/
export const deleteCMSPage = async (id) => {
  const page = await CMSPage.findById(id);

  if (!page) {
    throw new ApiError(404, "CMS page not found");
  }

  await page.deleteOne();

  return true;
};

/*
GET BY SLUG
*/
export const getCMSPageBySlug = async (slug, preview = false) => {
  console.log("CMS SLUG:", slug, "PREVIEW:", preview);

  const filter = preview
    ? {
        slug,
      }
    : {
        slug,
        isPublished: true,
      };

  const page = await CMSPage.findOne(filter);

  console.log("CMS PAGE:", page);

  if (!page) {
    throw new ApiError(404, "Page not found");
  }

  return serializeCMSPage(page);
};

/*
PREVIEW SLUG
*/
export const previewCMSSlug = async (payload) => {
  const slug = generateCMSSlug(payload);

  const exists = await CMSPage.exists({ slug });

  const url = buildCMSUrl({
    ...payload,
    slug,
  });

  return {
    slug,
    url,
    available: !exists,
  };
};

/*
METADATA DUPLICATE CHECK
Informational only: reports other pages already using the same
metaTitle / metaDescription (case-insensitive, trimmed). Never blocks saving.
*/
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const checkCMSMetadata = async ({
  metaTitle,
  metaDescription,
  excludeId,
}) => {
  const filter = {};

  if (excludeId !== undefined) {
    if (!mongoose.isValidObjectId(excludeId)) {
      throw new ApiError(400, "Invalid excludeId");
    }

    filter._id = { $ne: excludeId };
  }

  const result = {};

  for (const [field, raw] of [
    ["metaTitle", metaTitle],
    ["metaDescription", metaDescription],
  ]) {
    if (raw === undefined) continue;

    if (typeof raw !== "string") {
      throw new ApiError(400, `${field} must be a string`);
    }

    const value = raw.trim();

    if (!value) {
      result[field] = { value, duplicate: false, count: 0, pages: [] };
      continue;
    }

    const query = {
      ...filter,
      [field]: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
    };

    const [count, pages] = await Promise.all([
      CMSPage.countDocuments(query),
      CMSPage.find(query)
        .select("title slug entityType entityId")
        .limit(10)
        .lean(),
    ]);

    result[field] = { value, duplicate: count > 0, count, pages };
  }

  return result;
};

/*
GET TEMPLATES
*/

/*
GET BY ENTITY
*/
export const getCMSByEntity = async (entityType, entityId) => {
  const page = await CMSPage.findOne({
    entityType,
    entityId,
  }).lean();

  return page
    ? {
        ...page,
        schema: page.schema ?? null,
        featuredImageAlt: page.featuredImageAlt ?? "",
      }
    : page;
};
export const getCMSTemplates = async () => {
  return CMS_TEMPLATES;
};


//get all blogs  for website
// cms.service.js

 
export const getAllBlogsService = async (query) => {
  const {
    page = 1,
    limit = 10,
    categoryId,
    slug,
    search,
  } = query;

  const filter = {
    entityType: "blog",
    isPublished: true,
  };

 
  if (categoryId) {
    filter.categoryId = categoryId;
  }


  if (search?.trim()) {
    const searchText = search.trim();

    filter.$or = [
      {
        title: {
          $regex: searchText,
          $options: "i",
        },
      },
     
    ];
  }


  if (slug) {
    filter.slug = slug;

    const blog = await CMSPage.findOne(filter).lean();

    if (!blog) {
      throw new ApiError(404, "Blog not found");
    }

    if (!blog.categoryId) {
      throw new ApiError(404, "Blog category not found");
    }

    const category = await MasterData.findById(blog.categoryId)
      .select("placeName")
      .lean();

    if (!category) {
      throw new ApiError(404, "Blog category not found");
    }

    let createdByName = null;

    if (blog.createdBy) {
      const user = await User.findById(blog.createdBy)
        .select("name")
        .lean();

      createdByName = user?.name || null;
    }

    return {
      ...blog,
      canonicalUrl: blog.canonicalUrl ?? "",
      schema: blog.schema ?? null,
      featuredImageAlt: blog.featuredImageAlt ?? "",
      createdByName,
      categoryName: category.placeName,
    };
  }


  const total = await CMSPage.countDocuments(filter);

  const blogs = await CMSPage.find(filter)
    .select(
      "title slug canonicalUrl description featuredImage featuredImageAlt categoryId createdAt createdBy"
    )
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();


  const categoryIds = [
    ...new Set(
      blogs
        .map((blog) => blog.categoryId?.toString())
        .filter(Boolean)
    ),
  ];

  
  const categories = await MasterData.find({
    _id: { $in: categoryIds },
  })
    .select("_id placeName")
    .lean();

  const categoryMap = categories.reduce((acc, item) => {
    acc[item._id.toString()] = item.placeName;
    return acc;
  }, {});


  const userIds = [
    ...new Set(
      blogs
        .map((blog) => blog.createdBy?.toString())
        .filter(Boolean)
    ),
  ];

  
  const users = await User.find({
    _id: { $in: userIds },
  })
    .select("_id name")
    .lean();

  const userMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = user.name;
    return acc;
  }, {});

  const result = blogs
    .filter((blog) => {
      const categoryId = blog.categoryId?.toString();

      // Category deleted/missing => don't show blog
      if (!categoryId || !categoryMap[categoryId]) {
        return false;
      }

      return true;
    })
    .map((blog) => ({
      ...blog,
      canonicalUrl: blog.canonicalUrl ?? "",
      featuredImageAlt: blog.featuredImageAlt ?? "",
      createdByName:
        userMap[blog.createdBy?.toString()] || null,
      categoryName:
        categoryMap[blog.categoryId.toString()],
    }));

  return {
    blogs: result,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

