/**
 * Report a Bug — bug form backed by POST /api/support/requests
 * (type "bug"). App version is attached automatically as context.
 */

import { SupportForm } from "../components/support/SupportForm";

export default function ReportBug() {
  return (
    <SupportForm
      type="bug"
      title="Report a Bug"
      subtitle="Found something broken? Tell us what happened and where, and we will look into it."
      subjectLabel="Bug title"
      subjectPlaceholder="e.g. App closes when I open a group"
      descriptionLabel="Description"
      descriptionPlaceholder="What did you do, what did you expect, and what happened instead? Include steps if you can..."
      screen="report-bug"
      submitLabel="Submit Bug Report"
      successTitle="Bug report submitted"
      successMessage="Thanks for helping us improve. Our team will investigate your report."
    />
  );
}
