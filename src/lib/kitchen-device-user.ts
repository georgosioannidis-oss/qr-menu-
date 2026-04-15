/** Synthetic email for legacy auto-created kitchen rows from old signups (no longer created). */
export function kitchenDeviceEmail(restaurantId: string) {
  return `kitchen.${restaurantId}@devices.internal`;
}

export function isKitchenDeviceEmail(email: string): boolean {
  return /^kitchen\.[a-z0-9]+@devices\.internal$/i.test(email.trim());
}
