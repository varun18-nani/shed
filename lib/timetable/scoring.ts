/**
 * SchedAI — Timetable Quality Scoring Engine
 *
 * Computes a deterministic, rule-based quality score (0–100) for a set of
 * generated timetable entries. This is NOT machine learning.
 *
 * Hard constraints are always respected by the generator; this module only
 * evaluates soft-constraint quality metrics.
 */

export interface ScoringEntry {
  subjectId: string;
  subjectName?: string;
  facultyId: string;
  roomId: string;
  timeSlotId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomCapacity?: number;
  sectionCapacity?: number;
}

export interface QualityScoreBreakdown {
  dayDistribution: number;
  workloadBalance: number;
  gapPenalty: number;
  roomUtilization: number;
  consecutivePenalty: number;
}

export interface QualityScoreResult {
  qualityScore: number;
  breakdown: QualityScoreBreakdown;
  recommendations: string[];
}

/**
 * Calculate a quality score (0–100) for a proposed timetable.
 */
export function scoreTimetable(entries: ScoringEntry[]): QualityScoreResult {
  if (entries.length === 0) {
    return {
      qualityScore: 0,
      breakdown: {
        dayDistribution: 0,
        workloadBalance: 0,
        gapPenalty: 0,
        roomUtilization: 0,
        consecutivePenalty: 0,
      },
      recommendations: ["No entries to score."],
    };
  }

  // ── 1. Day Distribution Score (0–25 points) ──────────────────────────
  // How evenly are classes spread across days?
  const classesByDay: Record<number, string[]> = {};
  const subjectDayCount: Record<string, Set<number>> = {};

  for (const e of entries) {
    if (!classesByDay[e.dayOfWeek]) classesByDay[e.dayOfWeek] = [];
    classesByDay[e.dayOfWeek].push(e.subjectId);

    if (!subjectDayCount[e.subjectId]) subjectDayCount[e.subjectId] = new Set();
    subjectDayCount[e.subjectId].add(e.dayOfWeek);
  }

  const daysUsed = Object.keys(classesByDay).length;
  const allDays = [1, 2, 3, 4, 5, 6]; // Monday–Saturday
  const totalDaysAvailable = allDays.length;
  const classesPerDay = Object.values(classesByDay).map((arr) => arr.length);
  const avgPerDay = entries.length / Math.max(daysUsed, 1);
  const variance =
    classesPerDay.reduce((sum, c) => sum + Math.pow(c - avgPerDay, 2), 0) /
    Math.max(classesPerDay.length, 1);
  const stdDev = Math.sqrt(variance);

  // Score: more days used and lower variance is better
  const spreadScore = Math.min(25, Math.round((daysUsed / totalDaysAvailable) * 15));
  const varianceScore = Math.max(0, 10 - Math.round(stdDev * 2));
  const dayDistribution = Math.min(25, spreadScore + varianceScore);

  // ── 2. Workload Balance Score (0–25 points) ───────────────────────────
  // How spread is each subject across days? (same subject every day = good)
  const subjectIds = Object.keys(subjectDayCount);
  let spreadSubjects = 0;
  for (const sid of subjectIds) {
    const daysForSubject = subjectDayCount[sid].size;
    // Good: each credit period of a subject on a different day
    if (daysForSubject > 1) spreadSubjects++;
  }
  const spreadRatio = subjectIds.length > 0 ? spreadSubjects / subjectIds.length : 0;
  const workloadBalance = Math.round(spreadRatio * 25);

  // ── 3. Gap Penalty Score (0–20 points) ───────────────────────────────
  // Penalize if there are large time gaps within a day
  let totalGaps = 0;
  let dayCount = 0;
  for (const [, dayEntries] of Object.entries(classesByDay)) {
    const times = dayEntries
      .map((_, i) => {
        const e = entries.filter((e) => {
          // We need to reconstruct day entries by cross-referencing
          return classesByDay[Number(Object.keys(classesByDay)[0])];
        });
        return 0;
      })
      .filter((t) => t > 0);
    dayCount++;
  }

  // Simplified gap penalty: check startTimes per day
  let gapPoints = 20;
  for (const [day, _] of Object.entries(classesByDay)) {
    const dayEnts = entries.filter((e) => e.dayOfWeek === Number(day));
    const sortedTimes = dayEnts
      .map((e) => parseInt(e.startTime.replace(":", ""), 10))
      .sort((a, b) => a - b);

    for (let i = 1; i < sortedTimes.length; i++) {
      const gap = sortedTimes[i] - sortedTimes[i - 1];
      // A gap > 200 (i.e., >2 hours between classes) is penalized
      if (gap > 200) {
        gapPoints -= 2;
      }
    }
  }
  const gapPenalty = Math.max(0, Math.min(20, gapPoints));

  // ── 4. Room Utilization Score (0–15 points) ───────────────────────────
  // If room capacities are provided, check how well rooms are used
  const entriesWithCapacity = entries.filter(
    (e) => e.roomCapacity !== undefined && e.sectionCapacity !== undefined
  );
  let roomUtilization = 15; // Default full marks if no capacity info
  if (entriesWithCapacity.length > 0) {
    const utilizationRatios = entriesWithCapacity.map((e) => {
      const ratio = (e.sectionCapacity! / e.roomCapacity!) * 100;
      // Ideal: 50–100% utilization
      if (ratio >= 50 && ratio <= 100) return 1;
      if (ratio < 50) return ratio / 50;
      return 0.5;
    });
    const avgUtilization =
      utilizationRatios.reduce((s, r) => s + r, 0) / utilizationRatios.length;
    roomUtilization = Math.round(avgUtilization * 15);
  }

  // ── 5. Consecutive Penalty (0–15 points) ──────────────────────────────
  // Penalize too many consecutive classes by the same faculty on one day
  const facultyDayClasses: Record<string, Record<number, number>> = {};
  for (const e of entries) {
    if (!facultyDayClasses[e.facultyId]) facultyDayClasses[e.facultyId] = {};
    facultyDayClasses[e.facultyId][e.dayOfWeek] =
      (facultyDayClasses[e.facultyId][e.dayOfWeek] || 0) + 1;
  }

  let consecutivePenalty = 15;
  for (const [, dayCounts] of Object.entries(facultyDayClasses)) {
    for (const [, count] of Object.entries(dayCounts)) {
      if (count > 4) consecutivePenalty -= 3; // More than 4 classes/day for one faculty
      else if (count > 3) consecutivePenalty -= 1;
    }
  }
  const consecutivePenaltyScore = Math.max(0, Math.min(15, consecutivePenalty));

  // ── Final Score ────────────────────────────────────────────────────────
  const totalRaw =
    dayDistribution +
    workloadBalance +
    gapPenalty +
    roomUtilization +
    consecutivePenaltyScore;

  const qualityScore = Math.max(0, Math.min(100, Math.round(totalRaw)));

  // ── Recommendations ───────────────────────────────────────────────────
  const recommendations: string[] = [];

  if (dayDistribution < 15) {
    recommendations.push(
      "Classes are concentrated on too few days. Consider using more available days for better distribution."
    );
  }
  if (workloadBalance < 15) {
    recommendations.push(
      "Several subjects are scheduled on only one day. Spreading subjects across multiple days improves study balance."
    );
  }
  if (gapPenalty < 12) {
    recommendations.push(
      "Some days have large time gaps between classes. Grouping classes closer together improves efficiency."
    );
  }
  if (roomUtilization < 10) {
    recommendations.push(
      "Room capacity is significantly underutilized. Assigning smaller rooms where available will improve resource efficiency."
    );
  }
  if (consecutivePenaltyScore < 10) {
    recommendations.push(
      "One or more faculty members have 4+ consecutive classes in a day. Redistributing their schedule will reduce fatigue."
    );
  }

  // Check for any faculty with heavy concentration
  const facultyDayCounts: Record<string, number> = {};
  for (const e of entries) {
    facultyDayCounts[e.facultyId] = (facultyDayCounts[e.facultyId] || 0) + 1;
  }
  const maxFacultyLoad = Math.max(...Object.values(facultyDayCounts));
  if (maxFacultyLoad > entries.length * 0.6) {
    recommendations.push(
      "One faculty member is assigned a disproportionate number of classes. Consider redistributing the teaching load."
    );
  }

  // Limit to top 5 recommendations
  const topRecommendations = recommendations.slice(0, 5);

  return {
    qualityScore,
    breakdown: {
      dayDistribution,
      workloadBalance,
      gapPenalty,
      roomUtilization,
      consecutivePenalty: consecutivePenaltyScore,
    },
    recommendations:
      topRecommendations.length > 0
        ? topRecommendations
        : ["Timetable quality is good. No significant improvements detected."],
  };
}
