/**
 * Feature Request — idea form backed by POST /api/support/requests
 * (type "feature_request").
 */

import { SupportForm } from "../components/support/SupportForm";

export default function FeatureRequest() {
  return (
    <SupportForm
      type="feature_request"
      title="Feature Request"
      subtitle="Have an idea that would make JodTod better? We would love to hear it."
      subjectLabel="Feature title"
      subjectPlaceholder="e.g. Monthly spending summary"
      descriptionLabel="Description"
      descriptionPlaceholder="Describe the feature and how it would help you..."
      screen="feature-request"
      submitLabel="Submit Request"
      successTitle="Request submitted"
      successMessage="Thanks for the suggestion. Our team reviews every feature request."
    />
  );
}
