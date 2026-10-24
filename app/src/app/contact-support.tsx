/**
 * Contact Support — message form backed by POST /api/support/requests
 * (type "support"). Success shows a confirmation; failures stay on
 * the form with a recoverable error.
 */

import { SupportForm } from "../components/support/SupportForm";

export default function ContactSupport() {
  return (
    <SupportForm
      type="support"
      title="Contact Support"
      subtitle="Tell us what you need help with and our team will get back to you."
      subjectLabel="Subject"
      subjectPlaceholder="What is this about?"
      descriptionLabel="Message"
      descriptionPlaceholder="Describe your question or issue in detail..."
      screen="contact-support"
      submitLabel="Send Message"
      successTitle="Message sent"
      successMessage="Thanks for reaching out. Our team will review your message and respond soon."
    />
  );
}
