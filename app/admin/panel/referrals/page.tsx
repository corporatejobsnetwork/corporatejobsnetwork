"use client";

import {
  getReferralEmailContent,
  normalizeReferralStatus,
  referralStatusLabels,
  referralStatusOptions,
  sendReferralStatusEmail,
  type ReferralStatus,
} from "@/lib/email";
import { db } from "@/lib/firebase";
import {
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
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type ReferralRequest = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company: string;
  jobRole: string;
  jobId: string;
  experience: string;
  location: string;
  dateOfBirth: string;
  careerGap: string;
  linkedin: string;
  resumeUrl: string;
  resumeLink: string;
  message: string;
  adminNotes: string;
  status: ReferralStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastEmailSentAt: Timestamp | null;
};

const statusStyles: Record<ReferralStatus, string> = {
  application_received: "border-blue-200 bg-blue-50 text-blue-700",
  referred: "border-emerald-200 bg-emerald-50 text-emerald-700",
  company_reviewing: "border-amber-200 bg-amber-50 text-amber-700",
  shortlisted: "border-violet-200 bg-violet-50 text-violet-700",
  interviewed: "border-indigo-200 bg-indigo-50 text-indigo-700",
  selected: "border-green-200 bg-green-50 text-green-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
};

function safeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const text = safeString(value).trim();
    if (text) return text;
  }
  return "";
}

function asTimestamp(value: unknown): Timestamp | null {
  return value instanceof Timestamp ? value : null;
}

