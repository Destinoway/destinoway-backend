import { generateHotelInvoiceService } from "./invoice.service.js";

export const generateHotelInvoiceController = async (
  req,
  res,
  next
) => {
  try {
    const pdf = await generateHotelInvoiceService(
      req.user.id,
      req.params.bookingRefNo
    );

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `inline; filename=Hotel-Invoice-${req.params.bookingRefNo}.pdf`
    );

    res.send(pdf);
  } catch (err) {
    next(err);
  }
};