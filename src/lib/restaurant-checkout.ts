/** Server-only helpers for guest checkout (Stripe vs pay at table). */

export function isOrderPaymentEnvDisabled(): boolean {
  return (
    process.env.DISABLE_ORDER_PAYMENT === "true" || process.env.DISABLE_ORDER_PAYMENT === "1"
  );
}

export function stripeEnvConfiguredForCheckout(): boolean {
  if (isOrderPaymentEnvDisabled()) return false;
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_APP_URL?.trim());
}

export function restaurantUsesStripeCheckout(restaurant: { onlinePaymentEnabled: boolean }): boolean {
  return restaurant.onlinePaymentEnabled === true && stripeEnvConfiguredForCheckout();
}

export function restaurantHasAtLeastOnePayAtTableOption(restaurant: {
  payAtTableCardEnabled: boolean;
  payAtTableCashEnabled: boolean;
}): boolean {
  return restaurant.payAtTableCardEnabled === true || restaurant.payAtTableCashEnabled === true;
}
