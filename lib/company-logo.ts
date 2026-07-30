const COMPANY_LOGOS: Record<string, string> = {
  infosys:
    "https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg",
  "infosys bpm":
    "https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg",
  accenture:
    "https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg",
  ibm:
    "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
  globallogic:
    "https://upload.wikimedia.org/wikipedia/commons/4/44/GlobalLogic_logo.svg",
  virtusa:
    "https://upload.wikimedia.org/wikipedia/commons/9/9d/Virtusa_logo.svg",
  razorpay:
    "https://upload.wikimedia.org/wikipedia/commons/8/89/Razorpay_logo.svg",
  google:
    "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  microsoft:
    "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg",
  amazon:
    "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
  tcs:
    "https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg",
  "tata consultancy services":
    "https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg",
  wipro:
    "https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Primary_Logo_Color_RGB.svg",
  cognizant:
    "https://upload.wikimedia.org/wikipedia/commons/8/8a/Cognizant_logo_2022.svg",
  capgemini:
    "https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_201x_logo.svg",
  deloitte:
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Deloitte.svg",
  ey:
    "https://upload.wikimedia.org/wikipedia/commons/3/34/EY_logo_2019.svg",
  kpmg:
    "https://upload.wikimedia.org/wikipedia/commons/9/9d/KPMG_logo.svg",
  pwc:
    "https://upload.wikimedia.org/wikipedia/commons/f/f0/PwC_Logo.svg",
  oracle:
    "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
  salesforce:
    "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
  adobe:
    "https://upload.wikimedia.org/wikipedia/commons/8/8d/Adobe_Corporate_Logo.png",
  intel:
    "https://upload.wikimedia.org/wikipedia/commons/8/85/Intel_logo_2023.svg",
  cisco:
    "https://upload.wikimedia.org/wikipedia/commons/6/64/Cisco_logo.svg",
  paypal:
    "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg",
  flipkart:
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.svg",
  swiggy:
    "https://upload.wikimedia.org/wikipedia/en/1/12/Swiggy_logo.svg",
  zomato:
    "https://upload.wikimedia.org/wikipedia/commons/7/75/Zomato_logo.png",
};

function normalizeCompanyName(company = ""): string {
  return company
    .toLowerCase()
    .replace(/private limited/g, "")
    .replace(/pvt\.?\s*ltd\.?/g, "")
    .replace(/limited/g, "")
    .replace(/ltd\.?/g, "")
    .replace(/technologies/g, "")
    .replace(/technology/g, "")
    .replace(/software/g, "")
    .replace(/services/g, "")
    .replace(/solutions/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCompanyLogo(
  company?: string,
  existingLogo?: string
): string {
  const savedLogo = existingLogo?.trim();

  if (savedLogo) {
    return savedLogo;
  }

  const normalizedCompany = normalizeCompanyName(company);

  if (!normalizedCompany) {
    return "";
  }

  const exactLogo = COMPANY_LOGOS[normalizedCompany];

  if (exactLogo) {
    return exactLogo;
  }

  const matchedCompany = Object.keys(COMPANY_LOGOS).find(
    (companyName) =>
      normalizedCompany.includes(companyName) ||
      companyName.includes(normalizedCompany)
  );

  return matchedCompany ? COMPANY_LOGOS[matchedCompany] : "";
}