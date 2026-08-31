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

    // 2. Authorize role: Must be STUDENT
    if (payload.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Forbidden: Access restricted to students" },
        { status: 403 }
      );
    }

    // 3. Resolve Student and Section identity from User ID
    const student = await prisma.student.findUnique({
      where: { userId: payload.id },
      include: {
        department: true,
        section: true,
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found for the authenticated user" },
        { status: 404 }
      );
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
        entries: [],
        message: "No section currently assigned to your student profile",
      });
    }

    // 4. Extract query filters (Academic Year, Day, Subject, Faculty)
    const { searchParams } = new URL(request.url);
    const filterAcademicYear = searchParams.get("academicYear")?.trim();
    const filterDay = searchParams.get("dayOfWeek")?.trim();
    const filterSubjectId = searchParams.get("subjectId")?.trim();
    const filterFacultyId = searchParams.get("facultyId")?.trim();

    // 5. Query ONLY PUBLISHED entries belonging strictly to this student's section
    const whereClause: any = {
      sectionId: student.sectionId,
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

    if (filterSubjectId) {
      whereClause.subjectId = filterSubjectId;
    }

    if (filterFacultyId) {
      whereClause.facultyId = filterFacultyId;
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
        faculty: {
          select: {
            id: true,
            employeeId: true,
            user: {
              select: { firstName: true, lastName: true },
            },
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
        id: e.faculty.id,
        employeeId: e.faculty.employeeId,
        name: `${e.faculty.user.firstName} ${e.faculty.user.lastName}`,
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
          }
        : null,
      status: e.status,
      academicYear: e.academicYear,
    }));

    return NextResponse.json({
      student: {
        id: student.id,
        rollNumber: student.rollNumber,
        name: `${student.user.firstName} ${student.user.lastName}`,
        department: student.department.name,
        departmentCode: student.department.code,
        semester: student.semester,
        section: student.section?.name || null,
      },
      entries: formattedEntries,
    });
  } catch (error) {
    console.error("GET /api/student/timetable ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch student timetable" },
      { status: 500 }
    );
  }
}
