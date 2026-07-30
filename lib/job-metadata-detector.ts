export type DetectedJobMetadata = {
  experience: string;
  jobCategory: "freshers" | "experienced" | "internship";
  workMode: "Remote" | "Hybrid" | "Onsite" | "";
  employmentType:
    | "Full Time"
    | "Part Time"
    | "Contract"
    | "Internship"
    | "Temporary"
    | "";
  salary: string;
  skills: string[];
  education: string;
  locations: string[];
  lastDate: string;
};

const SKILL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "Java", pattern: /\bjava\b/i },
  { name: "Spring Boot", pattern: /\bspring\s*boot\b/i },
  { name: "Spring", pattern: /\bspring\b/i },
  { name: "JavaScript", pattern: /\bjavascript\b|\bjs\b/i },
  { name: "TypeScript", pattern: /\btypescript\b|\bts\b/i },
  { name: "React", pattern: /\breact(?:\.js)?\b/i },
  { name: "Next.js", pattern: /\bnext(?:\.js)?\b/i },
  { name: "Node.js", pattern: /\bnode(?:\.js)?\b/i },
  { name: "Angular", pattern: /\bangular\b/i },
  { name: "Vue.js", pattern: /\bvue(?:\.js)?\b/i },
  { name: "Python", pattern: /\bpython\b/i },
  { name: "Django", pattern: /\bdjango\b/i },
  { name: "Flask", pattern: /\bflask\b/i },
  { name: "C", pattern: /(?:^|[^a-z0-9+#])c(?:$|[^a-z0-9+#])/i },
  { name: "C++", pattern: /\bc\+\+\b/i },
  { name: "C#", pattern: /\bc#\b/i },
  { name: ".NET", pattern: /\.net\b|\bdotnet\b/i },
  { name: "PHP", pattern: /\bphp\b/i },
  { name: "Ruby", pattern: /\bruby\b/i },
  { name: "Ruby on Rails", pattern: /\bruby\s+on\s+rails\b|\brails\b/i },
  { name: "Go", pattern: /\bgolang\b|\bgo\s+language\b/i },
  { name: "Kotlin", pattern: /\bkotlin\b/i },
  { name: "Swift", pattern: /\bswift\b/i },
  { name: "SQL", pattern: /\bsql\b/i },
  { name: "MySQL", pattern: /\bmysql\b/i },
  { name: "PostgreSQL", pattern: /\bpostgres(?:ql)?\b/i },
  { name: "MongoDB", pattern: /\bmongodb\b|\bmongo\b/i },
  { name: "Oracle", pattern: /\boracle\b/i },
  { name: "Firebase", pattern: /\bfirebase\b/i },
  { name: "AWS", pattern: /\baws\b|amazon web services/i },
  { name: "Azure", pattern: /\bazure\b/i },
  { name: "GCP", pattern: /\bgcp\b|google cloud/i },
  { name: "Docker", pattern: /\bdocker\b/i },
  { name: "Kubernetes", pattern: /\bkubernetes\b|\bk8s\b/i },
  { name: "Git", pattern: /\bgit\b|\bgithub\b|\bgitlab\b/i },
  { name: "Linux", pattern: /\blinux\b/i },
  { name: "REST API", pattern: /\brest(?:ful)?\s+api(?:s)?\b/i },
  { name: "GraphQL", pattern: /\bgraphql\b/i },
  { name: "Kafka", pattern: /\bkafka\b/i },
  { name: "Microservices", pattern: /\bmicroservices?\b/i },
  { name: "Data Structures", pattern: /\bdata structures?\b/i },
  { name: "Algorithms", pattern: /\balgorithms?\b/i },
  { name: "Machine Learning", pattern: /\bmachine learning\b|\bml\b/i },
  { name: "Artificial Intelligence", pattern: /\bartificial intelligence\b|\bai\b/i },
  { name: "Power BI", pattern: /\bpower\s*bi\b/i },
  { name: "Tableau", pattern: /\btableau\b/i },
  { name: "Excel", pattern: /\bexcel\b|\bms excel\b/i },
  { name: "MS Office", pattern: /\bms office\b|\bmicrosoft office\b/i },
  { name: "Selenium", pattern: /\bselenium\b/i },
  { name: "Manual Testing", pattern: /\bmanual testing\b/i },
  { name: "Automation Testing", pattern: /\bautomation testing\b/i },
  { name: "Jenkins", pattern: /\bjenkins\b/i },
  { name: "CI/CD", pattern: /\bci\s*\/?\s*cd\b/i },
  { name: "Agile", pattern: /\bagile\b/i },
  { name: "Scrum", pattern: /\bscrum\b/i },
  { name: "Salesforce", pattern: /\bsalesforce\b/i },
  { name: "SAP", pattern: /\bsap\b/i },
  { name: "ServiceNow", pattern: /\bservicenow\b/i },
];

const LOCATION_PATTERNS = [
  "Bengaluru",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Mumbai",
  "Navi Mumbai",
  "Delhi",
  "New Delhi",
  "Noida",
  "Greater Noida",
  "Gurugram",
  "Gurgaon",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Cochin",
  "Coimbatore",
  "Mysuru",
  "Mysore",
  "Mangaluru",
  "Mangalore",
  "Hubballi",
  "Hubli",
  "Belagavi",
  "Belgaum",
  "Thiruvananthapuram",
  "Trivandrum",
  "Indore",
  "Nagpur",
  "Lucknow",
  "Bhubaneswar",
  "Chandigarh",
  "Mohali",
  "Remote",
  "India",
];

function normalizeText(value = ""): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function uniqueValues(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function detectExperience(text: string): string {
  const normalized = text.replace(/[–—]/g, "-");

  const rangeMatch = normalized.match(
    /\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:\+?\s*)?(?:years?|yrs?)\b/i
  );

  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]} years`;
  }

  const plusMatch = normalized.match(
    /\b(\d{1,2})\s*\+\s*(?:years?|yrs?)\b/i
  );

  if (plusMatch) {
    return `${plusMatch[1]}+ years`;
  }

  const minimumMatch = normalized.match(
    /\b(?:minimum|min\.?|at least)\s*(?:of\s*)?(\d{1,2})\s*(?:years?|yrs?)\b/i
  );

  if (minimumMatch) {
    return `${minimumMatch[1]}+ years`;
  }

  const singleMatch = normalized.match(
    /\b(\d{1,2})\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/i
  );

  if (singleMatch) {
    return `${singleMatch[1]} years`;
  }

  if (
    /\bfreshers?\b/i.test(text) ||
    /\bno prior experience\b/i.test(text) ||
    /\bentry[- ]level\b/i.test(text) ||
    /\b0\s*(?:-|to)\s*1\s*(?:years?|yrs?)\b/i.test(normalized)
  ) {
    return "0-1 years";
  }

  return "";
}

function detectJobCategory(
  text: string,
  experience: string
): DetectedJobMetadata["jobCategory"] {
  if (
    /\bintern(ship)?\b/i.test(text) ||
    /\bapprentice(ship)?\b/i.test(text) ||
    /\btrainee\b/i.test(text)
  ) {
    return "internship";
  }

  if (
    /\bfreshers?\b/i.test(text) ||
    /\bentry[- ]level\b/i.test(text) ||
    experience === "0-1 years" ||
    experience === "0 years"
  ) {
    return "freshers";
  }

  return "experienced";
}

function detectWorkMode(
  text: string
): DetectedJobMetadata["workMode"] {
  if (
    /\bremote\b/i.test(text) ||
    /\bwork from home\b/i.test(text) ||
    /\bwfh\b/i.test(text)
  ) {
    return "Remote";
  }

  if (
    /\bhybrid\b/i.test(text) ||
    /\bflexible work model\b/i.test(text)
  ) {
    return "Hybrid";
  }

  if (
    /\bonsite\b/i.test(text) ||
    /\bon-site\b/i.test(text) ||
    /\bwork from office\b/i.test(text) ||
    /\bwfo\b/i.test(text)
  ) {
    return "Onsite";
  }

  return "";
}

function detectEmploymentType(
  text: string
): DetectedJobMetadata["employmentType"] {
  if (/\bintern(ship)?\b/i.test(text) || /\bapprentice(ship)?\b/i.test(text)) {
    return "Internship";
  }

  if (/\bpart[- ]time\b/i.test(text)) {
    return "Part Time";
  }

  if (
    /\bcontract(?:ual)?\b/i.test(text) ||
    /\bfixed[- ]term\b/i.test(text)
  ) {
    return "Contract";
  }

  if (/\btemporary\b/i.test(text)) {
    return "Temporary";
  }

  if (
    /\bfull[- ]time\b/i.test(text) ||
    /\bpermanent\b/i.test(text)
  ) {
    return "Full Time";
  }

  return "";
}

function detectSalary(text: string): string {
  const normalized = text.replace(/[–—]/g, "-");

  const lpaRange = normalized.match(
    /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?\s*(?:per\s+annum|p\.?a\.?)?)/i
  );

  if (lpaRange) {
    return `${lpaRange[1]}-${lpaRange[2]} LPA`;
  }

  const singleLpa = normalized.match(
    /(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?\s*(?:per\s+annum|p\.?a\.?)?)/i
  );

  if (singleLpa) {
    return `${singleLpa[1]} LPA`;
  }

  const rupeeRange = normalized.match(
    /(?:₹|rs\.?|inr)\s*([\d,]+)\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:per\s+annum|per\s+year|annually|p\.?a\.?)?/i
  );

  if (rupeeRange) {
    return `₹${rupeeRange[1]}-₹${rupeeRange[2]} per annum`;
  }

  const monthlyRange = normalized.match(
    /(?:₹|rs\.?|inr)\s*([\d,]+)\s*(?:-|to)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\s*(?:per\s+month|monthly|p\.?m\.?)/i
  );

  if (monthlyRange) {
    return `₹${monthlyRange[1]}-₹${monthlyRange[2]} per month`;
  }

  return "";
}

function detectSkills(text: string): string[] {
  const detected = SKILL_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ name }) => name
  );

  return uniqueValues(detected).slice(0, 15);
}

function detectEducation(text: string): string {
  const educationRules: Array<{ label: string; pattern: RegExp }> = [
    {
      label: "BE/BTech",
      pattern:
        /\b(?:b\.?\s*e\.?|b\.?\s*tech|bachelor(?:'s)?\s+of\s+engineering|bachelor(?:'s)?\s+of\s+technology)\b/i,
    },
    {
      label: "ME/MTech",
      pattern:
        /\b(?:m\.?\s*e\.?|m\.?\s*tech|master(?:'s)?\s+of\s+engineering|master(?:'s)?\s+of\s+technology)\b/i,
    },
    { label: "BCA", pattern: /\bb\.?\s*c\.?\s*a\.?\b/i },
    { label: "MCA", pattern: /\bm\.?\s*c\.?\s*a\.?\b/i },
    { label: "BSc", pattern: /\bb\.?\s*sc\.?\b|\bbachelor(?:'s)?\s+of\s+science\b/i },
    { label: "MSc", pattern: /\bm\.?\s*sc\.?\b|\bmaster(?:'s)?\s+of\s+science\b/i },
    { label: "BCom", pattern: /\bb\.?\s*com\.?\b/i },
    { label: "MCom", pattern: /\bm\.?\s*com\.?\b/i },
    { label: "BBA", pattern: /\bb\.?\s*b\.?\s*a\.?\b/i },
    { label: "MBA", pattern: /\bm\.?\s*b\.?\s*a\.?\b/i },
    { label: "Diploma", pattern: /\bdiploma\b/i },
    {
      label: "Any Graduate",
      pattern:
        /\bany graduate\b|\bany graduation\b|\bgraduate in any discipline\b/i,
    },
    {
      label: "Bachelor's Degree",
      pattern: /\bbachelor(?:'s)? degree\b|\bundergraduate degree\b/i,
    },
    {
      label: "Master's Degree",
      pattern: /\bmaster(?:'s)? degree\b|\bpostgraduate degree\b/i,
    },
  ];

  const detected = educationRules
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

  return uniqueValues(detected).join(", ");
}

function detectLocations(text: string): string[] {
  const matches = LOCATION_PATTERNS.filter((location) => {
    const pattern = new RegExp(
      `\\b${location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );
    return pattern.test(text);
  });

  const normalized = matches.map((location) => {
    if (location === "Bangalore") return "Bengaluru";
    if (location === "Mysore") return "Mysuru";
    if (location === "Mangalore") return "Mangaluru";
    if (location === "Hubli") return "Hubballi";
    if (location === "Belgaum") return "Belagavi";
    if (location === "Gurgaon") return "Gurugram";
    if (location === "Cochin") return "Kochi";
    if (location === "Trivandrum") return "Thiruvananthapuram";
    return location;
  });

  return uniqueValues(normalized).slice(0, 8);
}

function detectLastDate(text: string): string {
  const datePatterns = [
    /\b(?:last date|application deadline|apply by|closing date|deadline)\s*[:\-–—]?\s*((?:\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4})|(?:[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})|(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}))\b/i,
    /\bapplications?\s+(?:close|closes|closing)\s+(?:on\s+)?((?:\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+\s+\d{4})|(?:[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})|(?:\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}))\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

export function detectJobMetadata(
  rawContent?: string
): DetectedJobMetadata {
  const text = normalizeText(rawContent || "");
  const experience = detectExperience(text);

  return {
    experience,
    jobCategory: detectJobCategory(text, experience),
    workMode: detectWorkMode(text),
    employmentType: detectEmploymentType(text),
    salary: detectSalary(text),
    skills: detectSkills(text),
    education: detectEducation(text),
    locations: detectLocations(text),
    lastDate: detectLastDate(text),
  };
}