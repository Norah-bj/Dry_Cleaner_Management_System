/**
 * The shop runs on Rwanda time. "Today" and every report day must be the
 * calendar day in Nyamata, whatever time zone the server or database uses.
 * Override with BUSINESS_TIMEZONE if the business ever moves.
 */
export function businessTimezone(): string {
  return process.env.BUSINESS_TIMEZONE || 'Africa/Kigali';
}

/**
 * SQL for a column's local wall-clock time in the business zone.
 * `timestamp without time zone` columns hold the database session's local
 * time, so they are first anchored to that zone; `timestamptz` columns
 * convert directly. `$tz` must be bound to businessTimezone().
 */
export function localTs(column: string, withTimeZone = false): string {
  return withTimeZone
    ? `(${column} AT TIME ZONE $tz)`
    : `((${column} AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE $tz)`;
}

/** Today's date (YYYY-MM-DD) in the business zone. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: businessTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Replace named $tz/$from/$to placeholders with positional ones for pg. */
export function bind(
  sql: string,
  params: Record<string, unknown>,
): [string, unknown[]] {
  const names: string[] = [];
  const text = sql.replace(/\$([a-zA-Z]+)/g, (_m, name: string) => {
    if (!(name in params)) throw new Error(`Missing SQL param ${name}`);
    let i = names.indexOf(name);
    if (i === -1) {
      names.push(name);
      i = names.length - 1;
    }
    return `$${i + 1}`;
  });
  return [text, names.map((n) => params[n])];
}
