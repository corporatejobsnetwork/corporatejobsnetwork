export type ReferralStatus =
  | "application_received"
  | "referred"
  | "company_reviewing"
  | "shortlisted"
  | "interviewed"
  | "selected"
  | "rejected";

export type ReferralEmailCandidate = {
  fullName: string;
  email: string;
  company: string;
  jobRole: string;
  jobId?: string;
};

export const referralStatusOptions: ReferralStatus[] = [
  "application_received",
  "referred",
  "company_reviewing",
  "shortlisted",
  "interviewed",
  "selected",
  "rejected",
];

export const referralStatusLabels: Record<ReferralStatus, string> = {
  application_received: "Application Received",
  referred: "Referred",
  company_reviewing: "Company Reviewing Resume",
  shortlisted: "Resume Shortlisted",
  interviewed: "Interviewed",
  selected: "Selected",
  rejected: "Rejected",
};

export function normalizeReferralStatus(value: unknown): ReferralStatus {
  const status = typeof value === "string" ? value.trim().toLowerCase() : "";

  const oldStatusMap: Record<string, ReferralStatus> = {
    new: "application_received",
    reviewed: "company_reviewing",
    under_review: "company_reviewing",
    application_received: "application_received",
    referred: "referred",
    company_reviewing: "company_reviewing",
    shortlisted: "shortlisted",
    interviewed: "interviewed",
    interview_scheduled: "interviewed",
    selected: "selected",
    rejected: "rejected",
  };

  return oldStatusMap[status] ?? "application_received";
}

export function getReferralEmailContent(
  candidate: ReferralEmailCandidate,
  status: ReferralStatus
) {
  const company = candidate.company || "the selected company";
  const role = candidate.jobRole || "the selected role";

  const content: Record<
    ReferralStatus,
    { subject: string; title: string; message: string }
  > = {
    application_received: {
      subject: `Referral application received - ${company}`,
      title: "We received your referral application",
      message: `We have received your referral application for the ${role} position at ${company}.

Our team will check your details and resume. We will update you when there is progress on your application.`,
    },
    referred: {
      subject: `Your profile has been referred - ${company}`,
      title: "Your profile has been referred",
      message: `Good news! Your profile has been referred for the ${role} position at ${company}.

Please check your registered email, spam folder and phone regularly for further communication from the company.`,
    },
    company_reviewing: {
      subject: `Company is reviewing your resume - ${company}`,
      title: "The company is reviewing your resume",
      message: `Your resume for the ${role} position at ${company} is currently being reviewed by the company.

Please keep checking your email and phone. We will update you when we receive more information.`,
    },
    shortlisted: {
      subject: `Your resume has been shortlisted - ${company}`,
      title: "Congratulations! Your resume has been shortlisted",
      message: `Your resume has been shortlisted for the ${role} position at ${company}.

The company may contact you regarding the next steps, such as an assessment, interview or document verification.`,
    },
    interviewed: {
      subject: `Interview status update - ${company}`,
      title: "Your interview status has been updated",
      message: `Your application for the ${role} position at ${company} has reached the interview stage.

Please keep checking your email and phone for interview details or further updates from the company.`,
    },
    selected: {
      subject: `Congratulations! You have been selected - ${company}`,
      title: "Congratulations! You have been selected",
      message: `We are happy to inform you that you have been selected for the ${role} position at ${company}.

We wish you great success in your new role. Thank you for choosing Corporate Jobs Network.`,
    },
    rejected: {
      subject: `Update regarding your referral application - ${company}`,
      title: "Update regarding your referral application",
      message: `Thank you for applying for the ${role} position at ${company} through Corporate Jobs Network.

Unfortunately, you were not selected for this opportunity. Please do not be discouraged. We regularly post new opportunities and will be happy to assist you with future referrals.`,
    },
  };

  return content[status];
}

export async function sendReferralStatusEmail(
  candidate: ReferralEmailCandidate,
  status: ReferralStatus
): Promise<void> {
  const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error(
      "EmailJS is not configured. Check NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY."
    );
  }

  if (!candidate.email.trim()) {
    throw new Error("Candidate email address is missing.");
  }

  const email = getReferralEmailContent(candidate, status);

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      template_params: {
        to_email: candidate.email.trim().toLowerCase(),
        candidate_name: candidate.fullName || "Candidate",
        company_name: candidate.company || "Not provided",
        job_role: candidate.jobRole || "Not provided",
        job_id: candidate.jobId || "Not provided",
        referral_status: referralStatusLabels[status],
        status_title: email.title,
        subject: email.subject,
        message: email.message,
        website_name: "Corporate Jobs Network",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Email sending failed.");
  }
}