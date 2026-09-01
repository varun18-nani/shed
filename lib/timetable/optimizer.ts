import { prisma } from "@/lib/prisma";
import { scoreTimetable, ScoringEntry, QualityScoreResult } from "@/lib/timetable/scoring";

export interface OptimizeInput {
  departmentId: string;
  semester: number;
  sectionId: string;
  academicYear: string;
  candidateCount?: number;
  allowExistingDraft?: boolean;
}

export interface CandidateTimetable {
  id: string;
  candidateIndex: number;
  strategyName: string;
  qualityScore: number;
  breakdown: QualityScoreResult["breakdown"];
  recommendations: string[];
  entriesCount: number;
  entries: any[];
}

export interface OptimizeResponse {
  success: boolean;
  candidateCount?: number;
  bestScore?: number;
  bestCandidateId?: string;
  candidates?: CandidateTimetable[];
  diagnostics?: any;
}

// Pseudo-random deterministic shuffle function using simple LCG seed
function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;
  for (let i = result.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const rnd = currentSeed / 233280;
    const j = Math.floor(rnd * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateCandidates(input: OptimizeInput): Promise<OptimizeResponse> {
  const { departmentId, semester, sectionId, academicYear, candidateCount = 3, allowExistingDraft = false } = input;

  // 1. Fetch relevant data
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) {
    return { success: false, diagnostics: { error: "Section not found" } };
  }

  if (section.departmentId !== departmentId || section.semester !== semester) {
    return { success: false, diagnostics: { error: "Section does not match selected department and semester" } };
  }

  const subjects = await prisma.subject.findMany({ where: { departmentId, semester } });
  if (subjects.length === 0) {
    return { success: false, diagnostics: { error: "No subjects found for this department and semester" } };
  }

  const unschedulable = subjects.filter((s) => !s.facultyId);
  if (unschedulable.length > 0) {
    return {
      success: false,
      diagnostics: {
        error: "Some subjects do not have assigned faculty",
        unschedulableSubjects: unschedulable.map((s) => ({
          subjectCode: s.code,
          subjectName: s.name,
          reason: "No faculty assigned",
        })),
      },
    };
  }

  const timeSlots = await prisma.timeSlot.findMany({
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  if (timeSlots.length === 0) {
    return { success: false, diagnostics: { error: "No time slots defined in the system" } };
  }

  const rooms = await prisma.room.findMany({ where: { status: "AVAILABLE" } });
  if (rooms.length === 0) {
    return { success: false, diagnostics: { error: "No available rooms in the system" } };
  }

  // Check existing timetable entries
  const existingEntries = await prisma.timetableEntry.findMany({
    where: { academicYear },
    include: { timeSlot: true },
  });

  const sectionExisting = existingEntries.filter((e) => e.sectionId === sectionId);
  if (sectionExisting.length > 0) {
    const isAllDraft = sectionExisting.every((e) => e.status === "DRAFT");
    if (!allowExistingDraft || !isAllDraft) {
      const isPublished = sectionExisting.some((e) => e.status === "PUBLISHED");
      const isArchived = sectionExisting.some((e) => e.status === "ARCHIVED");
      return {
        success: false,
        diagnostics: {
          error: isPublished
            ? "A PUBLISHED timetable exists for this section and academic year. Published schedules cannot be regenerated."
            : isArchived
            ? "An ARCHIVED timetable exists for this section and academic year. Archived schedules cannot be regenerated."
            : "A timetable already exists for this section and academic year.",
          status: isPublished ? "PUBLISHED" : isArchived ? "ARCHIVED" : "DRAFT",
        },
      };
    }
  }

  // Base occupied sets excluding this section's own entries if regenerating
  const baseOccupiedFaculty = new Set<string>();
  const baseOccupiedRoom = new Set<string>();
  const baseOccupiedSection = new Set<string>();

  for (const entry of existingEntries) {
    if (entry.sectionId !== sectionId) {
      baseOccupiedFaculty.add(`${entry.facultyId}_${entry.timeSlotId}`);
      baseOccupiedRoom.add(`${entry.roomId}_${entry.timeSlotId}`);
      if (entry.sectionId) {
        baseOccupiedSection.add(`${entry.sectionId}_${entry.timeSlotId}`);
      }
    }
  }

  // Fetch metadata maps for formatting
  const [facultyMap, roomsMap, timeSlotsMap] = await Promise.all([
    prisma.faculty.findMany({
      where: { departmentId },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.room.findMany(),
    prisma.timeSlot.findMany(),
  ]);

  const sMap = new Map(subjects.map((s) => [s.id, s]));
  const fMap = new Map(facultyMap.map((f) => [f.id, f]));
  const rMap = new Map(roomsMap.map((r) => [r.id, r]));
  const tMap = new Map(timeSlotsMap.map((t) => [t.id, t]));

  type Task = {
    subjectId: string;
    facultyId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
  };

  const tasks: Task[] = [];
  for (const subject of subjects) {
    for (let i = 0; i < subject.credits; i++) {
      tasks.push({
        subjectId: subject.id,
        facultyId: subject.facultyId as string,
        subjectCode: subject.code,
        subjectName: subject.name,
        credits: subject.credits,
      });
    }
  }

  const sectionCapacity = section.capacity || 0;
  const targetCount = Math.min(Math.max(Number(candidateCount) || 3, 1), 5);
  const candidates: CandidateTimetable[] = [];

  // Strategies for deterministic candidate variations
  const strategies = [
    { name: "Balanced Distribution", daySpreadWeight: 50, classroomBonus: 10, seed: 101 },
    { name: "Compact Morning Focus", daySpreadWeight: 35, classroomBonus: 20, seed: 202 },
    { name: "Resource Optimized", daySpreadWeight: 60, classroomBonus: 5, seed: 303 },
    { name: "Alternative Faculty Spacing", daySpreadWeight: 45, classroomBonus: 15, seed: 404 },
    { name: "Even Workload Spread", daySpreadWeight: 55, classroomBonus: 10, seed: 505 },
  ];

  for (let c = 0; c < targetCount; c++) {
    const strat = strategies[c % strategies.length];
    const occupiedFaculty = new Set(baseOccupiedFaculty);
    const occupiedRoom = new Set(baseOccupiedRoom);
    const occupiedSection = new Set(baseOccupiedSection);
    const sectionSubjectsPerDay: Record<string, Set<string>> = {};
    const currentAssignments: any[] = [];

    // Vary task ordering deterministically
    const candidateTasks = seededShuffle(tasks, strat.seed + c * 17);

    function solveCandidate(taskIndex: number): boolean {
      if (taskIndex === candidateTasks.length) return true;
      const task = candidateTasks[taskIndex];

      const candidateSlots = seededShuffle(timeSlots, strat.seed + taskIndex * 31);
      const candidatesList = [];

      for (const slot of candidateSlots) {
        if (occupiedFaculty.has(`${task.facultyId}_${slot.id}`)) continue;
        if (occupiedSection.has(`${sectionId}_${slot.id}`)) continue;

        for (const room of rooms) {
          if (occupiedRoom.has(`${room.id}_${slot.id}`)) continue;
          if (sectionCapacity > 0 && room.capacity < sectionCapacity) continue;

          let score = 100;
          const dayKey = `${sectionId}_${slot.dayOfWeek}`;
          const subjectsOnDay = sectionSubjectsPerDay[dayKey] || new Set();
          if (subjectsOnDay.has(task.subjectId)) {
            score -= strat.daySpreadWeight;
          }
          if (room.type === "CLASSROOM") {
            score += strat.classroomBonus;
          }

          candidatesList.push({ slot, room, score });
        }
      }

      candidatesList.sort((a, b) => b.score - a.score);

      for (const cand of candidatesList) {
        const { slot, room } = cand;

        occupiedFaculty.add(`${task.facultyId}_${slot.id}`);
        occupiedSection.add(`${sectionId}_${slot.id}`);
        occupiedRoom.add(`${room.id}_${slot.id}`);

        const dayKey = `${sectionId}_${slot.dayOfWeek}`;
        const isNew = !sectionSubjectsPerDay[dayKey]?.has(task.subjectId);
        if (!sectionSubjectsPerDay[dayKey]) sectionSubjectsPerDay[dayKey] = new Set();
        sectionSubjectsPerDay[dayKey].add(task.subjectId);

        currentAssignments.push({
          subjectId: task.subjectId,
          facultyId: task.facultyId,
          roomId: room.id,
          timeSlotId: slot.id,
          sectionId,
          academicYear,
          status: "DRAFT",
        });

        if (solveCandidate(taskIndex + 1)) return true;

        occupiedFaculty.delete(`${task.facultyId}_${slot.id}`);
        occupiedSection.delete(`${sectionId}_${slot.id}`);
        occupiedRoom.delete(`${room.id}_${slot.id}`);
        if (isNew) sectionSubjectsPerDay[dayKey].delete(task.subjectId);
        currentAssignments.pop();
      }

      return false;
    }

    const ok = solveCandidate(0);
    if (ok && currentAssignments.length === tasks.length) {
      // Score this candidate
      const scoringEntries: ScoringEntry[] = currentAssignments.map((entry) => {
        const slot = tMap.get(entry.timeSlotId);
        const room = rMap.get(entry.roomId);
        const subject = sMap.get(entry.subjectId);
        return {
          subjectId: entry.subjectId,
          subjectName: subject?.name,
          facultyId: entry.facultyId,
          roomId: entry.roomId,
          timeSlotId: entry.timeSlotId,
          dayOfWeek: slot ? slot.dayOfWeek : 1,
          startTime: slot ? slot.startTime : "09:00",
          endTime: slot ? slot.endTime : "10:00",
          roomCapacity: room?.capacity,
          sectionCapacity: section.capacity || undefined,
        };
      });

      const assessment = scoreTimetable(scoringEntries);

      const formattedEntries = currentAssignments.map((entry) => {
        const subject = sMap.get(entry.subjectId);
        const faculty = fMap.get(entry.facultyId);
        const room = rMap.get(entry.roomId);
        const slot = tMap.get(entry.timeSlotId);

        return {
          id: `cand_${c + 1}_${entry.timeSlotId}_${entry.subjectId}`,
          subjectId: entry.subjectId,
          facultyId: entry.facultyId,
          roomId: entry.roomId,
          timeSlotId: entry.timeSlotId,
          sectionId: entry.sectionId,
          academicYear: entry.academicYear,
          status: "DRAFT",
          subject: { code: subject?.code || "", name: subject?.name || "", credits: subject?.credits || 0 },
          faculty: {
            id: entry.facultyId,
            employeeId: faculty?.employeeId || "",
            user: { firstName: faculty?.user.firstName || "", lastName: faculty?.user.lastName || "" },
          },
          room: { id: entry.roomId, roomNumber: room?.roomNumber || "", building: room?.building || "", type: room?.type || "CLASSROOM" },
          timeSlot: { id: entry.timeSlotId, dayOfWeek: slot?.dayOfWeek || 1, startTime: slot?.startTime || "", endTime: slot?.endTime || "" },
        };
      });

      candidates.push({
        id: `cand_${c + 1}_${Date.now()}_${strat.seed}`,
        candidateIndex: c + 1,
        strategyName: strat.name,
        qualityScore: assessment.qualityScore,
        breakdown: assessment.breakdown,
        recommendations: assessment.recommendations,
        entriesCount: formattedEntries.length,
        entries: formattedEntries,
      });
    }
  }

  if (candidates.length === 0) {
    return {
      success: false,
      diagnostics: {
        error: "Unable to generate any valid candidate schedules with the current constraints.",
      },
    };
  }

  // Sort candidates by qualityScore descending
  candidates.sort((a, b) => b.qualityScore - a.qualityScore);

  return {
    success: true,
    candidateCount: candidates.length,
    bestScore: candidates[0].qualityScore,
    bestCandidateId: candidates[0].id,
    candidates,
  };
}
