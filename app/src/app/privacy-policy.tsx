/**
 * Privacy Policy — factual description of data handling as built.
 *
 * Describes only what the app actually does today (profile data,
 * secure token storage, authenticated API). The complete policy will
 * be published here.
 */

import { InfoScreen } from "../components/legal/InfoScreen";

export default function PrivacyPolicy() {
  return (
    <InfoScreen
      title="Privacy Policy"
      intro="This summary describes how JodTod handles your data today. The complete privacy policy will be published here."
      sections={[
        {
          heading: "What We Store",
          body: "Your profile (name, username, email or phone, and photo if you add one), your groups and expenses, and your preferences such as currency.",
        },
        {
          heading: "How It Is Protected",
          body: "Sign-in tokens are kept in secure on-device storage. Passwords are never stored in readable form. API requests use your authenticated session, and you can only ever see your own data.",
        },
        {
          heading: "What We Do Not Do",
          body: "JodTod does not sell personal data. Support messages you send are used only to help with your request.",
        },
      ]}
      footer="Questions about privacy? Contact us from Help & Support."
    />
  );
}
