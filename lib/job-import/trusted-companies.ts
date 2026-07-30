import type { TrustedCompany } from "./types";

export const trustedCompanies: TrustedCompany[] = [
  {
    name: "Infosys",
    slug: "infosys",
    provider: "custom",

    // Updated to the actual jobs listing page
    careersUrl:
      "https://careers.infosys.com/instep/aspx/InfosysLCAPostings.aspx",

    apiUrl:
      "https://careers.infosys.com/instep/aspx/InfosysLCAPostings.aspx",

    boardId: "infosys",
    enabled: true,
    trusted: true,
    logo: "/logos/infosys.png",
    country: "India",
    defaultLocation: "India",
  },

  // Add additional companies below as we integrate them.
  // Supported providers:
  // greenhouse
  // lever
  // ashby
  // workday
  // smartrecruiters
  // successfactors
  // oracle
  // custom
];

export function getEnabledTrustedCompanies(): TrustedCompany[] {
  return trustedCompanies.filter(
    (company) => company.enabled && company.trusted
  );
}