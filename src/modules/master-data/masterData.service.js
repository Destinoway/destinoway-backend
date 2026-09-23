import MasterData from "./masterData.model.js";
import {queryBuilder} from "./../../utils/queryBuilder.js"

export const createMasterDataService = async (payload) => {
  return await MasterData.create(payload);
};

export const getMasterDataService = async (query) => {
  return await queryBuilder({
    model: MasterData,
    query,

    searchFields: [
      "placeName",
    ],

    filterFields: [
      "type",
      "isActive",
    ],

    sortFields: [
      "placeName",
      "createdAt",
      "updatedAt",
    ],

    defaultSort: {
      placeName: 1,
    },
  });
};
// export const getMasterDataService = async (type) => {
//   const filter = {
//     isActive: true,
//   };

//   if (type) filter.type = type;

//   return await MasterData.find(filter).sort({ placeName: 1 });
// };

export const updateMasterDataService = async (id, payload) => {
  return await MasterData.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const deleteMasterDataService = async (id) => {
  return await MasterData.findByIdAndDelete(id);
};