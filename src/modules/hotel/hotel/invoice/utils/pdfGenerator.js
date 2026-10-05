import path from "path";
import ejs from "ejs";
import puppeteer from "puppeteer";

export const generateInvoicePdf = async (booking) => {
  const templatePath = path.join(
    process.cwd(),
    "src/modules/hotel/invoice/templates/hotelInvoice.ejs"
  );

  // const cssPath = "file://" +
  //   path.join(
  //     process.cwd(),
  //     "src/modules/hotel/invoice/assets/invoice.css"
  //   );
const cssPath =
  "file://" +
  path.join(
    process.cwd(),
    "src/modules/hotel/invoice/assets/invoice.css"
  );

  const logoPath = "file://" +
    path.join(
      process.cwd(),
      "src/modules/hotel/invoice/assets/logo.png"
    );

  const html = await ejs.renderFile(templatePath, {
    booking,
    cssPath,
    logoPath,
  });

  const browser = await puppeteer.launch({
    headless: true,

    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });
 await page.addStyleTag({
      path: path.join(
        process.cwd(),
        "src/modules/hotel/invoice/assets/invoice.css"
      ),
    });
    

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "15mm",
        bottom: "15mm",
        left: "10mm",
        right: "10mm",
      },
    });

    return pdf;
  } finally {
    await browser.close();
  }
};