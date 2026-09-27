/**
 * Terms of Service — structural screen ready for approved content.
 *
 * No legal claims are invented here: sections describe the current
 * factual state (account, acceptable use, availability) and point to
 * support for the complete terms. Approved counsel text can replace
 * these sections without changing navigation.
 */

import { InfoScreen } from "../components/legal/InfoScreen";

export default function TermsOfService() {
  return (
    <InfoScreen
      title="Terms of Service"
      intro="These terms describe the basics of using JodTod. The complete terms will be published here."
      sections={[
        {
          heading: "Your Account",
          body: "You sign up with an email address or phone number and are responsible for keeping your login details safe.",
        },
        {
          heading: "Using JodTod",
          body: "Use JodTod to track genuine shared expenses with people you know. Do not misuse the app or other members data.",
        },
        {
          heading: "Availability",
          body: "JodTod is provided as-is while it is being actively developed. Features may change as the app improves.",
        },
      ]}
      footer="Questions about these terms? Contact us from Help & Support."
    />
  );
}
