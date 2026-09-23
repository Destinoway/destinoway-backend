import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";
import { validate } from "../../middleware/validate.middleware.js";

import {
  createCMS,
  deleteCMS,
  getAllCMS,
  getCMSByEntityController,
  getAllBlogsController,
  getCMSBySlug,
  getSingleCMS,
  getTemplates,
  updateCMS,
  previewSlug
} from "./cms.controller.js";

import { createCMSValidation, updateCMSValidation } from "./cms.validation.js";

const router = express.Router();

router.get("/blogs", getAllBlogsController);

/*
=================================
PUBLIC
=================================
*/

/*
GET CMS BY SLUG
*/
router.get("/page/:slug", getCMSBySlug);

/*
PUBLIC CMS LIST
SITEMAP
*/
router.get("/public/pages", getAllCMS);

/*
CMS TEMPLATES
*/
router.get("/templates", getTemplates);

/*
ENTITY CMS
PROTECTED
*/

/*
=================================
ADMIN
=================================
*/
router.get(
  "/entity/:entityType/:entityId",
  protect,
  checkPermission("cmsPages", "read"),
  getCMSByEntityController,
);

/*
CREATE
*/
router.post(
  "/",
  protect,
  validate(createCMSValidation),
  checkPermission("cmsPages", "write"),
  createCMS,
);

router.post(
  "/preview-slug",
  protect,
  checkPermission("cmsPages", "write"),
  previewSlug,
);

/*
GET ALL
ADMIN
*/


router.get("/", protect, checkPermission("cmsPages", "read"), getAllCMS);

/*
GET SINGLE
*/
router.get("/:id", protect, checkPermission("cmsPages", "read"), getSingleCMS);

/*
UPDATE
*/
router.put(
  "/:id",
  protect,
  validate(updateCMSValidation),
  checkPermission("cmsPages", "update"),
  updateCMS,
);

/*
DELETE
*/
router.delete(
  "/:id",
  protect,
  checkPermission("cmsPages", "delete"),
  deleteCMS,
);

// router.get("/blogs", getAllBlogsController);

export default router;
