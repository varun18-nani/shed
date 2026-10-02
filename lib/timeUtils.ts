/**
 * Converts a 24-hour HH:MM time string to integer minutes.
 * @param time Time string in HH:MM format
 * @returns Integer minutes since midnight, or NaN if invalid
 */
export function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') return NaN;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) return NaN;

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if two time intervals overlap.
 * Adjacency (end1 === start2) is NOT considered an overlap.
 * @param start1 HH:MM start time of interval 1
 * @param end1 HH:MM end time of interval 1
 * @param start2 HH:MM start time of interval 2
 * @param end2 HH:MM end time of interval 2
 * @returns true if they overlap, false otherwise
 */
export function hasTimeOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) {
    return false; // Cannot reliably determine overlap if invalid
  }

  // start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
}

/**
 * Validates that start time is strictly before end time.
 * @param start HH:MM
 * @param end HH:MM
 */
export function isStartTimeBeforeEndTime(start: string, end: string): boolean {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (isNaN(s) || isNaN(e)) return false;
  return s < e;
}
