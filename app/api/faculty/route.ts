import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ============================================================
// GET — FETCH ALL FACULTY
// ============================================================

export async function GET() {
  try {
    const faculty = await prisma.faculty.findMany({
      orderBy: {
        createdAt: "desc",
      },

      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },

        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        subjects: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            semester: true,
          },
        },
      },
    });

    const formattedFaculty = faculty.map((member) => ({
      id: member.id,

      employeeId: member.employeeId,

      designation: member.designation,

      firstName: member.user.firstName,

      lastName: member.user.lastName,

      name: `${member.user.firstName} ${member.user.lastName}`,

      email: member.user.email,

      phone: member.user.phone,

      isActive: member.user.isActive,

      department: member.department.name,

      departmentCode: member.department.code,

      departmentId: member.department.id,

      subjects: member.subjects,

      subjectCount: member.subjects.length,

      createdAt: member.createdAt,
    }));

    return NextResponse.json(formattedFaculty);
  } catch (error) {
    console.error("GET /api/faculty ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch faculty",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST — CREATE FACULTY
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --------------------------------------------------------
    // READ INPUT
    // --------------------------------------------------------

    const firstName = String(body.firstName ?? "").trim();

    const lastName = String(body.lastName ?? "").trim();

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();

    const password = String(body.password ?? "");

    const employeeId = String(
      body.employeeId ?? ""
    )
      .trim()
      .toUpperCase();

    const designation =
      body.designation !== undefined &&
      body.designation !== null
        ? String(body.designation).trim()
        : null;

    const phone =
      body.phone !== undefined &&
      body.phone !== null &&
      String(body.phone).trim() !== ""
        ? String(body.phone).trim()
        : null;

    const departmentId = String(
      body.departmentId ?? ""
    ).trim();

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !employeeId ||
      !departmentId
    ) {
      return NextResponse.json(
        {
          error:
            "First name, last name, email, password, employee ID and department are required",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Password must contain at least 8 characters",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // VALIDATE EMAIL
    // --------------------------------------------------------

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          error: "Please enter a valid email address",
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
    // CHECK EMAIL
    // --------------------------------------------------------

    const existingUser =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    if (existingUser) {
      return NextResponse.json(
        {
          error:
            "A user with this email already exists",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // CHECK EMPLOYEE ID
    // --------------------------------------------------------

    const existingFaculty =
      await prisma.faculty.findUnique({
        where: {
          employeeId,
        },
      });

    if (existingFaculty) {
      return NextResponse.json(
        {
          error:
            "A faculty member with this employee ID already exists",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------------

    const passwordHash =
      await bcrypt.hash(password, 12);

    // --------------------------------------------------------
    // CREATE USER + FACULTY
    // --------------------------------------------------------

    const faculty =
      await prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.create({
              data: {
                email,

                passwordHash,

                role: "FACULTY",

                firstName,

                lastName,

                phone,

                isActive: true,
              },
            });

          const faculty =
            await tx.faculty.create({
              data: {
                employeeId,

                designation,

                departmentId,

                userId: user.id,
              },

              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    role: true,
                    isActive: true,
                  },
                },

                department: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            });

          return faculty;
        }
      );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return NextResponse.json(
      {
        id: faculty.id,

        employeeId: faculty.employeeId,

        designation: faculty.designation,

        firstName: faculty.user.firstName,

        lastName: faculty.user.lastName,

        name: `${faculty.user.firstName} ${faculty.user.lastName}`,

        email: faculty.user.email,

        phone: faculty.user.phone,

        department: faculty.department.name,

        departmentCode:
          faculty.department.code,

        departmentId:
          faculty.department.id,

        isActive:
          faculty.user.isActive,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("POST /api/faculty ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to create faculty",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// DELETE — DELETE FACULTY
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
          error: "Faculty ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // FIND FACULTY
    // --------------------------------------------------------

    const faculty =
      await prisma.faculty.findUnique({
        where: {
          id,
        },

        include: {
          user: true,

          subjects: true,

          timetable: true,
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

    // --------------------------------------------------------
    // DON'T DELETE IF USED BY SUBJECTS
    // --------------------------------------------------------

    if (faculty.subjects.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this faculty member because subjects are assigned to them",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // DON'T DELETE IF USED BY TIMETABLE
    // --------------------------------------------------------

    if (faculty.timetable.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this faculty member because timetable entries are using them",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // DELETE FACULTY
    // --------------------------------------------------------

    await prisma.$transaction(
      async (tx) => {
        await tx.faculty.delete({
          where: {
            id,
          },
        });

        await tx.user.delete({
          where: {
            id: faculty.userId,
          },
        });
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Faculty deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/faculty ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete faculty",
      },
      {
        status: 500,
      }
    );
  }
}