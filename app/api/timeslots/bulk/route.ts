import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sourceDay, targetDays } = body;

    if (sourceDay === undefined || !targetDays || !Array.isArray(targetDays)) {
      return NextResponse.json(
        { error: "Invalid payload. Required: sourceDay (number), targetDays (number[])" },
        { status: 400 }
      );
    }

    // Fetch the time slots for the source day
    const sourceSlots = await prisma.timeSlot.findMany({
      where: { dayOfWeek: Number(sourceDay) },
    });

    if (sourceSlots.length === 0) {
      return NextResponse.json(
        { error: "Source day has no time slots to copy." },
        { status: 400 }
      );
    }

    // Build the bulk insert data
    const newSlots = [];
    for (const day of targetDays) {
      if (day === sourceDay) continue;
      
      for (const slot of sourceSlots) {
        newSlots.push({
          dayOfWeek: Number(day),
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }
    }

    if (newSlots.length === 0) {
      return NextResponse.json(
        { message: "No new slots to insert (target days identical to source or empty)." },
        { status: 200 }
      );
    }

    // Bulk insert, ignoring unique constraint conflicts
    const result = await prisma.timeSlot.createMany({
      data: newSlots,
      skipDuplicates: true,
    });

    return NextResponse.json(
      { message: "Successfully copied time slots.", insertedCount: result.count },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Bulk time slots copy error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
