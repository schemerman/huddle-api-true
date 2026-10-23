import { LegalDocument } from "@/components/LegalDocument";
import { DELETE_ACCOUNT_INFO } from "@/constants/legal";

// Public page (no sign-in needed): huddle-mobile.vercel.app/delete-account
// Google Play asks for a web page where people can request deleting their account and data.
export default function DeleteAccountInfoScreen() {
  return <LegalDocument doc={DELETE_ACCOUNT_INFO} other={{ label: "Read the Privacy Policy", href: "/privacy" }} />;
}
