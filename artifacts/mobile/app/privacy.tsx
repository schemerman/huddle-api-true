import { LegalDocument } from "@/components/LegalDocument";
import { PRIVACY_POLICY } from "@/constants/legal";

// Public page (no sign-in needed), e.g. huddle-app.vercel.app/privacy
export default function PrivacyPolicyScreen() {
  return <LegalDocument doc={PRIVACY_POLICY} other={{ label: "Read the Terms of Use", href: "/terms" }} />;
}
