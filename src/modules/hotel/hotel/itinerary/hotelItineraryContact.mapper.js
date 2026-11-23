import { normalizeMobileCountryCode } from "../../../../utils/mobileNumber.js";

export const mapContactInfo = (contactInfo) => ({
  Title: contactInfo.title.trim(),
  FName: contactInfo.firstName.trim(),
  LName: contactInfo.lastName.trim(),
  Mobile: contactInfo.mobile.trim(),
  Phone: contactInfo.phone?.trim() ?? "",
  // Akbar sends booking vouchers and notifications to ContactInfo.Email.
  // Route those messages to our inbox; the guest email is stored separately
  // and used by our own booking confirmation email.
  Email: "info@destinoway.com",
  Address: contactInfo.address.trim(),
  State: contactInfo.state.trim(),
  City: contactInfo.city.trim(),
  PIN: contactInfo.pin.trim(),
  GSTCompanyName: contactInfo.gstCompanyName?.trim() ?? "",
  GSTTIN: contactInfo.gstTin?.trim() ?? "",
  GSTMobile: contactInfo.gstMobile?.trim() ?? "",
  GSTEmail: contactInfo.gstEmail?.trim() ?? "",
  GSTAddress: contactInfo.gstAddress?.trim() ?? "",
  GSTState: contactInfo.gstState?.trim() ?? "",
  UpdateProfile: true,
  IsGuest: false,
  CountryCode: process.env.AKBAR_COUNTRY_CODE || "IN",
  MobileCountryCode: normalizeMobileCountryCode(contactInfo.mobileCountryCode ?? process.env.AKBAR_MOBILE_COUNTRY_CODE ?? "+91"),
  NetAmount: "",
});

export const mapStoredContactInfo = (contactInfo) => ({
  title: contactInfo.title.trim(),
  firstName: contactInfo.firstName.trim(),
  lastName: contactInfo.lastName.trim(),
  mobile: contactInfo.mobile.trim(),
  mobileCountryCode: normalizeMobileCountryCode(contactInfo.mobileCountryCode ?? process.env.AKBAR_MOBILE_COUNTRY_CODE ?? "+91"),
  phone: contactInfo.phone?.trim() ?? "",
  phoneCountryCode: normalizeMobileCountryCode(contactInfo.phoneCountryCode),
  gstMobile: contactInfo.gstMobile?.trim() ?? "",
  gstMobileCountryCode: normalizeMobileCountryCode(contactInfo.gstMobileCountryCode),
  email: contactInfo.email.trim(),
  address: contactInfo.address.trim(),
  state: contactInfo.state.trim(),
  city: contactInfo.city.trim(),
  pin: contactInfo.pin.trim(),
});

export const mapStoredRooms = (submittedRooms) =>
  submittedRooms.map((room) => ({
    occupancyId: Number(room.occupancyId),
    adults: room.adults.map((guest) => ({
      title: guest.title.trim(),
      firstName: guest.firstName.trim(),
      middleName: guest.middleName?.trim() ?? "",
      lastName: guest.lastName.trim(),
      mobileNo: guest.mobileNo?.trim() ?? "",
      mobileCountryCode: normalizeMobileCountryCode(guest.mobileCountryCode),
      email: guest.email?.trim() ?? "",
      pan: guest.pan?.trim() ?? "",
    })),
    children: room.children.map((guest) => ({
      title: guest.title.trim(),
      firstName: guest.firstName.trim(),
      middleName: guest.middleName?.trim() ?? "",
      lastName: guest.lastName.trim(),
      age: Number(guest.age),
      mobileNo: guest.mobileNo?.trim() ?? "",
      mobileCountryCode: normalizeMobileCountryCode(guest.mobileCountryCode),
      email: guest.email?.trim() ?? "",
      pan: guest.pan?.trim() ?? "",
    })),
  }));

