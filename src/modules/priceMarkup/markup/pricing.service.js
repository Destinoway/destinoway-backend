
export const applyHotelPricing = ({
  hotel,
  markup,
  additionalTax,
  countryTax,
}) => {
  let amount = Number(hotel.price || 0);

  const originalPrice = amount;

  /*resolveMarkup
     STEP 1 → MARKUP
  */
  if (markup) {
    if (markup.markupType === "percentage") {
      amount += (amount * markup.markupValue) / 100;
    }

    if (markup.markupType === "fixed") {
      amount += Number(markup.markupValue);
    }
  }

  const subtotal1 = amount;

  /*
     STEP 2 → SERVICE TAX
  */

  if (markup?.serviceChargeValue) {
  if (markup.markupType === "percentage") {
    amount +=
      (amount * markup.serviceChargeValue) / 100;
  }

  if (markup.markupType === "fixed") {
    amount += Number(markup.serviceChargeValue);
  }
}

  const subtotal2 = amount;
const panjourneyServiceCharge =
  subtotal2 - subtotal1;

  /*
     STEP 3 → ADDITIONAL TAX
  */



  if (additionalTax) {
    if (additionalTax.markupType === "percentage") {
      amount += (amount * additionalTax.markupValue) / 100;
    }

    if (additionalTax.markupType === "fixed") {
      amount += Number(additionalTax.markupValue);
    }
  }

  const basePrice  = amount;


if (countryTax) {
  console.log("Inside country tax block");

  // 1. FLAT TAX
  if (countryTax.ruleType === "flat") {
  console.log("Inside FLAT block");
    if (countryTax.taxType === "percentage") {
      amount += (amount * countryTax.taxValue) / 100;
    }

    if (countryTax.taxType === "fixed") {
      amount += Number(countryTax.taxValue);
    }
  }

  // 2. SLAB TAX
  else if (countryTax.ruleType === "slab") {

    let selectedSlab = null;

    for (const slab of countryTax.slabs) {
      if (amount >= slab.minAmount) {
        selectedSlab = slab;
      }
    }

    if (selectedSlab) {
      amount +=
        (amount * selectedSlab.taxValue) / 100;
    }
  }
}

const platformfeeandtax= amount -basePrice
  return {
    ...hotel,

    originalPrice,
    panjourneyServiceCharge,
    platformfeeandtax,

    supplierPrice: originalPrice,

    subtotal1: Number(subtotal1.toFixed(2)),

    subtotal2: Number(subtotal2.toFixed(2)),

    basePrice: Number(basePrice.toFixed(2)),

    price: Number(amount.toFixed(2)),
  };
};