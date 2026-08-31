import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      include: {
        user: true,
        department: true,
        section: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedStudents = students.map(
      (student) => ({
        id: student.id,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        rollNumber: student.rollNumber,
        department: student.department.name,
        departmentId: student.departmentId,
        semester: student.semester,
        section: student.section?.name ?? "Not assigned",
        sectionId: student.sectionId,
      })
    );

    return NextResponse.json(formattedStudents);
  } catch (error) {
    console.error("GET Students Error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch students",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const rollNumber =
      body.rollNumber?.trim().toUpperCase();
    const departmentId =
      body.departmentId?.trim();
    const semester = Number(body.semester);
    const sectionId =
      body.sectionId?.trim() || null;

    // Validate required fields
    if (
      !name ||
      !email ||
      !rollNumber ||
      !departmentId ||
      !semester
    ) {
      return NextResponse.json(
        {
          error:
            "Name, email, roll number, department and semester are required",
        },
        {
          status: 400,
        }
      );
    }

    if (semester < 1 || semester > 8) {
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

    // Check email
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

    // Check roll number
    const existingStudent =
      await prisma.student.findUnique({
        where: {
          rollNumber,
        },
      });

    if (existingStudent) {
      return NextResponse.json(
        {
          error:
            "A student with this roll number already exists",
        },
        {
          status: 409,
        }
      );
    }

    // Check department
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

    // Check section if supplied
    if (sectionId) {
      const section =
        await prisma.section.findUnique({
          where: {
            id: sectionId,
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

      if (section.departmentId !== departmentId) {
        return NextResponse.json(
          {
            error:
              "Section does not belong to the selected department",
          },
          {
            status: 400,
          }
        );
      }

      // Check section if supplied
if (sectionId) {
  const section = await prisma.section.findUnique({
    where: {
      id: sectionId,
    },
    include: {
      students: true,
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

  if (section.departmentId !== departmentId) {
    return NextResponse.json(
      {
        error:
          "Section does not belong to the selected department",
      },
      {
        status: 400,
      }
    );
  }

  if (section.semester !== semester) {
    return NextResponse.json(
      {
        error:
          "Section does not belong to the selected semester",
      },
      {
        status: 400,
      }
    );
  }

  // Check section capacity
  if (
    section.capacity !== null &&
    section.students.length >= section.capacity
  ) {
    return NextResponse.json(
      {
        error:
          "This section has reached its maximum capacity",
      },
      {
        status: 409,
      }
    );
  }
}
    }

    // Split name
    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "Student";

    // Generate and hash a temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Create User + Student together
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role: "STUDENT",

        student: {
          create: {
            rollNumber,
            departmentId,
            sectionId,
            semester,
          },
        },
      },

      include: {
        student: {
          include: {
            department: true,
            section: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: user.student?.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        rollNumber: user.student?.rollNumber,
        department: user.student?.department.name,
        departmentId: user.student?.departmentId,
        semester: user.student?.semester,
        section: user.student?.section?.name ?? "Not assigned",
        sectionId: user.student?.sectionId,
        temporaryPassword, // Return so admin can copy it
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST Students Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to create student",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const id = body.id;

    if (!id) {
      return NextResponse.json(
        {
          error: "Student ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const student =
      await prisma.student.findUnique({
        where: {
          id,
        },
      });

    if (!student) {
      return NextResponse.json(
        {
          error: "Student not found",
        },
        {
          status: 404,
        }
      );
    }

    // Student is linked to User.
    // User deletion cascades to Student.
    await prisma.user.delete({
      where: {
        id: student.userId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE Student Error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to delete student",
      },
      {
        status: 500,
      }
    );
  }
}