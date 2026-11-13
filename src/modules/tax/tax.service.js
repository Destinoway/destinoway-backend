import TaxRule from "./tax.model.js";

const roundCurrency = (value) => Number(value.toFixed(2));

export const calculateTaxForRule = ({ amount, taxRule }) => {
  if (!taxRule || !Number.isFinite(Number(amount))) {
    return { taxAmount: 0, taxPercentage: 0 };
  }

  const taxableAmount = Number(amount);

  if (taxRule.ruleType === "flat") {
    const taxAmount =
      taxRule.taxType === "fixed"
        ? Number(taxRule.taxValue ?? 0)
        : (taxableAmount * Number(taxRule.taxValue ?? 0)) / 100;

    return {
      taxAmount: roundCurrency(taxAmount),
      taxPercentage:
        taxRule.taxType === "percentage" ? Number(taxRule.taxValue) : 0,
    };
  }

  if (taxRule.ruleType === "slab") {
    const selectedSlab = (taxRule.slabs ?? [])
      .filter((slab) => taxableAmount >= Number(slab.minAmount))
      .sort((a, b) => Number(b.minAmount) - Number(a.minAmount))[0];

    if (!selectedSlab) {
      return { taxAmount: 0, taxPercentage: 0 };
    }

    const taxPercentage = Number(selectedSlab.taxValue ?? 0);
    return {
      taxAmount: roundCurrency((taxableAmount * taxPercentage) / 100),
      taxPercentage,
    };
  }

  return { taxAmount: 0, taxPercentage: 0 };
};

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

  return calculateTaxForRule({ amount, taxRule });
};

export default calculateTax;
