export type InternalBirthday = string;

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function isValidMonthDay(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

function toInternalFullDate(
  year: number,
  month: number,
  day: number,
): InternalBirthday | undefined {
  if (year < 1000 || year > 9999) return undefined;
  if (!isValidMonthDay(month, day)) return undefined;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function toInternalPartialDate(
  month: number,
  day: number,
): InternalBirthday | undefined {
  if (!isValidMonthDay(month, day)) return undefined;
  return `--${pad2(month)}-${pad2(day)}`;
}

export function normalizeBirthdayToInternal(
  value: string | undefined,
): InternalBirthday | undefined {
  const raw = clean(value);
  if (!raw) return undefined;

  const compact = raw.replace(/\s+/g, '');

  const iso = compact.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso)
    return toInternalFullDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const vcardFull = compact.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (vcardFull)
    return toInternalFullDate(
      Number(vcardFull[1]),
      Number(vcardFull[2]),
      Number(vcardFull[3]),
    );

  const partialDashed = compact.match(/^--(\d{2})-(\d{2})$/);
  if (partialDashed)
    return toInternalPartialDate(
      Number(partialDashed[1]),
      Number(partialDashed[2]),
    );

  const partialCompact = compact.match(/^--(\d{2})(\d{2})$/);
  if (partialCompact)
    return toInternalPartialDate(
      Number(partialCompact[1]),
      Number(partialCompact[2]),
    );

  const dmy = compact.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy)
    return toInternalFullDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  const dm = compact.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (dm) {
    const day = Number(dm[1]);
    const month = Number(dm[2]);
    return toInternalPartialDate(month, day);
  }

  return undefined;
}

export function formatBirthdayForDisplayBr(
  value: InternalBirthday | undefined,
): string {
  const internal = normalizeBirthdayToInternal(value);
  if (!internal) return '';

  const full = internal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (full) return `${full[3]}/${full[2]}/${full[1]}`;

  const partial = internal.match(/^--(\d{2})-(\d{2})$/);
  if (partial) return `${partial[2]}/${partial[1]}`;

  return '';
}

export function formatBirthdayForDateInput(
  value: InternalBirthday | undefined,
): string {
  const internal = normalizeBirthdayToInternal(value);
  if (!internal) return '';
  if (internal.startsWith('--')) return '';
  return internal;
}

export function formatBirthdayForGoogleCsv(
  value: InternalBirthday | undefined,
): string {
  const internal = normalizeBirthdayToInternal(value);
  if (!internal) return '';
  return internal;
}

export function formatBirthdayForVcard(
  value: InternalBirthday | undefined,
): string {
  const internal = normalizeBirthdayToInternal(value);
  if (!internal) return '';

  if (internal.startsWith('--')) {
    const partial = internal.match(/^--(\d{2})-(\d{2})$/);
    if (!partial) return '';
    return `--${partial[1]}${partial[2]}`;
  }

  const full = internal.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!full) return '';
  return `${full[1]}${full[2]}${full[3]}`;
}

export function maskBirthdayInputBr(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
