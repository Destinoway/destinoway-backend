import mongoose from "mongoose";
import { seedCountries } from "../src/modules/priceMarkup/countryData/countrySeeder.js";
const MONGO_URI="mongodb://himanshu11752_db_user:Himanshu12@ac-ymu25xd-shard-00-00.ad4pvxh.mongodb.net:27017,ac-ymu25xd-shard-00-01.ad4pvxh.mongodb.net:27017,ac-ymu25xd-shard-00-02.ad4pvxh.mongodb.net:27017/hotel_Booiking?ssl=true&replicaSet=atlas-qpn1xm-shard-0&authSource=admin&retryWrites=true&w=majority"
await mongoose.connect(MONGO_URI);

await seedCountries();

process.exit();