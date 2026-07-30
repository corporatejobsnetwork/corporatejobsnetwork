export type CompanyRoleDetection = {
  company: string;
  role: string;
};

const KNOWN_COMPANIES = [
  "Google",
  "Microsoft",
  "Amazon",
  "Apple",
  "Meta",
  "Netflix",
  "Oracle",
  "IBM",
  "Intel",
  "Cisco",
  "Adobe",
  "Salesforce",
  "SAP",
  "Accenture",
  "Infosys",
  "TCS",
  "Wipro",
  "HCL",
  "Tech Mahindra",
  "Capgemini",
  "Cognizant",
  "Deloitte",
  "EY",
  "KPMG",
  "PwC",
  "JP Morgan",
  "JPMorgan Chase",
  "Goldman Sachs",
  "Morgan Stanley",
  "PayPal",
  "PhonePe",
  "Razorpay",
  "Flipkart",
  "Swiggy",
  "Zomato",
  "Meesho",
  "Nokia",
  "Bosch",
  "Siemens",
  "Mercedes-Benz",
  "Volvo",
  "Qualcomm",
  "AMD",
  "NVIDIA",
];

const ROLE_PATTERNS = [
  "Software Engineer",
  "Associate Software Engineer",
  "Software Developer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Java Developer",
  "Python Developer",
  "React Developer",
  "Node.js Developer",
  "Cloud Engineer",
  "DevOps Engineer",
  "QA Engineer",
  "Test Engineer",
  "Automation Engineer",
  "Support Engineer",
  "System Engineer",
  "Graduate Engineer Trainee",
  "GET",
  "Graduate Trainee",
  "Apprentice",
  "Intern",
  "Data Analyst",
  "Business Analyst",
  "HR Executive",
  "HR Associate",
  "Recruiter",
  "Associate",
  "Consultant",
  "Analyst",
  "Senior Analyst",
  "Technical Analyst",
  "Technology Analyst",
  "SDE I",
  "SDE II",
  "Project Engineer",
  "Network Engineer",
  "Process Executive",
  "Process Associate",
  "Customer Support",
];

function clean(value: string) {
  return value
    .replace(/\r/g, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectCompanyAndRole(
  text?: string
): CompanyRoleDetection {
  if (!text) {
    return {
      company: "",
      role: "",
    };
  }

  const content = clean(text);

  let company = "";
  let role = "";

  // Known company names
  for (const name of KNOWN_COMPANIES) {
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

    if (regex.test(content)) {
      company = name;
      break;
    }
  }

  // Company:
  if (!company) {
    const match = content.match(
      /(?:Company|Company Name)\s*[:\-]\s*(.+?)(?=\||,|Role|Position|Location|Qualification|Experience|Salary|$)/i
    );

    if (match) {
      company = clean(match[1]);
    }
  }

  // About COMPANY
  if (!company) {
    const match = content.match(/About\s+([A-Z][A-Za-z0-9&.\- ]+)/i);

    if (match) {
      company = clean(match[1]);
    }
  }

  // Role:
  const roleRegex =
    /(?:Role|Position|Designation|Job Title|Hiring For|Opening For)\s*[:\-]\s*(.+?)(?=\||,|Location|Qualification|Experience|Salary|Company|$)/i;

  const roleMatch = content.match(roleRegex);

  if (roleMatch) {
    role = clean(roleMatch[1]);
  }

  // Search common role names
  if (!role) {
    for (const pattern of ROLE_PATTERNS) {
      const regex = new RegExp(
        `\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i"
      );

      if (regex.test(content)) {
        role = pattern;
        break;
      }
    }
  }

  return {
    company,
    role,
  };
}