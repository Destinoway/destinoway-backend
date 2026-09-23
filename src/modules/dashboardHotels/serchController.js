// import { sendError, sendSuccess } from "../../utils/response/ApiResponse.js";
// import { searchHotelsFromSupplier } from "../hotel/searchservice.js";

// export const hotelSearchController = async (req, res) => {
//   try {
//     // ================= DATE LOGIC =================
//     const today = new Date();

//     const tomorrow = new Date();
//     tomorrow.setDate(today.getDate() + 1);

//     const formatDate = (date) => {
//       const mm = String(date.getMonth() + 1).padStart(2, "0");
//       const dd = String(date.getDate()).padStart(2, "0");
//       const yyyy = date.getFullYear();

//       return `${mm}/${dd}/${yyyy}`;
//     };

//     // ================= FINAL PAYLOAD =================
//     const payload = {
//       CheckInDate: formatDate(today),
//       CheckOutDate: formatDate(tomorrow),

//       RoomCount: 1,

//       filters: {
//         freeCancellation: "",
//         search: "",
//         starRating: "",
//         minPrice: "",
//         maxPrice: "",
//       },

//       sort: "",

//       pagination: {
//         page: 1,
//         limit: 10,
//       },

//       fullName: req.body.fullName,
//       id: req.body.id,
//     };

//     // ================= API CALL =================
//     const result = await searchHotelsFromSupplier(payload);

//     // ================= FILTER RESPONSE =================
//     const filteredHotels = result.hotels.map((hotel) => ({
//       hotelName: hotel.hotelName,
//       hotelId: hotel.hotelId,
//     }));

//     return sendSuccess(res, "Hotels fetched successfully", filteredHotels);
//   } catch (err) {
//     return sendError(res, err.message || "Hotel search failed", 500);
//   }
// };
