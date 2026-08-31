import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("GET departments error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch departments",
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
    const code = body.code?.trim().toUpperCase();

    if (!name || !code) {
      return NextResponse.json(
        {
          error: "Department name and code are required",
        },
        {
          status: 400,
        }
      );
    }

    const existingDepartment = await prisma.department.findFirst({
      where: {
        OR: [
          {
            name,
          },
          {
            code,
          },
        ],
      },
    });

    if (existingDepartment) {
      return NextResponse.json(
        {
          error: "Department name or code already exists",
        },
        {
          status: 409,
        }
      );
    }

    const department = await prisma.department.create({
      data: {
        name,
        code,
      },
    });

    return NextResponse.json(department, {
      status: 201,
    });
  } catch (error) {
    console.error("POST department error:", error);

    return NextResponse.json(
      {
        error: "Failed to create department",
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
          error: "Department ID is required",
        },
        {
          status: 400,
        }
      );
    }

    const department = await prisma.department.findUnique({
      where: {
        id,
      },
      include: {
        faculty: true,
        students: true,
        subjects: true,
        sections: true,
        rooms: true,
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

    if (
      department.faculty.length > 0 ||
      department.students.length > 0 ||
      department.subjects.length > 0 ||
      department.sections.length > 0 ||
      department.rooms.length > 0
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this department because it is being used by other records",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.department.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("DELETE department error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete department",
      },
      {
        status: 500,
      }
    );
  }
}