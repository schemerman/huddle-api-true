import { LegalDocument } from "@/components/LegalDocument";
import { TERMS_OF_USE } from "@/constants/legal";

// Public page (no sign-in needed), e.g. huddle-mobile.vercel.app/terms
export default function TermsOfUseScreen() {
  return <LegalDocument doc={TERMS_OF_USE} other={{ label: "Read the Privacy Policy", href: "/privacy" }} />;
}
