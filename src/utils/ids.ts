/** Generates a unique container instance ID using crypto.randomUUID. */
export function generateContainerInstanceId(): string {
  return `instance-${crypto.randomUUID()}`;
}
