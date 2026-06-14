import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
  appInfo: {
    name: "Own a Pixel of Earth",
    version: "1.0.0"
  }
});
