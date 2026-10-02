import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasTimeOverlap } from "@/lib/timeUtils";

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

    const isValidDay = (day: any) => typeof day === "number" && Number.isInteger(day) && day >= 1 && day <= 6;
    if (!isValidDay(sourceDay) || !targetDays.every(isValidDay)) {
      return NextResponse.json(
        { error: "Day of week must be between 1 and 6" },
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

    // Validate target days
    const newSlots = [];
    let skippedDuplicates = 0;
    let skippedOverlaps = 0;
    const details = [];

    // Fetch existing slots for all target days beforehand
    const allTargetSlots = await prisma.timeSlot.findMany({
      where: { dayOfWeek: { in: targetDays.map(Number) } },
    });

    for (const day of targetDays) {
      if (day === sourceDay) continue;
      
      const targetDayNum = Number(day);
      const existingOnDay = allTargetSlots.filter(s => s.dayOfWeek === targetDayNum);
      const newlyAddedToDay: typeof sourceSlots = []; // To check intra-day overlap

      for (const slot of sourceSlots) {
        let isConflict = false;

        // Check against existing database slots and newly proposed ones
        const combinedSlots = [...existingOnDay, ...newlyAddedToDay];
        for (const existing of combinedSlots) {
          if (hasTimeOverlap(slot.startTime, slot.endTime, existing.startTime, existing.endTime)) {
            const isDuplicate = slot.startTime === existing.startTime && slot.endTime === existing.endTime;
            if (isDuplicate) skippedDuplicates++;
            else skippedOverlaps++;
            
            details.push({
              targetDay: targetDayNum,
              startTime: slot.startTime,
              endTime: slot.endTime,
              reason: isDuplicate ? "Duplicate slot" : `Overlaps with ${existing.startTime}-${existing.endTime}`,
            });
            isConflict = true;
            break;
          }
        }

        if (!isConflict) {
          newSlots.push({
            dayOfWeek: targetDayNum,
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
          newlyAddedToDay.push(slot); // track for this iteration
        }
      }
    }

    if (newSlots.length === 0) {
      return NextResponse.json(
        { 
          message: "No new slots to insert.",
          insertedCount: 0,
          skippedCount: skippedDuplicates + skippedOverlaps,
          skippedDuplicates,
          skippedOverlaps,
          details,
        },
        { status: 200 }
      );
    }

    // Bulk insert safe non-overlapping ones
    const result = await prisma.timeSlot.createMany({
      data: newSlots,
      skipDuplicates: true, // as an extra safeguard
    });

    return NextResponse.json(
      { 
        message: "Successfully copied time slots.", 
        insertedCount: result.count,
        skippedCount: skippedDuplicates + skippedOverlaps,
        skippedDuplicates,
        skippedOverlaps,
        details,
      },
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
