import Markup from "../markup/markup.model.js";
import { resolveRule } from "./markup.resolver.js";
import { getCountryTaxRule } from "../../tax/countryTax.service.js";
import { calculateTaxForRule } from "../../tax/tax.service.js";

const roundCurrency = (value) => Number(value.toFixed(2));

const applyMarkupAmount = (amount, rule) => {
  if (!rule) return 0;
  if (rule.markupType === "percentage") {
    return roundCurrency((amount * Number(rule.markupValue)) / 100);
  }
  return roundCurrency(Number(rule.markupValue));
};

const getHotelLocation = (hotel, searchMeta) => {
  const raw = hotel.rawSupplierData ?? {};
  const address = hotel.address ?? raw.address ?? {};
  const addressObject = typeof address === "object" ? address : {};

  return {
    hotelId: hotel.supplierHotelId,
    cityId:
      searchMeta.cityId ??
      searchMeta.locationId ??
      raw.cityId ??
      addressObject.cityId,
    cityName:
      searchMeta.cityName ??
      raw.cityName ??
      raw.locationName ??
      addressObject.city ??
      (typeof address === "string" ? address : null),
    stateName:
      searchMeta.stateName ?? raw.stateName ?? addressObject.state,
    countryCode:
      addressObject.countryCode ??
      raw.countryCode ??
      searchMeta.destinationCountryCode ??
      "IN",
  };
};

const getAdditionalTaxRule = (rules, countryCode) => {
  const candidates = rules.filter((rule) => rule.level === "additional_tax");
  return (
    candidates.find(
      (rule) =>
        rule.countryCode &&
        rule.countryCode.toUpperCase() === String(countryCode).toUpperCase()
    ) ?? candidates.find((rule) => !rule.countryCode) ?? null
  );
};

export const loadHotelPricingConfig = async (countryCode) => {
  const now = new Date();
  const [allRules, countryTaxRule] = await Promise.all([
    Markup.find({ isActive: true }).lean(),
    getCountryTaxRule({ countryCode, serviceType: "hotel" }),
  ]);

  const rules = allRules.filter(
    (rule) =>
      (!rule.startDate || new Date(rule.startDate) <= now) &&
      (!rule.endDate || new Date(rule.endDate) >= now)
  );

  return { rules, countryTaxRule };
};

export const priceHotelForSearch = (hotel, searchMeta, config) => {
  const location = getHotelLocation(hotel, searchMeta);
  const markup = resolveRule({ ...location, rules: config.rules });
  const additionalTax = getAdditionalTaxRule(
    config.rules,
    location.countryCode
  );

  const supplierTotalAmount = roundCurrency(
    Number(hotel.rate?.total ?? 0)
  );
  const markupAmount = applyMarkupAmount(supplierTotalAmount, markup);
  const afterMarkup = roundCurrency(supplierTotalAmount + markupAmount);

  const serviceTaxAmount = markup?.serviceChargeValue
    ? applyMarkupAmount(afterMarkup, {
        markupType: markup.markupType,
        markupValue: markup.serviceChargeValue,
      })
    : 0;
  const afterServiceTax = roundCurrency(afterMarkup + serviceTaxAmount);

  const additionalTaxAmount = applyMarkupAmount(
    afterServiceTax,
    additionalTax
  );
  const basePrice = roundCurrency(afterServiceTax + additionalTaxAmount);

  const countryTax = calculateTaxForRule({
    amount: basePrice,
    taxRule: config.countryTaxRule,
  });
  const totalPrice = roundCurrency(basePrice + countryTax.taxAmount);

  return {
    ...hotel,
    customerPrice: {
      basePrice,
      "platform&servicetax": countryTax.taxAmount,
      totalPrice,
      currency: hotel.currency ?? "INR",
      supplierTotalAmount,
      markupLevel: markup?.level ?? null,
      markupType: markup?.markupType ?? null,
      markupValue: markup ? Number(markup.markupValue) : 0,
      markupPercent:
        markup?.markupType === "percentage"
          ? Number(markup.markupValue)
          : null,
      markupAmount,
      serviceTaxAmount,
      additionalTaxAmount,
      countryTaxPercent: countryTax.taxPercentage,
    },
  };
};
