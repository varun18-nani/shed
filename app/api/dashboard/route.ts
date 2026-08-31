import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const [
      facultyCount,
      studentCount,
      departmentCount,
      roomCount,
      subjectCount,
      timetableCount,
    ] = await Promise.all([
      prisma.faculty.count(),
      prisma.student.count(),
      prisma.department.count(),
      prisma.room.count(),
      prisma.subject.count(),
      prisma.timetableEntry.count(),
    ]);

    return NextResponse.json({
      faculty: facultyCount,
      students: studentCount,
      departments: departmentCount,
      rooms: roomCount,
      subjects: subjectCount,
      timetableEntries: timetableCount,
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