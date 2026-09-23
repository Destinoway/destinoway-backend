// import express from "express";
// import {
//   getCustomersController,
//   getSingleUserController,
//   deleteUserController,
// } from "./user.controller.js";

// import { protect } from "../../middleware/auth.middleware.js";
// import { checkPermission } from "../../middleware/checkPermission.js";

// const router = express.Router();

// // GET ALL CUSTOMERS
// router.get(
//   "/",
//   protect,
//   checkPermission("users", "read"),
//   getCustomersController
// );

// // GET SINGLE CUSTOMER
// router.get(
//   "/:id",
//   protect,
//   checkPermission("users", "read"),
//   getSingleUserController
// );

// // DELETE CUSTOMER
// router.delete(
//   "/:id",
//   protect,
//   checkPermission("users", "delete"),
//   deleteUserController
// );

// export default router;