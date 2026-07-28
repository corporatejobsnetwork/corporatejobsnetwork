"use client";

import { db } from "@/lib/firebase";
import emailjs from "@emailjs/browser";
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type MessageStatus = "new" | "in-progress" | "resolved";

type ContactMessage = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: MessageStatus;
  createdAt: Timestamp | null;
};

type ReplyTemplateKey =
  | "custom"
  | "application-link"
  | "referral-update"
  | "resume-review"
  | "eligibility"
  | "general-support";

const statusOptions: MessageStatus[] = ["new", "in-progress", "resolved"];

const statusStyles: Record<MessageStatus, string> = {
  new: "border-blue-200 bg-blue-50 text-blue-700",
  "in-progress": "border-amber-200 bg-amber-50 text-amber-700",
  resolved: "border-green-200 bg-green-50 text-green-700",
};

const replyTemplates: Record<
  Exclude<ReplyTemplateKey, "custom">,
  { label: string; message: string }
> = {
  "application-link": {
    label: "Application Link",
    message:
      "Thank you for contacting Corporate Jobs Network.\n\nPlease check the job details page for the direct application link. Make sure you verify your eligibility and submit the application before the closing date.\n\nPlease reply to this email if you need further assistance.",
  },
  "referral-update": {
    label: "Referral Update",
    message:
      "Thank you for contacting Corporate Jobs Network.\n\nWe have received your referral-related query. Referral availability depends on the company, job ID, eligibility and active employee availability. We will update you when more information is available.\n\nPlease keep your latest resume ready.",
  },
  "resume-review": {
    label: "Resume Review",
    message:
      "Thank you for contacting Corporate Jobs Network.\n\nPlease share your latest resume in PDF format. Make sure it includes your education, skills, projects, experience, contact details and current location.\n\nWe will review the information and guide you with the next steps.",
  },
  eligibility: {
    label: "Eligibility Criteria",
    message:
      "Thank you for contacting Corporate Jobs Network.\n\nPlease carefully review the qualification, graduation year, experience, location and skill requirements mentioned in the job description. Apply only when your profile matches the required eligibility criteria.\n\nPlease reply with the job title or job ID if you need specific clarification.",
  },
  "general-support": {
    label: "General Support",
    message:
      "Thank you for contacting Corporate Jobs Network.\n\nWe have reviewed your message and will help you with the available information. Please reply with the company name, job title and job ID so that we can assist you accurately.",
  },
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatDate(value: Timestamp | null): string {
  if (!value) {
    return "Date unavailable";
  }

  return value.toDate().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildReplyBody(candidateName: string, response: string): string {
  const name = candidateName.trim() || "Candidate";

  return `Hi ${name},

${response.trim()}

Best Regards,
Corporate Jobs Network`;
}

export default function AdminContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MessageStatus>(
    "all"
  );
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const [replyingTo, setReplyingTo] = useState<ContactMessage | null>(null);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] =
    useState<ReplyTemplateKey>("custom");
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPageError("");

    const messagesQuery = query(
      collection(db, "contactMessages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextMessages: ContactMessage[] = snapshot.docs.map(
          (documentSnapshot) => {
            const data = documentSnapshot.data();
            const rawStatus = safeString(data.status).toLowerCase();

            const status: MessageStatus = statusOptions.includes(
              rawStatus as MessageStatus
            )
              ? (rawStatus as MessageStatus)
              : "new";

            return {
              id: documentSnapshot.id,
              fullName: safeString(data.fullName),
              email: safeString(data.email),
              phone: safeString(data.phone),
              subject: safeString(data.subject),
              message: safeString(data.message),
              status,
              createdAt:
                data.createdAt instanceof Timestamp ? data.createdAt : null,
            };
          }
        );

        setMessages(nextMessages);
        setLoading(false);
      },
      (error) => {
        console.error("Unable to load contact messages:", error);
        setPageError(
          "Unable to load contact messages. Please check Firestore rules and try again."
        );
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!replyingTo) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !sendingReply) {
        closeReplyModal();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [replyingTo, sendingReply]);

  const filteredMessages = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return messages.filter((message) => {
      const matchesStatus =
        statusFilter === "all" || message.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        [
          message.fullName,
          message.email,
          message.phone,
          message.subject,
          message.message,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [messages, searchText, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: messages.length,
      new: messages.filter((item) => item.status === "new").length,
      inProgress: messages.filter(
        (item) => item.status === "in-progress"
      ).length,
      resolved: messages.filter((item) => item.status === "resolved").length,
    };
  }, [messages]);

  const handleStatusChange = async (
    messageId: string,
    status: MessageStatus
  ) => {
    try {
      setUpdatingId(messageId);

      await updateDoc(doc(db, "contactMessages", messageId), {
        status,
        updatedAt: serverTimestamp(),
      });

      toast.success(
        `Message status updated to ${status.replace("-", " ")}.`
      );
    } catch (error) {
      console.error("Unable to update message status:", error);
      toast.error("Unable to update the message status.");
    } finally {
      setUpdatingId("");
    }
  };

  const handleDelete = async (message: ContactMessage) => {
    const confirmed = window.confirm(
      `Delete the message from ${message.fullName || "this user"}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(message.id);
      await deleteDoc(doc(db, "contactMessages", message.id));
      toast.success("Contact message deleted successfully.");
    } catch (error) {
      console.error("Unable to delete contact message:", error);
      toast.error("Unable to delete the contact message.");
    } finally {
      setDeletingId("");
    }
  };

  const openReplyModal = (message: ContactMessage) => {
    if (!message.email) {
      toast.error("This contact message does not contain an email address.");
      return;
    }

    setReplyingTo(message);
    setReplySubject(
      `Re: ${message.subject || "Your message to Corporate Jobs Network"}`
    );
    setReplyMessage("");
    setSelectedTemplate("custom");
  };

  const closeReplyModal = () => {
    if (sendingReply) {
      return;
    }

    setReplyingTo(null);
    setReplySubject("");
    setReplyMessage("");
    setSelectedTemplate("custom");
  };

  const handleTemplateChange = (templateKey: ReplyTemplateKey) => {
    setSelectedTemplate(templateKey);

    if (templateKey === "custom") {
      setReplyMessage("");
      return;
    }

    setReplyMessage(replyTemplates[templateKey].message);
  };

  const handleSendReply = async () => {
    if (!replyingTo) {
      return;
    }

    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID?.trim();
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID?.trim();
    const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY?.trim();

    if (!serviceId || !templateId || !publicKey) {
      toast.error(
        "EmailJS configuration is missing. Please check your .env.local file."
      );
      return;
    }

    if (!replyingTo.email.trim()) {
      toast.error("Candidate email address is missing.");
      return;
    }

    if (!replySubject.trim()) {
      toast.error("Please enter an email subject.");
      return;
    }

    if (!replyMessage.trim()) {
      toast.error("Please enter your reply message.");
      return;
    }

    const finalBody = buildReplyBody(replyingTo.fullName, replyMessage);

    try {
      setSendingReply(true);

      await emailjs.send(
        serviceId,
        templateId,
        {
          to_name: replyingTo.fullName || "Candidate",
          candidate_name: replyingTo.fullName || "Candidate",
          to_email: replyingTo.email,
          recipient_email: replyingTo.email,
          email: replyingTo.email,
          reply_to: replyingTo.email,
          subject: replySubject.trim(),
          email_subject: replySubject.trim(),
          message: finalBody,
          reply_message: finalBody,
          original_subject: replyingTo.subject || "No subject",
          original_message: replyingTo.message || "No message content",
          from_name: "Corporate Jobs Network",
        },
        {
          publicKey,
        }
      );

      const nextStatus: MessageStatus =
        replyingTo.status === "new" ? "in-progress" : replyingTo.status;

      await updateDoc(doc(db, "contactMessages", replyingTo.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        lastRepliedAt: serverTimestamp(),
        lastReplySubject: replySubject.trim(),
        lastReplyMessage: finalBody,
        replyHistory: arrayUnion({
          subject: replySubject.trim(),
          message: finalBody,
          sentTo: replyingTo.email,
          sentAt: Timestamp.now(),
        }),
      });

      toast.success(`Reply sent successfully to ${replyingTo.email}.`);
      closeReplyModal();
    } catch (error) {
      console.error("Unable to send contact reply:", error);

      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Please verify the EmailJS template and try again.";

      toast.error(`Unable to send email. ${errorMessage}`);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-200">
              Admin Management
            </p>

            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-extrabold sm:text-4xl">
                  Contact Messages
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                  Manage messages submitted through the “How Can We Help You?”
                  contact form and reply directly by email.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">
                <RefreshCw size={18} />
                Live Firestore updates
              </div>
            </div>
          </div>

          <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              ["All Messages", counts.all],
              ["New", counts.new],
              ["In Progress", counts.inProgress],
              ["Resolved", counts.resolved],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_230px]">
              <div className="relative">
                <Search
                  size={20}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search name, email, phone, subject or message..."
                  className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "all" | MessageStatus
                    )
                  }
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="all">All statuses</option>
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>

                <ChevronDown
                  size={19}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                />
              </div>
            </div>
          </section>

          {pageError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">
              {pageError}
            </div>
          )}

          {loading ? (
            <div className="mt-8 flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-3 font-semibold text-slate-600">
                <Loader2 size={24} className="animate-spin text-blue-700" />
                Loading contact messages...
              </div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <MessageSquareText size={42} className="mx-auto text-slate-400" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                No contact messages found
              </h2>
              <p className="mt-2 text-slate-600">
                Messages submitted through the contact page will appear here.
              </p>
            </div>
          ) : (
            <section className="mt-8 grid gap-6 xl:grid-cols-2">
              {filteredMessages.map((message) => {
                const isUpdating = updatingId === message.id;
                const isDeleting = deletingId === message.id;

                return (
                  <article
                    key={message.id}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <UserRound size={22} />
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-xl font-extrabold text-slate-900">
                              {message.fullName || "Unnamed User"}
                            </h2>

                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                              <Clock3 size={15} />
                              {formatDate(message.createdAt)}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                            statusStyles[message.status]
                          }`}
                        >
                          {message.status.replace("-", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-6 p-5 sm:p-6">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <Mail
                            size={18}
                            className="mt-0.5 shrink-0 text-blue-700"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Email
                            </p>
                            <a
                              href={`mailto:${message.email}`}
                              className="mt-1 block break-all text-sm font-semibold text-slate-800 hover:text-blue-700"
                            >
                              {message.email || "Not provided"}
                            </a>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Phone
                            size={18}
                            className="mt-0.5 shrink-0 text-blue-700"
                          />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Phone
                            </p>
                            <a
                              href={`tel:${message.phone}`}
                              className="mt-1 block text-sm font-semibold text-slate-800 hover:text-blue-700"
                            >
                              {message.phone || "Not provided"}
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                          Subject
                        </p>
                        <p className="mt-1 font-extrabold text-slate-900">
                          {message.subject || "No subject"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Message
                        </p>
                        <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                          {message.message || "No message content"}
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => openReplyModal(message)}
                          disabled={!message.email || isDeleting}
                          className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Mail size={19} />
                          Reply by Email
                        </button>

                        {message.phone ? (
                          <a
                            href={`tel:${message.phone}`}
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Phone size={19} />
                            Call Candidate
                          </a>
                        ) : (
                          <div className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-400">
                            Phone not provided
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="relative">
                          <select
                            value={message.status}
                            disabled={isUpdating || isDeleting}
                            onChange={(event) =>
                              handleStatusChange(
                                message.id,
                                event.target.value as MessageStatus
                              )
                            }
                            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                          >
                            <option value="new">New</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>

                          {isUpdating ? (
                            <Loader2
                              size={19}
                              className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-700"
                            />
                          ) : (
                            <ChevronDown
                              size={19}
                              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isUpdating || isDeleting}
                          onClick={() => handleDelete(message)}
                          className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDeleting ? (
                            <Loader2 size={19} className="animate-spin" />
                          ) : (
                            <Trash2 size={19} />
                          )}
                          Delete
                        </button>
                      </div>

                      {message.status === "resolved" && (
                        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                          <CheckCircle2 size={19} />
                          This enquiry is marked as resolved.
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

      {replyingTo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeReplyModal();
            }
          }}
        >
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-700">
                  Email Reply
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                  Reply to {replyingTo.fullName || "Candidate"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeReplyModal}
                disabled={sendingReply}
                aria-label="Close reply window"
                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
              >
                <X size={22} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                  Recipient
                </p>
                <p className="mt-1 break-all font-bold text-slate-900">
                  {replyingTo.email}
                </p>
              </div>

              <div>
                <label
                  htmlFor="reply-template"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Quick reply template
                </label>
                <div className="relative">
                  <select
                    id="reply-template"
                    value={selectedTemplate}
                    disabled={sendingReply}
                    onChange={(event) =>
                      handleTemplateChange(
                        event.target.value as ReplyTemplateKey
                      )
                    }
                    className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                  >
                    <option value="custom">Custom Reply</option>
                    {Object.entries(replyTemplates).map(([key, template]) => (
                      <option key={key} value={key}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={19}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reply-subject"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Subject
                </label>
                <input
                  id="reply-subject"
                  type="text"
                  value={replySubject}
                  disabled={sendingReply}
                  onChange={(event) => setReplySubject(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="reply-message"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Your reply
                </label>
                <textarea
                  id="reply-message"
                  rows={9}
                  value={replyMessage}
                  disabled={sendingReply}
                  onChange={(event) => setReplyMessage(event.target.value)}
                  placeholder="Type your reply here..."
                  className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 leading-7 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Greeting and Corporate Jobs Network signature are added
                  automatically.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Original enquiry
                </p>
                <p className="mt-2 font-bold text-slate-900">
                  {replyingTo.subject || "No subject"}
                </p>
                <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {replyingTo.message || "No message content"}
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeReplyModal}
                  disabled={sendingReply}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={sendingReply}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingReply ? (
                    <Loader2 size={19} className="animate-spin" />
                  ) : (
                    <Send size={19} />
                  )}
                  {sendingReply ? "Sending..." : "Send Email"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}