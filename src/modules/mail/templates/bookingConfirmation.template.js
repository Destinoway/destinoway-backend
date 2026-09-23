export const bookingConfirmationTemplate = ({
  customerName,
  bookingRefNo,
  hotelName,
  hotelAddress,
  city,
  checkIn,
  checkOut,
  rooms,
  guests,
  amount,
  currency = "INR",
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Booking Confirmation</title>
</head>

<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="700" cellpadding="0" cellspacing="0"
style="background:#ffffff;margin:30px auto;border-radius:10px;overflow:hidden;">

<tr>
<td
style="
background:#0d6efd;
padding:30px;
text-align:center;
color:#fff;
">

<h1 style="margin:0;">
Pan Journey
</h1>

<p style="margin-top:10px;font-size:18px;">
Your Hotel Booking is Confirmed 🎉
</p>

</td>
</tr>

<tr>
<td style="padding:30px;">

<p>Hello <b>${customerName}</b>,</p>

<p>
Thank you for choosing <b>Pan Journey</b>.
Your booking has been successfully confirmed.
</p>

<h3 style="color:#0d6efd;">
Booking Details
</h3>

<table
width="100%"
cellpadding="10"
style="border-collapse:collapse;border:1px solid #ddd;">

<tr>
<td><b>Booking Reference</b></td>
<td>${bookingRefNo}</td>
</tr>

<tr>
<td><b>Hotel</b></td>
<td>${hotelName}</td>
</tr>

<tr>
<td><b>Address</b></td>
<td>${hotelAddress}</td>
</tr>

<tr>
<td><b>City</b></td>
<td>${city}</td>
</tr>

<tr>
<td><b>Check In</b></td>
<td>${checkIn}</td>
</tr>

<tr>
<td><b>Check Out</b></td>
<td>${checkOut}</td>
</tr>

<tr>
<td><b>Rooms</b></td>
<td>${rooms}</td>
</tr>

<tr>
<td><b>Guests</b></td>
<td>${guests}</td>
</tr>

<tr>
<td><b>Amount Paid</b></td>
<td>${currency} ${amount}</td>
</tr>

<tr>
<td><b>Status</b></td>
<td style="color:green;">
Confirmed
</td>
</tr>

</table>

<br>

<p>
Your invoice is attached with this email.
Please carry a valid Government ID during check-in.
</p>

<br>

<p>
Need help?
</p>

<p>
Email:
support@panjourney.com
</p>

<p>
Thank you for choosing Pan Journey ❤️
</p>

</td>
</tr>

<tr>

<td
style="
background:#f5f5f5;
padding:20px;
text-align:center;
font-size:13px;
color:#666;
">

© ${new Date().getFullYear()} Pan Journey

</td>

</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};