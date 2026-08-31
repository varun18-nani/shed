import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// GET — FETCH ALL SECTIONS
// ============================================================

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      orderBy: [
        {
          semester: "asc",
        },
        {
          name: "asc",
        },
      ],

      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        _count: {
          select: {
            students: true,
            timetable: true,
          },
        },
      },
    });

    const formattedSections = sections.map((section) => ({
      id: section.id,

      name: section.name,

      semester: section.semester,

      capacity: section.capacity,

      departmentId: section.departmentId,

      department: section.department.name,

      departmentCode: section.department.code,

      studentCount: section._count.students,

      timetableCount: section._count.timetable,

      createdAt: section.createdAt,
    }));

    return NextResponse.json(formattedSections);
  } catch (error) {
    console.error("GET /api/sections ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch sections",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST — CREATE SECTION
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --------------------------------------------------------
    // READ INPUT
    // --------------------------------------------------------

    const name = String(body.name ?? "")
      .trim()
      .toUpperCase();

    const semester = Number(body.semester);

    const departmentId = String(
      body.departmentId ?? ""
    ).trim();

    const capacity =
      body.capacity !== undefined &&
      body.capacity !== null &&
      String(body.capacity).trim() !== ""
        ? Number(body.capacity)
        : null;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!name || !departmentId || !semester) {
      return NextResponse.json(
        {
          error:
            "Section name, semester and department are required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 8
    ) {
      return NextResponse.json(
        {
          error: "Semester must be between 1 and 8",
        },
        {
          status: 400,
        }
      );
    }

    if (
      capacity !== null &&
      (!Number.isInteger(capacity) || capacity <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Capacity must be a positive whole number",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // CHECK DEPARTMENT
    // --------------------------------------------------------

    const department =
      await prisma.department.findUnique({
        where: {
          id: departmentId,
        },
      });

    if (!department) {
      return NextResponse.json(
        {
          error: "Department not found",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // CHECK DUPLICATE SECTION
    // --------------------------------------------------------

    const existingSection =
      await prisma.section.findUnique({
        where: {
          name_semester_departmentId: {
            name,
            semester,
            departmentId,
          },
        },
      });

    if (existingSection) {
      return NextResponse.json(
        {
          error:
            "This section already exists for the selected department and semester",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // CREATE SECTION
    // --------------------------------------------------------

    const section =
      await prisma.section.create({
        data: {
          name,
          semester,
          departmentId,
          capacity,
        },

        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json(
      {
        id: section.id,

        name: section.name,

        semester: section.semester,

        capacity: section.capacity,

        departmentId:
          section.departmentId,

        department:
          section.department.name,

        departmentCode:
          section.department.code,

        studentCount: 0,

        timetableCount: 0,

        createdAt: section.createdAt,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/sections ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create section",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// DELETE — DELETE SECTION
// ============================================================

export async function DELETE(
  request: Request
) {
  try {
    const body = await request.json();

    const id = String(
      body.id ?? ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error: "Section ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // FIND SECTION
    // --------------------------------------------------------

    const section =
      await prisma.section.findUnique({
        where: {
          id,
        },

        include: {
          students: true,
          timetable: true,
        },
      });

    if (!section) {
      return NextResponse.json(
        {
          error: "Section not found",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // DON'T DELETE IF STUDENTS ARE ASSIGNED
    // --------------------------------------------------------

    if (section.students.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this section because students are assigned to it",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // DON'T DELETE IF USED BY TIMETABLE
    // --------------------------------------------------------

    if (section.timetable.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this section because timetable entries are using it",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    await prisma.section.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,

      message:
        "Section deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/sections ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete section",
      },
      {
        status: 500,
      }
    );
  }
}