export const mapAkbarAuxiliaries = (search) => [
  {
    Code: "PROMO",
    Parameters: [
      { Type: "Code", Value: "" },
      { Type: "ID", Value: "" },
      { Type: "Amount", Value: "" },
    ],
  },
  {
    Code: "CUSTOMER DETAILS",
    // The supplier sample uses lowercase parameters for CUSTOMER DETAILS.
    parameters: [
      { Type: "Nationality", Value: search.nationality || "IN" },
      { Type: "Country of Residence", Value: search.countryOfResidence || "IN" },
    ],
  },
];
