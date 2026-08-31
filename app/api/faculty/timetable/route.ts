import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user session from request cookie or cookies()
    let sessionToken = request.cookies.get("session")?.value;
    if (!sessionToken) {
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get("session")?.value;
      } catch {
        // Fallback for direct test invocation
      }
    }

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
    }

    const payload = await verifyToken(sessionToken);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    // 2. Authorize role: Must be FACULTY
    if (payload.role !== "FACULTY") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to faculty members" },
        { status: 403 }
      );
    }

    // 3. Resolve Faculty identity from User ID
    const faculty = await prisma.faculty.findUnique({
      where: { userId: payload.id },
      include: {
        department: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!faculty) {
      return NextResponse.json(
        { error: "Faculty profile not found for the authenticated user" },
        { status: 404 }
      );
    }

    // 4. Extract query filters (Academic Year, Day, Semester, Section, Subject)
    const { searchParams } = new URL(request.url);
    const filterAcademicYear = searchParams.get("academicYear")?.trim();
    const filterDay = searchParams.get("dayOfWeek")?.trim();
    const filterSemester = searchParams.get("semester")?.trim();
    const filterSectionId = searchParams.get("sectionId")?.trim();
    const filterSubjectId = searchParams.get("subjectId")?.trim();

    // 5. Query ONLY PUBLISHED entries belonging strictly to this faculty member
    const whereClause: any = {
      facultyId: faculty.id,
      status: "PUBLISHED",
    };

    if (filterAcademicYear) {
      whereClause.academicYear = filterAcademicYear;
    }

    if (filterDay) {
      const dayNum = parseInt(filterDay, 10);
      if (!isNaN(dayNum)) {
        whereClause.timeSlot = { ...(whereClause.timeSlot || {}), dayOfWeek: dayNum };
      }
    }

    if (filterSemester) {
      const semNum = parseInt(filterSemester, 10);
      if (!isNaN(semNum)) {
        whereClause.subject = { ...(whereClause.subject || {}), semester: semNum };
      }
    }

    if (filterSectionId) {
      whereClause.sectionId = filterSectionId;
    }

    if (filterSubjectId) {
      whereClause.subjectId = filterSubjectId;
    }

    const entries = await prisma.timetableEntry.findMany({
      where: whereClause,
      include: {
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            semester: true,
          },
        },
        room: {
          select: {
            id: true,
            roomNumber: true,
            building: true,
            type: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
          },
        },
        section: {
          select: {
            id: true,
            name: true,
            semester: true,
            department: {
              select: { name: true, code: true },
            },
          },
        },
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } },
      ],
    });

    const formattedEntries = entries.map((e) => ({
      id: e.id,
      subject: {
        id: e.subject.id,
        code: e.subject.code,
        name: e.subject.name,
        credits: e.subject.credits,
        semester: e.subject.semester,
      },
      faculty: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: `${faculty.user.firstName} ${faculty.user.lastName}`,
      },
      room: {
        id: e.room.id,
        roomNumber: e.room.roomNumber,
        building: e.room.building,
        type: e.room.type,
      },
      timeSlot: {
        id: e.timeSlot.id,
        dayOfWeek: e.timeSlot.dayOfWeek,
        startTime: e.timeSlot.startTime,
        endTime: e.timeSlot.endTime,
      },
      section: e.section
        ? {
            id: e.section.id,
            name: e.section.name,
            semester: e.section.semester,
            department: e.section.department.name,
          }
        : null,
      status: e.status,
      academicYear: e.academicYear,
    }));

    return NextResponse.json({
      faculty: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: `${faculty.user.firstName} ${faculty.user.lastName}`,
        department: faculty.department.name,
        departmentCode: faculty.department.code,
      },
      entries: formattedEntries,
    });
  } catch (error) {
    console.error("GET /api/faculty/timetable ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch faculty timetable" },
      { status: 500 }
    );
  }
}
