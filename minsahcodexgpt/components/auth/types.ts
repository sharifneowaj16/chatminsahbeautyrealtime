export type AuthStep = "phone" | "otp" | "locked" | "signup";

export interface AuthSession {
  phone: string;
  isLoggedIn: boolean;
  user?: {
    name: string;
    phone: string;
    tier: string;
  };
}
