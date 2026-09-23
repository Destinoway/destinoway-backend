// import Country from "../countryData/country.model.js";

// export const seedCountries = async () => {
//   try {
//     console.log("🌍 Fetching countries...");

//     const res = await fetch(
//       "https://restcountries.com/v3.1/independent?status=true&fields=name,cca2"
//     );
//     const data = await res.json();

//     // Transform API → DB format
//     const countries = data
//       .map((c, index) => ({
//         id: index + 1, // custom id
//         countryName: c.name.common,
//         countryCode: c.cca2,
//       }))
//       .sort((a, b) => a.countryName.localeCompare(b.countryName));

//     // Old data delete (optional but recommended)
//     await Country.deleteMany();

//     // Insert fresh data
//     await Country.insertMany(countries);

//     console.log(`✅ ${countries.length} Countries Saved`);
//   } catch (err) {
//     console.error("❌ Country seeding failed", err);
//   }
// };

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Country from "./country.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const seedCountries = async () => {
  try {
    // always same folder as countrySeeder.js
    const filePath = path.join(__dirname, "countries.json");

    console.log("Reading:", filePath);

    const countries = JSON.parse(
      fs.readFileSync(filePath, "utf-8")
    );

    await Country.deleteMany({});
    await Country.insertMany(countries);

    console.log("✅ Countries inserted");
  } catch (error) {
    console.log(error);
  }
};