function formatDate(value: Timestamp | null): string {
  if (!value) return "Date unavailable";

  return value.toDate().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminReferralsPage() {
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReferralStatus>("all");
  const [updatingId, setUpdatingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [savingNotesId, setSavingNotesId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const referralsQuery = query(collection(db, "referralRequests"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      referralsQuery,
      (snapshot) => {
        const nextRequests: ReferralRequest[] = snapshot.docs.map((documentSnapshot) => {
          const data = documentSnapshot.data();
          const status = normalizeReferralStatus(data.status);

          return {
            id: documentSnapshot.id,
            fullName: firstString(data.fullName, data.name),
            email: firstString(data.email, data.emailAddress),
            phone: firstString(data.phone, data.mobile, data.mobileNumber, data.phoneNumber),
            company: firstString(data.company, data.companyName),
            jobRole: firstString(data.jobRole, data.role, data.jobTitle),
            jobId: firstString(data.jobId, data.referenceNumber, data.jobReference),
            experience: firstString(data.experience, data.workExperience),
            location: firstString(data.location, data.currentLocation, data.city),
            dateOfBirth: firstString(data.dateOfBirth, data.dob),
            careerGap: firstString(data.careerGap, data.gap),
            linkedin: firstString(data.linkedin, data.linkedIn, data.linkedinProfile),
            resumeUrl: firstString(data.resumeUrl, data.googleDriveResumeLink),
            resumeLink: firstString(data.resumeLink, data.resume),
            message: firstString(data.message, data.additionalMessage, data.notes),
            adminNotes: safeString(data.adminNotes),
            status,
            createdAt: asTimestamp(data.createdAt),
            updatedAt: asTimestamp(data.updatedAt),
            lastEmailSentAt: asTimestamp(data.lastEmailSentAt),
          };
        });

        setRequests(nextRequests);
        setNoteDrafts((current) => {
          const next = { ...current };
          nextRequests.forEach((item) => {
            if (next[item.id] === undefined) next[item.id] = item.adminNotes;
          });
          return next;
        });
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setPageError("Unable to load referral requests. Please check Firestore rules and try again.");
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesStatus = statusFilter === "all" || request.status === statusFilter;
      const matchesSearch =
        !normalizedSearch ||
        [request.fullName, request.email, request.phone, request.company, request.jobRole, request.jobId, request.location, request.experience]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [requests, searchText, statusFilter]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      application_received: requests.filter(
        (item) => item.status === "application_received"
      ).length,
      referred: requests.filter((item) => item.status === "referred").length,
      company_reviewing: requests.filter(
        (item) => item.status === "company_reviewing"
      ).length,
      shortlisted: requests.filter((item) => item.status === "shortlisted").length,
      interviewed: requests.filter((item) => item.status === "interviewed").length,
      selected: requests.filter((item) => item.status === "selected").length,
      rejected: requests.filter((item) => item.status === "rejected").length,
    }),
    [requests]
  );

  const handleStatusChange = async (request: ReferralRequest, status: ReferralStatus) => {
    if (status === request.status) return;

    const confirmed = window.confirm(
      `Change status to "${referralStatusLabels[status]}" and email ${request.fullName || "this candidate"}?`
    );
    if (!confirmed) return;

    try {
      setUpdatingId(request.id);
      await updateDoc(doc(db, "referralRequests", request.id), {
        status,
        updatedAt: serverTimestamp(),
      });

      try {
        await sendReferralStatusEmail(request, status);
        await updateDoc(doc(db, "referralRequests", request.id), {
          lastEmailStatus: status,
          lastEmailSentAt: serverTimestamp(),
          lastEmailError: "",
        });
        toast.success(`Status updated to "${referralStatusLabels[status]}" and email sent successfully.`);
      } catch (emailError) {
        console.error(emailError);
        await updateDoc(doc(db, "referralRequests", request.id), {
          lastEmailStatus: status,
          lastEmailError: emailError instanceof Error ? emailError.message : "Unknown email error",
        });
        toast.error(`Status updated, but email could not be sent.\n${emailError instanceof Error ? emailError.message : ""}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Unable to update the referral status.");
    } finally {
      setUpdatingId("");
    }
  };

  const handleSaveNotes = async (requestId: string) => {
    try {
      setSavingNotesId(requestId);
      await updateDoc(doc(db, "referralRequests", requestId), {
        adminNotes: noteDrafts[requestId] || "",
        updatedAt: serverTimestamp(),
      });
      toast.success("Admin notes saved successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to save admin notes.");
    } finally {
      setSavingNotesId("");
    }
  };

  const handleDelete = async (request: ReferralRequest) => {
    const confirmed = window.confirm(`Delete the referral request from ${request.fullName || "this candidate"}?`);
    if (!confirmed) return;

    try {
      setDeletingId(request.id);
      await deleteDoc(doc(db, "referralRequests", request.id));
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete the referral request.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-900 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-blue-200">Admin Management</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold sm:text-4xl">Candidate Referral Requests</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-blue-100 sm:text-base">
                Review candidate details, update progress and automatically email candidates when their status changes.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold">
              <RefreshCw size={18} /> Live Firestore updates
            </div>
          </div>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {[
            ["All", counts.all],
            ["Received", counts.application_received],
            ["Referred", counts.referred],
            ["Company Reviewing", counts.company_reviewing],
            ["Shortlisted", counts.shortlisted],
            ["Interviewed", counts.interviewed],
            ["Selected", counts.selected],
            ["Rejected", counts.rejected],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_230px]">
            <div className="relative">
              <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search candidate, company, role, email, phone or Job ID..." className="w-full rounded-xl border border-slate-300 py-3 pl-12 pr-4 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div className="relative">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | ReferralStatus)} className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                <option value="all">All statuses</option>
                {referralStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {referralStatusLabels[status]}
                  </option>
                ))}
              </select>
              <ChevronDown size={19} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </section>

        {pageError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700">{pageError}</div>}

        {loading ? (
          <div className="mt-8 flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 font-semibold text-slate-600"><Loader2 size={24} className="animate-spin text-blue-700" /> Loading referral requests...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <UserRound size={42} className="mx-auto text-slate-400" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">No referral requests found</h2>
          </div>
        ) : (
          <section className="mt-8 space-y-6">
            {filteredRequests.map((request) => {
              const resumeLink = request.resumeUrl || request.resumeLink;
              const isUpdating = updatingId === request.id;
              const isDeleting = deletingId === request.id;
              const isSavingNotes = savingNotesId === request.id;

              return (
                <article key={request.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><UserRound size={22} /></div>
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-extrabold text-slate-900">{request.fullName || "Unnamed Candidate"}</h2>
                          <p className="mt-1 text-sm text-slate-500">Applied: {formatDate(request.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${statusStyles[request.status]}`}>{referralStatusLabels[request.status]}</span>
                    </div>
                  </div>

                  <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1.3fr_0.7fr]">
                    <div className="space-y-6">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail icon={<Mail size={18} />} label="Email" value={request.email} href={request.email ? `mailto:${request.email}` : ""} />
                        <Detail icon={<Phone size={18} />} label="Mobile" value={request.phone} href={request.phone ? `tel:${request.phone}` : ""} />
                        <Detail icon={<MapPin size={18} />} label="Current Location" value={request.location} />
                        <Detail icon={<CalendarDays size={18} />} label="Date of Birth" value={request.dateOfBirth} />
                        <Detail icon={<Clock3 size={18} />} label="Career Gap" value={request.careerGap} />
                        <Detail icon={<BriefcaseBusiness size={18} />} label="Experience" value={request.experience} />
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Job Details</p>
                        <div className="mt-3 grid gap-4 sm:grid-cols-3">
                          <div><p className="text-xs font-semibold text-slate-500">Company</p><p className="mt-1 font-bold text-slate-900">{request.company || "Not provided"}</p></div>
                          <div><p className="text-xs font-semibold text-slate-500">Job Role</p><p className="mt-1 font-bold text-slate-900">{request.jobRole || "Not provided"}</p></div>
                          <div><p className="text-xs font-semibold text-slate-500">Job ID / Reference</p><p className="mt-1 font-bold text-slate-900">{request.jobId || "Not provided"}</p></div>
                        </div>
                      </div>

                      {request.message && <div><p className="text-sm font-bold text-slate-900">Additional Message</p><p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{request.message}</p></div>}

                      <div className="grid gap-3 sm:grid-cols-2">
                        {resumeLink ? <a href={resumeLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-800"><FileText size={19} /> Open Resume <ExternalLink size={16} /></a> : <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-200 px-4 py-3 font-bold text-slate-500"><XCircle size={19} /> No Resume Link</div>}
                        {request.linkedin ? <a href={request.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">View LinkedIn <ExternalLink size={16} /></a> : <div className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-400">LinkedIn not provided</div>}
                      </div>
                    </div>

                    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <div>
                        <p className="text-sm font-extrabold text-slate-900">Update Status & Send Email</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Selecting a different status updates Firestore and emails the candidate automatically.</p>
                      </div>

                      <div className="relative">
                        <select value={request.status} disabled={isUpdating || isDeleting} onChange={(event) => handleStatusChange(request, event.target.value as ReferralStatus)} className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 font-semibold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60">
                          {referralStatusOptions.map((status) => (
                            <option key={status} value={status}>
                              {referralStatusLabels[status]}
                            </option>
                          ))}
                        </select>
                        {isUpdating ? <Loader2 size={19} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-blue-700" /> : <ChevronDown size={19} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" />}
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-white p-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-800"><Send size={17} /> Email Preview</div>
                        <p className="mt-3 text-sm font-bold text-slate-900">{getReferralEmailContent(request, request.status).title}</p>
                        <p className="mt-2 whitespace-pre-line text-xs leading-5 text-slate-600">{getReferralEmailContent(request, request.status).message}</p>
                      </div>

                      <div>
                        <label className="text-sm font-bold text-slate-900">Admin Notes</label>
                        <textarea value={noteDrafts[request.id] || ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [request.id]: event.target.value }))} rows={4} placeholder="Add private notes about eligibility, resume review or referral progress..." className="mt-2 w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                        <button type="button" disabled={isSavingNotes || isDeleting} onClick={() => handleSaveNotes(request.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 font-bold text-white transition hover:bg-slate-900 disabled:opacity-60">{isSavingNotes ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Admin Notes</button>
                      </div>

                      {request.lastEmailSentAt && <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-semibold text-green-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /> Last email sent: {formatDate(request.lastEmailSentAt)}</div>}

                      <button type="button" disabled={isUpdating || isDeleting} onClick={() => handleDelete(request)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{isDeleting ? <Loader2 size={19} className="animate-spin" /> : <Trash2 size={19} />} Delete Request</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function Detail({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = value || "Not provided";
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-blue-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
        {href && value ? <a href={href} className="mt-1 block break-all text-sm font-semibold text-slate-800 hover:text-blue-700">{content}</a> : <p className="mt-1 break-words text-sm font-semibold text-slate-800">{content}</p>}
      </div>
    </div>
  );
}