export const calculatePercentage = (amount, value) => {
  return amount + (amount * value) / 100;
};

export const calculateFixed = (amount, value) => {
  return amount + Number(value);
};

export const applyTaxRule = (amount, config) => {
  if (!config) return amount;

  if (config.taxType === "percentage") {
    return amount + (amount * config.taxValue) / 100;
  }

  return amount + Number(config.taxValue);
};

export const resolveSlabTax = (amount, slabs = []) => {
  let matched = null;

  for (const slab of slabs) {
    if (amount >= slab.minAmount) {
      matched = slab;
    }
  }

  return matched;
};