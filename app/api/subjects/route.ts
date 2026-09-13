import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ============================================================
// GET — FETCH ALL SUBJECTS
// ============================================================

export async function GET() {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        faculty: {
          select: {
            id: true,
            employeeId: true,
            designation: true,

            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const formattedSubjects = subjects.map((subject) => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      credits: subject.credits,
      semester: subject.semester,
      departmentId: subject.departmentId,
      department: {
        id: subject.department.id,
        name: subject.department.name,
        code: subject.department.code,
      },
      facultyId: subject.facultyId,
      faculty: subject.faculty
        ? {
            id: subject.faculty.id,
            employeeId: subject.faculty.employeeId,
            designation: subject.faculty.designation,
            user: {
              firstName: subject.faculty.user.firstName,
              lastName: subject.faculty.user.lastName,
            },
          }
        : null,
      createdAt: subject.createdAt,
    }));

    return NextResponse.json(formattedSubjects);
  } catch (error) {
    console.error(
      "GET /api/subjects ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch subjects",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST — CREATE SUBJECT
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --------------------------------------------------------
    // READ INPUT
    // --------------------------------------------------------

    const code = String(
      body.code ?? ""
    )
      .trim()
      .toUpperCase();

    const name = String(
      body.name ?? ""
    ).trim();

    const credits = Number(
      body.credits
    );

    const semester = Number(
      body.semester
    );

    const departmentId = String(
      body.departmentId ?? ""
    ).trim();

    const facultyId =
      body.facultyId
        ? String(body.facultyId).trim()
        : null;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !code ||
      !name ||
      !departmentId ||
      !credits ||
      !semester
    ) {
      return NextResponse.json(
        {
          error:
            "Subject code, name, credits, semester and department are required",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // VALIDATE CREDITS
    // --------------------------------------------------------

    if (
      !Number.isInteger(credits) ||
      credits <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Credits must be a positive whole number",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // VALIDATE SEMESTER
    // --------------------------------------------------------

    if (
      !Number.isInteger(semester) ||
      semester < 1 ||
      semester > 8
    ) {
      return NextResponse.json(
        {
          error:
            "Semester must be between 1 and 8",
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
    // CHECK DUPLICATE SUBJECT CODE
    // --------------------------------------------------------

    const existingSubject =
      await prisma.subject.findUnique({
        where: {
          code,
        },
      });

    if (existingSubject) {
      return NextResponse.json(
        {
          error:
            "A subject with this code already exists",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // CHECK FACULTY
    // --------------------------------------------------------

    if (facultyId) {
      const faculty =
        await prisma.faculty.findUnique({
          where: {
            id: facultyId,
          },
        });

      if (!faculty) {
        return NextResponse.json(
          {
            error: "Faculty not found",
          },
          {
            status: 404,
          }
        );
      }

      // Faculty must belong to selected department
      if (
        faculty.departmentId !==
        departmentId
      ) {
        return NextResponse.json(
          {
            error:
              "Selected faculty does not belong to the selected department",
          },
          {
            status: 400,
          }
        );
      }
    }

    // --------------------------------------------------------
    // CREATE SUBJECT
    // --------------------------------------------------------

    const subject =
      await prisma.subject.create({
        data: {
          code,
          name,
          credits,
          semester,
          departmentId,
          facultyId,
        },

        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },

          faculty: {
            select: {
              id: true,
              employeeId: true,
              designation: true,

              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json(
      {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        credits: subject.credits,
        semester: subject.semester,
        departmentId: subject.departmentId,
        department: {
          id: subject.department.id,
          name: subject.department.name,
          code: subject.department.code,
        },
        facultyId: subject.facultyId,
        faculty: subject.faculty
          ? {
              id: subject.faculty.id,
              employeeId: subject.faculty.employeeId,
              designation: subject.faculty.designation,
              user: {
                firstName: subject.faculty.user.firstName,
                lastName: subject.faculty.user.lastName,
              },
            }
          : null,
        createdAt: subject.createdAt,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/subjects ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create subject",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// DELETE — DELETE SUBJECT
// ============================================================

export async function DELETE(
  request: Request
) {
  try {
    const body =
      await request.json();

    const id = String(
      body.id ?? ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Subject ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // FIND SUBJECT
    // --------------------------------------------------------

    const subject =
      await prisma.subject.findUnique({
        where: {
          id,
        },

        include: {
          timetable: true,
        },
      });

    if (!subject) {
      return NextResponse.json(
        {
          error: "Subject not found",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // DON'T DELETE IF USED IN TIMETABLE
    // --------------------------------------------------------

    if (
      subject.timetable.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this subject because timetable entries are using it",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    await prisma.subject.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Subject deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/subjects ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete subject",
      },
      {
        status: 500,
      }
    );
  }
}