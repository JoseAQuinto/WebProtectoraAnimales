(function (root) {
  'use strict';
  const monthStarts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

  function leap(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
  function monthDays(year, month) {
    return month === 2 ? (leap(year) ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  }
  function parts(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Expected YYYY-MM-DD');
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > monthDays(year, month)) {
      throw new RangeError('Invalid calendar date');
    }
    return { year, month, day };
  }
  function isValid(value) { try { parts(value); return true; } catch (_) { return false; } }
  function ordinal(value) {
    const date = parts(value);
    const previousYear = date.year - 1;
    return previousYear * 365 + Math.floor(previousYear / 4) - Math.floor(previousYear / 100) +
      Math.floor(previousYear / 400) + monthStarts[date.month - 1] +
      (date.month > 2 && leap(date.year) ? 1 : 0) + date.day - 1;
  }
  function compare(first, second) {
    parts(first); parts(second);
    return first === second ? 0 : (first < second ? -1 : 1);
  }
  // Half-open interval [start, end); negative intervals are caller errors.
  function daysBetween(start, end) {
    const days = ordinal(end) - ordinal(start);
    if (days < 0) throw new RangeError('End date precedes start date');
    return days;
  }
  // Month anniversaries clamp to the last day of a shorter month (including Feb 29).
  function ageMonthsOn(birthDate, referenceDate) {
    const birth = parts(birthDate);
    const reference = parts(referenceDate);
    if (compare(birthDate, referenceDate) > 0) throw new RangeError('Birth date follows reference date');
    let months = (reference.year - birth.year) * 12 + reference.month - birth.month;
    if (reference.day < Math.min(birth.day, monthDays(reference.year, reference.month))) months -= 1;
    return months;
  }
  function ageOn(birthDate, referenceDate) {
    const totalMonths = ageMonthsOn(birthDate, referenceDate);
    return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, totalMonths };
  }
  // Only technical instants use Date/Intl; business-date strings never enter Date.
  function today(timeZone, instant = Date.now()) {
    if (typeof timeZone !== 'string' || !timeZone) throw new TypeError('An organization time zone is required');
    if (typeof instant !== 'number' || !Number.isFinite(instant)) throw new TypeError('Expected an epoch timestamp');
    const values = Object.create(null);
    new Intl.DateTimeFormat('en-US', { timeZone, calendar: 'gregory', numberingSystem: 'latn',
      year: 'numeric', month: '2-digit', day: '2-digit', era: 'short' }).formatToParts(new Date(instant)).forEach(part => {
      if (part.type !== 'literal') values[part.type] = part.value;
    });
    if (values.era !== 'AD') throw new RangeError('Date is outside the supported calendar range');
    const result = values.year.padStart(4, '0') + '-' + values.month + '-' + values.day;
    parts(result);
    return result;
  }

  // Calendar date as the organization chose to read it (stored values stay ISO).
  function display(value, format) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
    const [year, month, day] = [value.slice(0, 4), value.slice(5, 7), value.slice(8, 10)];
    return format === 'day_first' ? day + '/' + month + '/' + year : format === 'month_first' ? month + '/' + day + '/' + year : year + '-' + month + '-' + day;
  }

  root.utils.dates = Object.freeze({ isValid, compare, daysBetween, ageOn, ageMonthsOn, today, display });
}(window.RescueManager));
