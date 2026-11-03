import { PasswordUpdateForm } from "@/components/password-update-form";

// Reached from a password-reset email (recovery session) or by a signed-in user
// changing their password; the proxy sends visitors without a session to /login.
export default function ResetPasswordPage() {
  return <PasswordUpdateForm />;
}
