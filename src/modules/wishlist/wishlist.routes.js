import express from "express";

import { protectCustomer } from "../../middleware/customerAuth.middleware.js";

import {
  checkWishlist,
  getWishlist,
  getWishlistCity,
  getWishlistHotelIds,
  toggleWishlist,
} from "./wishlist.controller.js";

const router = express.Router();

router.post("/wishlist/toggle", protectCustomer, toggleWishlist);

router.get("/wishlist", protectCustomer, getWishlist);

router.get("/wishlist/city/:cityId", protectCustomer, getWishlistCity);

router.get("/wishlist/check/:hotelId", protectCustomer, checkWishlist);
router.get("/wishlist/hotel-ids", protectCustomer, getWishlistHotelIds);

export default router;
