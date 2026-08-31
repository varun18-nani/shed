import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const [
      departmentCount,
      facultyCount,
      studentCount,
      sectionCount,
      subjectCount,
      roomCount,
      timetableCount,
      draftCount,
      publishedCount,
      archivedCount,
      availableRoomsCount,
      maintenanceRoomsCount,
      unavailableRoomsCount,
      sectionsWithTimetable,
      recentEntries,
    ] = await Promise.all([
      prisma.department.count(),
      prisma.faculty.count(),
      prisma.student.count(),
      prisma.section.count(),
      prisma.subject.count(),
      prisma.room.count(),
      prisma.timetableEntry.count(),
      prisma.timetableEntry.count({ where: { status: "DRAFT" } }),
      prisma.timetableEntry.count({ where: { status: "PUBLISHED" } }),
      prisma.timetableEntry.count({ where: { status: "ARCHIVED" } }),
      prisma.room.count({ where: { status: "AVAILABLE" } }),
      prisma.room.count({ where: { status: "MAINTENANCE" } }),
      prisma.room.count({ where: { status: "UNAVAILABLE" } }),
      prisma.timetableEntry.groupBy({
        by: ["sectionId"],
        where: {
          sectionId: { not: null },
          status: "PUBLISHED",
        },
      }),
      prisma.timetableEntry.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          subject: { select: { code: true, name: true } },
          faculty: { select: { user: { select: { firstName: true, lastName: true } } } },
          room: { select: { roomNumber: true } },
          section: { select: { name: true, semester: true } },
          timeSlot: { select: { dayOfWeek: true, startTime: true, endTime: true } },
        },
      }),
    ]);

    const publishedSectionsCount = sectionsWithTimetable.length;
    const unpublishedSectionsCount = Math.max(0, sectionCount - publishedSectionsCount);

    return NextResponse.json({
      departments: departmentCount,
      faculty: facultyCount,
      students: studentCount,
      sections: sectionCount,
      subjects: subjectCount,
      rooms: roomCount,
      timetableEntries: timetableCount,
      timetableStats: {
        draft: draftCount,
        published: publishedCount,
        archived: archivedCount,
      },
      roomStats: {
        available: availableRoomsCount,
        maintenance: maintenanceRoomsCount,
        unavailable: unavailableRoomsCount,
      },
      sectionStats: {
        total: sectionCount,
        withPublishedTimetable: publishedSectionsCount,
        withoutPublishedTimetable: unpublishedSectionsCount,
      },
      recentActivity: recentEntries.map((e) => ({
        id: e.id,
        subjectCode: e.subject.code,
        subjectName: e.subject.name,
        facultyName: `${e.faculty.user.firstName} ${e.faculty.user.lastName}`,
        roomNumber: e.room.roomNumber,
        sectionName: e.section ? `${e.section.name} (Sem ${e.section.semester})` : "General",
        status: e.status,
        academicYear: e.academicYear,
        updatedAt: e.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch dashboard data",
      },
      {
        status: 500,
      }
    );
  }
}