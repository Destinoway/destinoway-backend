// import nodemailer from "nodemailer";

// export const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_APP_PASS
//   }
// });

import nodemailer from "nodemailer";
// const GMAIL_USER="himanshu11752@gmail.com"
// const GMAIL_APP_PASS="bhqr rtnd rkko oilf"
const GMAIL_USER="asonwal5@gmail.com"
const GMAIL_APP_PASS="gbkd jusi loxd rccn"



const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASS
  }
});

export default transporter;