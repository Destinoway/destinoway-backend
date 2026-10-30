import mongoose from "mongoose";
import dotenv from "dotenv";
import State from "../stateData/state.model.js";

dotenv.config();

const seedStates = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);


    const res = await fetch(
      "https://countriesnow.space/api/v0.1/countries/states"
    );
    const json = await res.json();

    let statesArray = [];
    let idCounter = 1;

    json.data.forEach(country => {
      country.states.forEach(state => {
        statesArray.push({
          id: idCounter++,
          stateName: state.name,
          countryCode: country.iso2,
        });
      });
    });

    await State.deleteMany();
    await State.insertMany(statesArray);

    process.exit();
  } catch (err) {
    process.exit(1);
  }
};

seedStates();



//Add below command in package,json when reseed state data 
//"seed:states": "node src/modules/priceMarkup/stateData/seedStates.js",