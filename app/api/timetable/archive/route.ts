import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sectionId, academicYear } = body;

    // 1. Validate request body
    if (!sectionId || typeof sectionId !== "string" || !sectionId.trim()) {
      return NextResponse.json(
        { error: "sectionId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!academicYear || typeof academicYear !== "string" || !academicYear.trim()) {
      return NextResponse.json(
        { error: "academicYear is required and must be a string" },
        { status: 400 }
      );
    }

    const trimmedSectionId = sectionId.trim();
    const trimmedAcademicYear = academicYear.trim();

    // 2. Verify section exists
    const section = await prisma.section.findUnique({
      where: { id: trimmedSectionId }
    });

    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    // 3. Find all timetable entries for sectionId + academicYear
    const entries = await prisma.timetableEntry.findMany({
      where: {
        sectionId: trimmedSectionId,
        academicYear: trimmedAcademicYear
      }
    });

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No timetable entries found for this section and academic year" },
        { status: 404 }
      );
    }

    // 4. ALL matching entries must currently be PUBLISHED
    const hasDraft = entries.some(e => e.status === "DRAFT");
    const hasArchived = entries.some(e => e.status === "ARCHIVED");

    if (hasArchived) {
      return NextResponse.json(
        { error: "Timetable is already archived for this section and academic year" },
        { status: 409 }
      );
    }

    if (hasDraft) {
      return NextResponse.json(
        { error: "Cannot archive a draft timetable. Only PUBLISHED timetables can be archived." },
        { status: 409 }
      );
    }

    const nonPublishedEntries = entries.filter(e => e.status !== "PUBLISHED");
    if (nonPublishedEntries.length > 0) {
      return NextResponse.json(
        { error: "Only PUBLISHED timetables can be archived" },
        { status: 409 }
      );
    }

    // 5. Use Prisma transaction to atomically update to ARCHIVED
    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.timetableEntry.updateMany({
        where: {
          sectionId: trimmedSectionId,
          academicYear: trimmedAcademicYear,
          status: "PUBLISHED"
        },
        data: {
          status: "ARCHIVED"
        }
      });
      return updateResult;
    });

    return NextResponse.json({
      success: true,
      message: "Timetable archived successfully",
      sectionId: trimmedSectionId,
      sectionName: section.name,
      academicYear: trimmedAcademicYear,
      archivedCount: result.count
    }, { status: 200 });

  } catch (error) {
    console.error("POST /api/timetable/archive ERROR:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while archiving the timetable" },
      { status: 500 }
    );
  }
}
