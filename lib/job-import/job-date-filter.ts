export type JobDateFilterOptions = {
  maxAgeHours?: number;
  allowMissingDate?: boolean;
};

function parseDate(value?: string | null): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

export function isRecentJob(
  sourceCreatedAt?: string | null,
  sourceUpdatedAt?: string | null,
  options: JobDateFilterOptions = {}
): boolean {
  const {
    maxAgeHours = 168,
    allowMissingDate = false,
  } = options;

  const jobDate =
    parseDate(sourceUpdatedAt) ||
    parseDate(sourceCreatedAt);

  if (!jobDate) {
    return allowMissingDate;
  }

  const ageInMilliseconds =
    Date.now() - jobDate.getTime();

  const maximumAgeInMilliseconds =
    maxAgeHours * 60 * 60 * 1000;

  return (
    ageInMilliseconds >= 0 &&
    ageInMilliseconds <= maximumAgeInMilliseconds
  );
}

export function isStillActiveJob(
  lastDate?: string | null
): boolean {
  const closingDate = parseDate(lastDate);

  if (!closingDate) {
    return true;
  }

  return closingDate.getTime() >= Date.now();
}