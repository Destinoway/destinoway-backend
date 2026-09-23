export const grievanceTemplate = ({
  fullName,
  ticketId,
  subject,
  status,
  grievanceRedressalid
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <title>Grievance Request Received</title>
  </head>
  <body style="margin:0; padding:0; font-family: Arial, sans-serif; background:#f4f6f8;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px;">
      <tr>
        <td align="center">
          
          <table width="600" cellpadding="0" cellspacing="0" 
            style="background:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background:#dc3545; padding:20px; text-align:center; color:#ffffff;">
                <h2 style="margin:0;">Grievance Request Submitted</h2>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px; color:#333;">
                <p>Hi <strong>${fullName}</strong>,</p>

                <p>
                  We have successfully received your grievance request.  
                  Our support team will review your issue and update you shortly.
                </p>

                <table cellpadding="8" cellspacing="0" width="100%" 
                  style="margin-top:20px; border:1px solid #eee; border-collapse:collapse;">
                  
                  <tr>
                    <td style="border:1px solid #eee;"><strong>Ticket ID</strong></td>
                    <td style="border:1px solid #eee;">${ticketId}</td>
                  </tr>

                  <tr>
                    <td style="border:1px solid #eee;"><strong>Subject</strong></td>
                    <td style="border:1px solid #eee;">${subject}</td>
                  </tr>

                  <tr>
                    <td style="border:1px solid #eee;"><strong>Status</strong></td>
                    <td style="border:1px solid #eee;">${status}</td>
                  </tr>
                   <tr>
                    <td style="border:1px solid #eee;"><strong>GrievanceRedressalid</strong></td>
                    <td style="border:1px solid #eee;">${grievanceRedressalid}</td>
                  </tr>
                </table>

                <p style="margin-top:25px;">
                  Our team will investigate this issue and get back to you as soon as possible.
                </p>

                <p>
                  Thank you for your patience.
                </p>

                <p>
                  Regards,<br/>
                  <strong>Support Team</strong>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f8f9fa; padding:15px; text-align:center; font-size:12px; color:#666;">
                This is an automated email. Please do not reply directly.
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