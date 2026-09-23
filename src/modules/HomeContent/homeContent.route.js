import express from "express";

import {
  createHomeContentController,
  deleteHomeContentController,
  getAdminHomeContentController,
  getHomeContentController,
  updateHomeContentController,
} from "./homeContent.controller.js";

import { protect } from "../../middleware/auth.middleware.js";
import { checkPermission } from "../../middleware/checkPermission.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| WEBSITE
|--------------------------------------------------------------------------
*/

router.get("/", getHomeContentController);


// WEBSITE GET

router.get(
"/",
getHomeContentController
);


/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

/*
 * GET ALL
 */

router.get(
  "/admin",
  protect,
  checkPermission("homeContent", "read"),
  getAdminHomeContentController,
);

/*
 * CREATE
 */

router.post(
  "/",
  protect,
  checkPermission("homeContent", "write"),
  createHomeContentController,
);



// ADMIN GET ALL

router.get(
"/admin",
protect,
checkPermission("homeContent", "view"),
getAdminHomeContentController
);

// ADMIN UPDATE


router.put(
  "/update/:id",
  protect,
  checkPermission("homeContent", "update"),
  updateHomeContentController,
);

/*
 * DELETE
 */

router.delete(
  "/:id",
  protect,
  checkPermission("homeContent", "delete"),
  deleteHomeContentController,
);

export default router;
