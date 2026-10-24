import Markup from "../markup/markup.model.js";
import { resolveRule } from "./markup.resolver.js";
import { getCountryTaxRule } from "../../tax/countryTax.service.js";
import { calculateTaxForRule } from "../../tax/tax.service.js";
import {
  findBestCouponFromList,
  getAutoApplyCoupons,
} from "../../promotionEngine/promotion.service.js";

const roundCurrency = (value) => Number(value.toFixed(2));
const DEFAULT_ADDITIONAL_TAX = {
  level: "additional_tax",
  markupType: "percentage",
  markupValue: 5,
};

const indianStateNamesByCode = {
  AN: "Andaman and Nicobar Islands",
  AP: "Andhra Pradesh",
  AR: "Arunachal Pradesh",
  AS: "Assam",
  BR: "Bihar",
  CH: "Chandigarh",
  CG: "Chhattisgarh",
  DD: "Dadra and Nagar Haveli and Daman and Diu",
  DL: "Delhi",
  GA: "Goa",
  GJ: "Gujarat",
  HR: "Haryana",
  HP: "Himachal Pradesh",
  JK: "Jammu and Kashmir",
  JH: "Jharkhand",
  KA: "Karnataka",
  KL: "Kerala",
  LA: "Ladakh",
  LD: "Lakshadweep",
  MP: "Madhya Pradesh",
  MH: "Maharashtra",
  MN: "Manipur",
  ML: "Meghalaya",
  MZ: "Mizoram",
  NL: "Nagaland",
  OD: "Odisha",
  OR: "Odisha",
  PB: "Punjab",
  PY: "Puducherry",
  RJ: "Rajasthan",
  SK: "Sikkim",
  TN: "Tamil Nadu",
  TS: "Telangana",
  TR: "Tripura",
  UK: "Uttarakhand",
  UT: "Uttarakhand",
  UP: "Uttar Pradesh",
  WB: "West Bengal",
};

const normalizeStateName = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const code = text.match(/^([A-Z]{2})(?:\s+\d{5,6})?$/i)?.[1]?.toUpperCase();
  if (code && indianStateNamesByCode[code]) {
    return indianStateNamesByCode[code];
  }

  return Object.values(indianStateNamesByCode).find(
    (stateName) => stateName.toLowerCase() === text.toLowerCase()
  ) ?? text;
};

const extractStateName = (address) => {
  if (!address) return null;
  if (typeof address === "object") {
    return normalizeStateName(address.state);
  }

  const parts = String(address)
    .split(",")
    .map((part) => part.trim());

  for (const part of parts) {
    const normalizedState = normalizeStateName(part);
    if (
      normalizedState !== part ||
      Object.values(indianStateNamesByCode).includes(normalizedState)
    ) {
      return normalizedState;
    }
  }

  return null;
};

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
      normalizeStateName(searchMeta.stateName) ??
      normalizeStateName(raw.stateName) ??
      extractStateName(address) ??
      extractStateName(raw.address),
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
  const [allRules, countryTaxRule, autoCoupons] = await Promise.all([
    Markup.find({ isActive: true }).lean(),
    getCountryTaxRule({ countryCode, serviceType: "hotel" }),
    getAutoApplyCoupons("hotel"),
  ]);

  const rules = allRules.filter(
    (rule) =>
      (!rule.startDate || new Date(rule.startDate) <= now) &&
      (!rule.endDate || new Date(rule.endDate) >= now)
  );

  return { rules, countryTaxRule, autoCoupons };
};

export const priceHotelForSearch = (hotel, searchMeta, config) => {
  const location = getHotelLocation(hotel, searchMeta);
  const markup = resolveRule({ ...location, rules: config.rules });
  const additionalTax = getAdditionalTaxRule(
    config.rules,
    location.countryCode
  ) ?? DEFAULT_ADDITIONAL_TAX;

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
  const preCouponBasePrice = roundCurrency(afterServiceTax + additionalTaxAmount);

  const countryTax = calculateTaxForRule({
    amount: preCouponBasePrice,
    taxRule: config.countryTaxRule,
  });
  const totalPriceBeforeCoupon = roundCurrency(
    preCouponBasePrice + countryTax.taxAmount
  );
  const couponResult = findBestCouponFromList({
    coupons: config.autoCoupons,
    bookingAmount: Math.max(0, preCouponBasePrice - serviceTaxAmount),
    serviceTax: serviceTaxAmount,
  });
  const couponDiscount = Math.min(
    couponResult.bestDiscount,
    totalPriceBeforeCoupon
  );
  const totalPrice = roundCurrency(totalPriceBeforeCoupon - couponDiscount);
  const couponDiscountPercent = totalPriceBeforeCoupon > 0
    ? roundCurrency((couponDiscount / totalPriceBeforeCoupon) * 100)
    : 0;

  return {
    ...hotel,
    customerPrice: {
      basePrice: totalPrice,
      "platform&servicetax": countryTax.taxAmount,
      totalPrice,
      totalPriceBeforeCoupon,
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
      appliedCouponCode: couponResult.bestCoupon?.code ?? null,
      appliedCouponTitle: couponResult.bestCoupon?.title ?? null,
      couponDiscount,
      couponDiscountPercent,
    },
  };
};
