import dotenv from "dotenv";
import Stripe from "stripe";
dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const stripe = new Stripe(STRIPE_SECRET_KEY);

export default stripe;
