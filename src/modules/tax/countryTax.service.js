import CountryTax from "./tax.model.js";

export const getCountryTaxRule = async ({
  countryCode,
  serviceType = "hotel",
}) => {
  return await CountryTax.findOne({
    countryCode,
    serviceType,
    isActive: true,
  });
};
export default getCountryTaxRule;