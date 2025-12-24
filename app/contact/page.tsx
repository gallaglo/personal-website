import { ContactForm } from "@/components/contact-form";

export default function Contact() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Get in Touch</h1>

      <p className="text-gray-700 mb-8">
        Have a question or want to work together? Send me a message and I&apos;ll get back to you as soon as possible.
      </p>

      <ContactForm />
    </div>
  );
}
