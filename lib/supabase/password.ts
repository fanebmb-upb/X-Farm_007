export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Returns a user-facing problem with a new password, or null when it can be saved. */
export function newPasswordProblem(password: string, confirmation: string) {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (password !== confirmation) return "The two passwords don’t match.";
  return null;
}
