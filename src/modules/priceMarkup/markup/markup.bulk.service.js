import Markup from "./markup.model.js";

export const getAllActiveMarkups =
async () => {
  const data =
    await Markup.find({
      isActive: true,
    }).lean();

  let serviceTax = null;

  const markups = [];

  for (const item of data) {
    if (
      item.level ===
      "serviceTax"
    ) {
      serviceTax = item;
    } else {
      markups.push(item);
    }
  }

  return {
    markups,
    serviceTax,
  };
};