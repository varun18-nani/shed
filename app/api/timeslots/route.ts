import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasTimeOverlap, isStartTimeBeforeEndTime } from "@/lib/timeUtils";

// ============================================================
// GET — FETCH ALL TIME SLOTS
// ============================================================

export async function GET() {
  try {
    const timeSlots = await prisma.timeSlot.findMany({
      orderBy: [
        {
          dayOfWeek: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error("GET /api/timeslots ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch time slots",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// POST — CREATE TIME SLOT
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const dayOfWeek = Number(body.dayOfWeek);

    const startTime = String(
      body.startTime ?? ""
    ).trim();

    const endTime = String(
      body.endTime ?? ""
    ).trim();

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !Number.isInteger(dayOfWeek) ||
      dayOfWeek < 1 ||
      dayOfWeek > 6
    ) {
      return NextResponse.json(
        {
          error:
            "Day of week must be between 1 and 6",
        },
        {
          status: 400,
        }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        {
          error:
            "Start time and end time are required",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // TIME FORMAT
    // HH:MM
    // --------------------------------------------------------

    const timeRegex =
      /^([01]\d|2[0-3]):([0-5]\d)$/;

    if (
      !timeRegex.test(startTime) ||
      !timeRegex.test(endTime)
    ) {
      return NextResponse.json(
        {
          error:
            "Time must be in HH:MM format",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // --------------------------------------------------------
    // START MUST BE BEFORE END
    // --------------------------------------------------------

    if (!isStartTimeBeforeEndTime(startTime, endTime)) {
      return NextResponse.json(
        {
          error:
            "Start time must be strictly before end time",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // CHECK OVERLAP
    // --------------------------------------------------------

    const existingTimeSlots = await prisma.timeSlot.findMany({
      where: { dayOfWeek }
    });

    for (const slot of existingTimeSlots) {
      if (hasTimeOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        const isDuplicate = startTime === slot.startTime && endTime === slot.endTime;
        const msg = isDuplicate 
          ? "This exact time slot already exists on this day."
          : `This time slot overlaps with an existing slot: ${slot.startTime}-${slot.endTime} on this day.`;
        return NextResponse.json(
          { error: msg },
          { status: 409 }
        );
      }
    }

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------

    const timeSlot =
      await prisma.timeSlot.create({
        data: {
          dayOfWeek,
          startTime,
          endTime,
        },
      });

    return NextResponse.json(
      timeSlot,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/timeslots ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create time slot",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// DELETE — DELETE TIME SLOT
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
          error:
            "Time slot ID is required",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------------
    // CHECK TIME SLOT
    // --------------------------------------------------------

    const timeSlot =
      await prisma.timeSlot.findUnique({
        where: {
          id,
        },
        include: {
          timetable: true,
        },
      });

    if (!timeSlot) {
      return NextResponse.json(
        {
          error:
            "Time slot not found",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // DON'T DELETE IF USED
    // --------------------------------------------------------

    if (timeSlot.timetable.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this time slot because timetable entries are using it",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------

    await prisma.timeSlot.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        "Time slot deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/timeslots ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete time slot",
      },
      {
        status: 500,
      }
    );
  }
}