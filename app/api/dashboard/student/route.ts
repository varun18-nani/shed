import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user session
    let sessionToken = request.cookies.get("session")?.value;
    if (!sessionToken) {
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get("session")?.value;
      } catch {}
    }

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    if (payload.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to students" },
        { status: 403 }
      );
    }

    // 2. Resolve Student and Section identity
    const student = await prisma.student.findUnique({
      where: { userId: payload.id },
      include: {
        department: true,
        section: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student profile not found" }, { status: 404 });
    }

    if (!student.sectionId) {
      return NextResponse.json({
        student: {
          id: student.id,
          rollNumber: student.rollNumber,
          name: `${student.user.firstName} ${student.user.lastName}`,
          department: student.department.name,
          semester: student.semester,
          section: null,
        },
        metrics: {
          todayClassesCount: 0,
          weeklyClassesCount: 0,
          totalWeeklyPeriods: 0,
        },
        nextClass: null,
        todaySchedule: [],
      });
    }

    // Determine current day of week and current local time string "HH:MM"
    const now = new Date();
    const todayJsDay = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const currentDayOfWeek = todayJsDay === 0 ? 7 : todayJsDay;
    const currentHours = now.getHours().toString().padStart(2, "0");
    const currentMinutes = now.getMinutes().toString().padStart(2, "0");
    const currentTimeStr = `${currentHours}:${currentMinutes}`;

    // 3. Fetch ONLY PUBLISHED timetable entries for this student's section
    const publishedEntries = await prisma.timetableEntry.findMany({
      where: {
        sectionId: student.sectionId,
        status: "PUBLISHED",
      },
      include: {
        subject: { select: { code: true, name: true, credits: true, semester: true } },
        faculty: {
          select: {
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: { select: { roomNumber: true, building: true } },
        timeSlot: { select: { dayOfWeek: true, startTime: true, endTime: true } },
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } },
      ],
    });

    // 4. Calculate metrics
    const totalWeeklyClasses = publishedEntries.length;

    // Today's classes sorted by start time
    const todayClasses = publishedEntries.filter(
      (e) => e.timeSlot.dayOfWeek === currentDayOfWeek
    );

    // 5. Determine "Next Class"
    // First, look for a class today that starts after currentTimeStr
    let nextEntry = todayClasses.find((e) => e.timeSlot.startTime > currentTimeStr);

    // If no remaining classes today, find the earliest class on the next upcoming day in the week
    if (!nextEntry && publishedEntries.length > 0) {
      // Look for days > currentDayOfWeek
      const upcomingLaterDays = publishedEntries.filter(
        (e) => e.timeSlot.dayOfWeek > currentDayOfWeek
      );
      if (upcomingLaterDays.length > 0) {
        nextEntry = upcomingLaterDays[0];
      } else {
        // Wrap around to the start of the week
        nextEntry = publishedEntries[0];
      }
    }

    const formatNextClass = nextEntry
      ? {
          id: nextEntry.id,
          subjectCode: nextEntry.subject.code,
          subjectName: nextEntry.subject.name,
          facultyName: `${nextEntry.faculty.user.firstName} ${nextEntry.faculty.user.lastName}`,
          roomNumber: nextEntry.room.roomNumber,
          building: nextEntry.room.building,
          dayOfWeek: nextEntry.timeSlot.dayOfWeek,
          startTime: nextEntry.timeSlot.startTime,
          endTime: nextEntry.timeSlot.endTime,
          isToday: nextEntry.timeSlot.dayOfWeek === currentDayOfWeek,
        }
      : null;

    return NextResponse.json({
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        name: `${student.user.firstName} ${student.user.lastName}`,
        department: student.department.name,
        semester: student.semester,
        section: student.section?.name || null,
      },
      metrics: {
        todayClassesCount: todayClasses.length,
        weeklyClassesCount: totalWeeklyClasses,
        totalWeeklyPeriods: totalWeeklyClasses,
      },
      nextClass: formatNextClass,
      todaySchedule: todayClasses.map((e) => ({
        id: e.id,
        startTime: e.timeSlot.startTime,
        endTime: e.timeSlot.endTime,
        subjectCode: e.subject.code,
        subjectName: e.subject.name,
        facultyName: `${e.faculty.user.firstName} ${e.faculty.user.lastName}`,
        roomNumber: e.room.roomNumber,
        building: e.room.building,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/student ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch student dashboard data" },
      { status: 500 }
    );
  }
}
