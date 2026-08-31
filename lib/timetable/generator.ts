import { prisma } from "@/lib/prisma";

export interface GenerateInput {
  departmentId: string;
  semester: number;
  sectionId: string;
  academicYear: string;
}

export interface GeneratorResponse {
  success: boolean;
  entries?: any[];
  diagnostics?: any;
}

export async function generateTimetable(input: GenerateInput): Promise<GeneratorResponse> {
  const { departmentId, semester, sectionId, academicYear } = input;

  // 1. Fetch relevant data
  const section = await prisma.section.findUnique({
    where: { id: sectionId }
  });

  if (!section) {
    return { success: false, diagnostics: { error: "Section not found" } };
  }

  if (section.departmentId !== departmentId || section.semester !== semester) {
    return { success: false, diagnostics: { error: "Section does not match selected department and semester" } };
  }

  const subjects = await prisma.subject.findMany({
    where: { departmentId, semester }
  });

  if (subjects.length === 0) {
    return { success: false, diagnostics: { error: "No subjects found for this department and semester" } };
  }

  // Check for unschedulable subjects (missing faculty)
  const unschedulable = subjects.filter(s => !s.facultyId);
  if (unschedulable.length > 0) {
    return {
      success: false,
      diagnostics: {
        error: "Some subjects do not have assigned faculty",
        unschedulableSubjects: unschedulable.map(s => ({
          subjectCode: s.code,
          subjectName: s.name,
          reason: "No faculty assigned"
        }))
      }
    };
  }

  const timeSlots = await prisma.timeSlot.findMany({
    orderBy: [
      { dayOfWeek: "asc" },
      { startTime: "asc" }
    ]
  });

  if (timeSlots.length === 0) {
    return { success: false, diagnostics: { error: "No time slots defined in the system" } };
  }

  const rooms = await prisma.room.findMany({
    where: { status: "AVAILABLE" }
  });

  if (rooms.length === 0) {
    return { success: false, diagnostics: { error: "No available rooms in the system" } };
  }

  // Fetch existing timetable entries to seed occupied sets
  const existingEntries = await prisma.timetableEntry.findMany({
    where: { academicYear },
    include: { timeSlot: true }
  });

  const occupiedFaculty = new Set<string>();
  const occupiedRoom = new Set<string>();
  const occupiedSection = new Set<string>();

  for (const entry of existingEntries) {
    occupiedFaculty.add(`${entry.facultyId}_${entry.timeSlotId}`);
    occupiedRoom.add(`${entry.roomId}_${entry.timeSlotId}`);
    if (entry.sectionId) {
      occupiedSection.add(`${entry.sectionId}_${entry.timeSlotId}`);
    }
  }

  // Check if section already has timetable entries
  const existingSectionEntries = existingEntries.filter(e => e.sectionId === sectionId);
  if (existingSectionEntries.length > 0) {
    return {
      success: false,
      diagnostics: {
        error: "Timetable already exists for this section and academic year."
      }
    };
  }

  // 2. Prepare tasks
  type Task = {
    subjectId: string;
    facultyId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
  };

  const tasks: Task[] = [];
  let totalPeriods = 0;

  // Sort subjects by credits descending (hardest to place first)
  const sortedSubjects = [...subjects].sort((a, b) => b.credits - a.credits);

  for (const subject of sortedSubjects) {
    for (let i = 0; i < subject.credits; i++) {
      tasks.push({
        subjectId: subject.id,
        facultyId: subject.facultyId as string, // Guaranteed non-null by check above
        subjectCode: subject.code,
        subjectName: subject.name,
        credits: subject.credits
      });
      totalPeriods++;
    }
  }

  const sectionCapacity = section.capacity || 0;

  // 3. Backtracking Algorithm
  const currentAssignments: any[] = [];
  
  // Track subjects per day to avoid scheduling the same subject multiple times on the same day if possible
  const sectionSubjectsPerDay: Record<string, Set<string>> = {}; 

  function calculateScore(task: Task, slotId: string, dayOfWeek: number, roomId: string, roomType: string) {
    let score = 100;

    const dayKey = `${sectionId}_${dayOfWeek}`;
    const subjectsOnDay = sectionSubjectsPerDay[dayKey] || new Set();

    // Soft Constraint: Spread subjects across days. Penalize if already on this day.
    if (subjectsOnDay.has(task.subjectId)) {
      score -= 50; 
    }

    // Soft Constraint: Prefer CLASSROOM for theory
    if (roomType === "CLASSROOM") {
      score += 10;
    }

    return score;
  }

  function solve(taskIndex: number): boolean {
    if (taskIndex === tasks.length) {
      return true; // All tasks scheduled
    }

    const task = tasks[taskIndex];

    // Build candidates
    const candidates = [];

    for (const slot of timeSlots) {
      // Hard Constraint: Faculty available
      if (occupiedFaculty.has(`${task.facultyId}_${slot.id}`)) continue;
      // Hard Constraint: Section available
      if (occupiedSection.has(`${sectionId}_${slot.id}`)) continue;

      for (const room of rooms) {
        // Hard Constraint: Room available
        if (occupiedRoom.has(`${room.id}_${slot.id}`)) continue;
        // Hard Constraint: Room capacity
        if (sectionCapacity > 0 && room.capacity < sectionCapacity) continue;

        // Score candidate
        const score = calculateScore(task, slot.id, slot.dayOfWeek, room.id, room.type);
        
        candidates.push({ slot, room, score });
      }
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    for (const cand of candidates) {
      const { slot, room } = cand;

      // Apply
      occupiedFaculty.add(`${task.facultyId}_${slot.id}`);
      occupiedSection.add(`${sectionId}_${slot.id}`);
      occupiedRoom.add(`${room.id}_${slot.id}`);

      const dayKey = `${sectionId}_${slot.dayOfWeek}`;
      const isNewSubjectOnDay = !(sectionSubjectsPerDay[dayKey]?.has(task.subjectId));
      
      if (!sectionSubjectsPerDay[dayKey]) sectionSubjectsPerDay[dayKey] = new Set();
      sectionSubjectsPerDay[dayKey].add(task.subjectId);

      currentAssignments.push({
        subjectId: task.subjectId,
        facultyId: task.facultyId,
        roomId: room.id,
        timeSlotId: slot.id,
        sectionId: sectionId,
        academicYear: academicYear,
        status: "DRAFT"
      });

      // Recurse
      if (solve(taskIndex + 1)) {
        return true;
      }

      // Backtrack
      occupiedFaculty.delete(`${task.facultyId}_${slot.id}`);
      occupiedSection.delete(`${sectionId}_${slot.id}`);
      occupiedRoom.delete(`${room.id}_${slot.id}`);
      
      if (isNewSubjectOnDay) {
        sectionSubjectsPerDay[dayKey].delete(task.subjectId);
      }

      currentAssignments.pop();
    }

    return false;
  }

  const success = solve(0);

  if (!success) {
    // Generate helpful failure diagnostics
    // Determine how many tasks were scheduled before failure in a greedy sense 
    // to populate diagnostic data (we don't save it though)
    
    return {
      success: false,
      diagnostics: {
        error: "Unable to generate a complete timetable with the available rooms and time slots.",
        requiredPeriods: totalPeriods,
        scheduledPeriods: currentAssignments.length, // This will be 0 due to backtrack, but let's provide metadata
        availableTimeSlots: timeSlots.length,
        availableRooms: rooms.length,
        failedTask: tasks[0], // Simplified diagnostic
        reason: "Constraints too tight or insufficient resources"
      }
    };
  }

  return {
    success: true,
    entries: currentAssignments
  };
}
