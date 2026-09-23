import Newsletter from "./newsletter.model.js";
import { sendSuccess, sendError } from "../../utils/response/ApiResponse.js";
import transporter from "../../config/mailer.js";
import { newsletterSubscriptionTemplate } from "../mail/templates/newsletterSubscription.template.js";


// SUBSCRIBE API
export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return sendError(res, "Email is required", 400);
    }

    const existingEmail = await Newsletter.findOne({ email });

    if (existingEmail) {
      return sendError(res, "Email already subscribed", 400);
    }

    const subscriber = await Newsletter.create({
      email,
    });

    // Send confirmation email
    try {
      await transporter.sendMail({
        from: `"Pan Journey" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Welcome to Pan Journey Newsletter!",
        html: newsletterSubscriptionTemplate(),
      });
    } catch (mailError) {
      console.error(
        "Newsletter confirmation email failed:",
        mailError.message
      );
    }

    return sendSuccess(
      res,
      "Subscribed successfully",
      subscriber,
      null,
      201
    );
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};


// GET ALL SUBSCRIBERS (Admin)
export const getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find()
      .sort({ createdAt: -1 });

    return sendSuccess(
      res,
      "Subscribers fetched successfully",
      subscribers
    );

  } catch (error) {
    return sendError(res, error.message, 500);
  }
};



// UNSUBSCRIBE API
export const unsubscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    const subscriber = await Newsletter.findOneAndUpdate(
      { email },
      {
        isSubscribed: false,
      },
      {
        new: true,
      }
    );

    if (!subscriber) {
      return sendError(
        res,
        "Subscriber not found",
        404
      );
    }

    return sendSuccess(
      res,
      "Unsubscribed successfully",
      subscriber
    );

  } catch (error) {
    return sendError(res, error.message, 500);
  }
};