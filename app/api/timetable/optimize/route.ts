import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCandidates } from "@/lib/timetable/optimizer";
import { generateRequestId, logger } from "@/lib/logger";

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") || generateRequestId();

  try {
    const body = await request.json();
    const { departmentId, semester, sectionId, academicYear, candidateCount, allowExistingDraft } = body;

    // 1. Validate inputs
    if (!departmentId || !semester || !sectionId || !academicYear) {
      return NextResponse.json(
        { error: "departmentId, semester, sectionId, and academicYear are required.", requestId },
        { status: 400 }
      );
    }

    const semesterNum = Number(semester);
    if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 8) {
      return NextResponse.json(
        { error: "semester must be an integer between 1 and 8.", requestId },
        { status: 400 }
      );
    }

    const countNum = candidateCount !== undefined ? Number(candidateCount) : 3;
    if (isNaN(countNum) || countNum < 1 || countNum > 5) {
      return NextResponse.json(
        { error: "candidateCount must be an integer between 1 and 5.", requestId },
        { status: 400 }
      );
    }

    // Verify Department & Section
    const department = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      return NextResponse.json({ error: "Department not found.", requestId }, { status: 404 });
    }

    const section = await prisma.section.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: "Section not found.", requestId }, { status: 404 });
    }

    if (section.departmentId !== departmentId || section.semester !== semesterNum) {
      return NextResponse.json(
        { error: "Section does not match selected department or semester.", requestId },
        { status: 409 }
      );
    }

    logger.info("Generating optimization candidates", {
      route: "/api/timetable/optimize",
      requestId,
      sectionId,
      academicYear,
      candidateCount: countNum,
    });

    // 2. Call Optimizer
    const result = await generateCandidates({
      departmentId,
      semester: semesterNum,
      sectionId,
      academicYear,
      candidateCount: countNum,
      allowExistingDraft: Boolean(allowExistingDraft),
    });

    if (!result.success || !result.candidates) {
      return NextResponse.json(
        {
          success: false,
          error: result.diagnostics?.error || "Unable to optimize timetable candidates.",
          diagnostics: result.diagnostics,
          requestId,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      candidateCount: result.candidateCount,
      bestScore: result.bestScore,
      bestCandidateId: result.bestCandidateId,
      candidates: result.candidates,
      requestId,
    }, { status: 200 });

  } catch (error: any) {
    logger.error("POST /api/timetable/optimize unexpected error", {
      route: "/api/timetable/optimize",
      requestId,
      error: error?.message,
    });

    return NextResponse.json(
      { error: "An unexpected error occurred during optimization.", requestId },
      { status: 500 }
    );
  }
}
