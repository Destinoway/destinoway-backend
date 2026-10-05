// supplierNormalizers/detailNormalizer.js

export const normalizeHotelDetails = (
  supplierResponse
) => {
  return supplierResponse.RatePlanRecommendations.map(
    (plan) => ({
      recommendationId: plan.RecommendationId,
      supplierAmount: Number(plan.TotalAmount),
      baseAmount:
        Number(plan.RatePlanDetails[0].BasicAmount),
      taxAmount: Number(plan.Tax),
    })
  );
};

const plans =
  normalizeHotelDetails(response);

export const pricedPlans = plans.map((plan) => ({
  ...plan,
  pricing: calculateFinalPrice({
    supplierAmount:
      plan.supplierAmount,
    markup,
    serviceTax,
    additionalTax,
    slabTaxRule,
  }),
}));