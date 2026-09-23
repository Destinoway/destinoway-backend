export const contactUsTemplate = ({
  fullName,
  ticketId,
  subject,
  supportCategory,
  status,
  BookingRefNo
}) => {
  return `
    <div style="font-family: Arial, sans-serif; padding:20px;">
      
      <h2>Support Request Received</h2>

      <p>Hello <b>${fullName}</b>,</p>

      <p>
        We have successfully received your support request.
      </p>

      <table style="border-collapse: collapse; width:100%;">
        <tr>
          <td><b>Ticket ID:</b></td>
          <td>${ticketId}</td>
        </tr>
        <tr>
          <td><b>Subject:</b></td>
          <td>${subject}</td>
        </tr>
        <tr>
          <td><b>Category:</b></td>
          <td>${supportCategory}</td>
        </tr>
        <tr>
          <td><b>Status:</b></td>
          <td>${status}</td>
        </tr>
        <tr>
         <td><b>BookingRefNo:</b></td>
          <td>${BookingRefNo}</td>
        </tr>
      </table>

      <br/>

      <p>
        Our support team will review your request and contact you soon.
      </p>

      <p>
        Please keep your <b>Ticket ID (${ticketId})</b> for future reference.
      </p>

      <br/>

      <p>Regards,</p>
      <p><b>Support Team</b></p>
    </div>
  `;
};