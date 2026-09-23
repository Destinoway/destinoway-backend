import TaxRule from "./tax.model.js";

export const calculateTax = async ({
  amount,
  countryCode,
  serviceType = "hotel",
}) => {

  const taxRule = await TaxRule.findOne({
    countryCode,
    serviceType,
    isActive: true,
  });

  if (!taxRule) {
    return {
      taxAmount: 0,
      taxPercentage: 0,
    };
  }

  /*
    FLAT TAX
  */

  if (taxRule.ruleType === "flat") {

    const tax =
      (amount * taxRule.taxValue) / 100;

    return {
      taxAmount: tax,
      taxPercentage: taxRule.taxValue,
    };
  }


  /*
    SLAB TAX
  */

  if (taxRule.ruleType === "slab") {

    // eligible slabs
    const matchedSlabs =
      taxRule.slabs.filter(
        (slab) => amount > slab.minAmount
      );

    if (!matchedSlabs.length) {
      return {
        taxAmount: 0,
        taxPercentage: 0,
      };
    }

    // highest threshold first
    matchedSlabs.sort(
      (a, b) => b.minAmount - a.minAmount
    );

    const finalSlab = matchedSlabs[0];

    const taxAmount =
      (amount * finalSlab.taxValue) / 100;

    return {
      taxAmount,
      taxPercentage: finalSlab.taxValue,
    };
  }

  return {
    taxAmount: 0,
    taxPercentage: 0,
  };
};

export default calculateTax;
