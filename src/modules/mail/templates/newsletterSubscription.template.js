// newsletterSubscription.template.js

export const newsletterSubscriptionTemplate = () => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Newsletter Subscription</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f5f7fa;
          font-family: Arial, Helvetica, sans-serif;
        "
      >
        <div style="padding: 40px 15px;">
          <div
            style="
              max-width: 600px;
              margin: 0 auto;
              background: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              border: 1px solid #e5e7eb;
            "
          >

            <!-- HEADER -->
            <div
              style="
                background: #1677ff;
                padding: 25px;
                text-align: center;
              "
            >
              <h1
                style="
                  margin: 0;
                  color: #ffffff;
                  font-size: 24px;
                "
              >
                Pan Journey
              </h1>
            </div>

            <!-- CONTENT -->
            <div style="padding: 35px 30px;">

              <h2
                style="
                  margin-top: 0;
                  color: #1f2937;
                  font-size: 22px;
                "
              >
                Thank You for Subscribing!
              </h2>

              <p
                style="
                  color: #4b5563;
                  font-size: 15px;
                  line-height: 1.7;
                "
              >
                Thank you for subscribing to the
                <strong>Pan Journey</strong> newsletter.
              </p>

              <p
                style="
                  color: #4b5563;
                  font-size: 15px;
                  line-height: 1.7;
                "
              >
                You are now part of our travel community. We’ll keep you
                updated with the latest destinations, travel inspiration,
                special offers and exclusive deals.
              </p>

              <!-- SUCCESS BOX -->
              <div
                style="
                  margin: 25px 0;
                  padding: 18px;
                  background: #f0fdf4;
                  border: 1px solid #bbf7d0;
                  border-radius: 8px;
                  text-align: center;
                "
              >
                <p
                  style="
                    margin: 0;
                    color: #15803d;
                    font-size: 15px;
                    font-weight: 600;
                  "
                >
                  ✓ Your newsletter subscription is confirmed
                </p>
              </div>

              <p
                style="
                  color: #4b5563;
                  font-size: 15px;
                  line-height: 1.7;
                "
              >
                We’re excited to have you with us!
              </p>

              <p
                style="
                  color: #4b5563;
                  font-size: 15px;
                  line-height: 1.7;
                "
              >
                Happy Travelling ✈️
              </p>

              <p
                style="
                  margin-top: 30px;
                  color: #374151;
                  font-size: 14px;
                "
              >
                Regards,<br />
                <strong>Pan Journey Team</strong>
              </p>

            </div>

            <!-- FOOTER -->
            <div
              style="
                padding: 18px 30px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                text-align: center;
              "
            >
              <p
                style="
                  margin: 0;
                  color: #9ca3af;
                  font-size: 12px;
                "
              >
                © ${new Date().getFullYear()} Pan Journey. All rights reserved.
              </p>
            </div>

          </div>
        </div>
      </body>
    </html>
  `;
};