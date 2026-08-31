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

    if (payload.role !== "FACULTY") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to faculty members" },
        { status: 403 }
      );
    }

    // 2. Resolve Faculty identity
    const faculty = await prisma.faculty.findUnique({
      where: { userId: payload.id },
      include: {
        department: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!faculty) {
      return NextResponse.json({ error: "Faculty profile not found" }, { status: 404 });
    }

    // Determine current day of week (1 = Monday, ..., 7 = Sunday)
    const todayJsDay = new Date().getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const currentDayOfWeek = todayJsDay === 0 ? 7 : todayJsDay;

    // 3. Fetch ONLY PUBLISHED timetable entries for this faculty
    const publishedEntries = await prisma.timetableEntry.findMany({
      where: {
        facultyId: faculty.id,
        status: "PUBLISHED",
      },
      include: {
        subject: { select: { id: true, code: true, name: true, credits: true, semester: true } },
        room: { select: { roomNumber: true, building: true } },
        timeSlot: { select: { dayOfWeek: true, startTime: true, endTime: true } },
        section: { select: { id: true, name: true, semester: true } },
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } },
      ],
    });

    // 4. Calculate metrics
    const totalWeeklyClasses = publishedEntries.length;

    // Today's classes
    const todayClasses = publishedEntries.filter(
      (e) => e.timeSlot.dayOfWeek === currentDayOfWeek
    );

    // Unique assigned subjects
    const uniqueSubjectIds = new Set(publishedEntries.map((e) => e.subject.id));
    const assignedSubjectsCount = uniqueSubjectIds.size;

    // Unique assigned sections
    const uniqueSectionIds = new Set(
      publishedEntries.filter((e) => e.section).map((e) => e.section!.id)
    );
    const assignedSectionsCount = uniqueSectionIds.size;

    return NextResponse.json({
      faculty: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: `${faculty.user.firstName} ${faculty.user.lastName}`,
        department: faculty.department.name,
      },
      metrics: {
        todayClassesCount: todayClasses.length,
        weeklyClassesCount: totalWeeklyClasses,
        assignedSubjectsCount,
        assignedSectionsCount,
        totalTeachingHours: totalWeeklyClasses, // 1 period = 1 credit/hour
      },
      todaySchedule: todayClasses.map((e) => ({
        id: e.id,
        startTime: e.timeSlot.startTime,
        endTime: e.timeSlot.endTime,
        subjectCode: e.subject.code,
        subjectName: e.subject.name,
        sectionName: e.section ? `${e.section.name} (Sem ${e.section.semester})` : "General",
        roomNumber: e.room.roomNumber,
        building: e.room.building,
        academicYear: e.academicYear,
      })),
      upcomingClasses: publishedEntries.slice(0, 5).map((e) => ({
        id: e.id,
        dayOfWeek: e.timeSlot.dayOfWeek,
        startTime: e.timeSlot.startTime,
        endTime: e.timeSlot.endTime,
        subjectCode: e.subject.code,
        subjectName: e.subject.name,
        sectionName: e.section ? `${e.section.name}` : "General",
        roomNumber: e.room.roomNumber,
      })),
    });
  } catch (error) {
    console.error("GET /api/dashboard/faculty ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculty dashboard data" },
      { status: 500 }
    );
  }
}
