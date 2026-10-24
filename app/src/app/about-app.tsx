/**
 * About the App — factual description of what JodTod does today.
 * Only shipped features are described; nothing is invented.
 */

import { InfoScreen } from "../components/legal/InfoScreen";

export default function AboutApp() {
  return (
    <InfoScreen
      title="About the App"
      intro="JodTod is a group-expense splitting app. Create trips and groups with friends, record shared expenses, track balances, and settle up — all in one place."
      sections={[
        {
          heading: "Groups",
          body: "Create a group for roommates, trips, or events. Invite members with a code or link, then record every shared expense inside the group.",
        },
        {
          heading: "Expenses & Activity",
          body: "Each expense records the amount, category, and who paid. Your Activity feed lists the newest expense, settlement, and member events first.",
        },
        {
          heading: "Settlements",
          body: "The Settle tab shows who owes whom from recorded expenses. Recording a settlement updates balances for everyone.",
        },
        {
          heading: "Profile & Preferences",
          body: "Manage your name, username, phone, and photo from Personal Information. Preferences covers your INR currency, date format, and week start.",
        },
      ]}
    />
  );
}
