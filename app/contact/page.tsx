"use client";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Mail,
  MapPin,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const initialForm: ContactForm = {
  fullName: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const validateForm = (): string => {
    if (!form.fullName.trim()) {
      return "Please enter your full name.";
    }

    if (!form.email.trim()) {
      return "Please enter your email address.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (form.phone.trim()) {
      const phonePattern = /^[0-9+\-\s()]{10,15}$/;

      if (!phonePattern.test(form.phone.trim())) {
        return "Please enter a valid mobile number.";
      }
    }

    if (!form.subject.trim()) {
      return "Please select a subject.";
    }

    if (!form.message.trim()) {
      return "Please enter your message.";
    }

    if (form.message.trim().length < 10) {
      return "Please enter at least 10 characters in your message.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      await addDoc(collection(db, "contactMessages"), {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        status: "new",
        createdAt: serverTimestamp(),
      });

      setForm(initialForm);
      setSuccessMessage(
        "Your message has been sent successfully. Our team will contact you as soon as possible."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Contact form submission error:", error);

      setErrorMessage(
        "Unable to send your message. Please check your internet connection and Firestore rules, then try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <section className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-100 sm:px-5 sm:text-sm">
            <MessageSquareText size={18} />
            Contact Support
          </span>

          <h1 className="mt-6 text-3xl font-extrabold sm:text-5xl">
            We’re Here to Help
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-slate-200 sm:text-lg sm:leading-8">
            Have a question about a job, application, referral, or our
            platform? Send us a message and our team will get back to you.
          </p>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.5fr]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Contact Information
              </h2>

              <div className="mt-6 space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Mail size={21} />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">Email</p>
                    <a
                      href="mailto:corporatejobsnetwork@gmail.com"
                      className="mt-1 block break-all text-sm text-slate-600 hover:text-blue-700"
                    >
                      corporatejobsnetwork@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-[21px] w-[21px]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" />
                      <circle cx="12" cy="12" r="4" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">Instagram</p>
                    <a
                      href="https://www.instagram.com/corporatejobsnetwork"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm text-slate-600 hover:text-blue-700"
                    >
                      @corporatejobsnetwork
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <MapPin size={21} />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">Location</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Bengaluru, Karnataka, India
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Clock3 size={21} />
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">Response Time</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Usually within 24–48 hours
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-blue-700 p-6 text-white shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <ShieldCheck size={25} />
                <h3 className="text-xl font-extrabold">
                  Stay Safe
                </h3>
              </div>

              <p className="mt-4 text-sm leading-7 text-blue-50">
                Corporate Jobs Network never asks for payment, OTPs,
                passwords, or banking information for job applications
                or referrals.
              </p>
            </div>
          </aside>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-9">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                Send a Message
              </p>

              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                How Can We Help You?
              </h2>

              <p className="mt-3 leading-7 text-slate-600">
                Complete the form below. Fields marked with * are required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Full Name *
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Email Address *
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Mobile Number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter mobile number"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="mb-2 block text-sm font-bold text-slate-800"
                  >
                    Subject *
                  </label>

                  <select
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="">Select a subject</option>
                    <option value="Job Application Help">
                      Job Application Help
                    </option>
                    <option value="Referral Support">
                      Referral Support
                    </option>
                    <option value="Job Posting Correction">
                      Job Posting Correction
                    </option>
                    <option value="Report a Problem">
                      Report a Problem
                    </option>
                    <option value="Business Enquiry">
                      Business Enquiry
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Message *
                </label>

                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={7}
                  maxLength={1500}
                  placeholder="Write your message clearly..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {form.message.length}/1500
                </p>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm font-medium text-green-700"
                >
                  <CheckCircle2
                    size={21}
                    className="mt-0.5 shrink-0"
                  />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-4 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Sending Message...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}