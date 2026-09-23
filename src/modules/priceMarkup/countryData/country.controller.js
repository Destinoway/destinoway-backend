import { seedCountries } from "../countryData/countrySeeder.js";
import Country from "../countryData/country.model.js";
import { sendSuccess, sendError } from "../../../utils/response/ApiResponse.js";

export const seedCountryController = async (req, res) => {
  await seedCountries();
  res.send("Countries Seeded Successfully");
};

export const getCountries = async (req, res) => {
  try {
    const search = req.query.search || "";

   const countries = await Country.find({
  $or: [
    { countryName: { $regex: search, $options: "i" } },
    { phoneCode: { $regex: search, $options: "i" } }
  ]
}).sort({ countryName: 1 });

    return sendSuccess(
      res,
      "Countries fetched successfully",
      countries
    );

  } catch (err) {
    console.error(err);
    return sendError(
      res,
      "Failed to fetch countries",
      500,
      err.message
    );
  }
};