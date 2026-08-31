import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Valid enum values mirrored from schema
const VALID_ROOM_TYPES = [
  "CLASSROOM",
  "COMPUTER_LAB",
  "LABORATORY",
  "SEMINAR_HALL",
  "AUDITORIUM",
] as const;

const VALID_ROOM_STATUSES = [
  "AVAILABLE",
  "MAINTENANCE",
  "UNAVAILABLE",
] as const;

type RoomType = (typeof VALID_ROOM_TYPES)[number];
type RoomStatus = (typeof VALID_ROOM_STATUSES)[number];

// ============================================================
// GET — FETCH ALL ROOMS (optional filters)
// ============================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const departmentId = searchParams.get("departmentId");

    const where: {
      type?: RoomType;
      status?: RoomStatus;
      departmentId?: string;
    } = {};

    if (typeParam && VALID_ROOM_TYPES.includes(typeParam as RoomType)) {
      where.type = typeParam as RoomType;
    }

    if (
      statusParam &&
      VALID_ROOM_STATUSES.includes(statusParam as RoomStatus)
    ) {
      where.status = statusParam as RoomStatus;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const rooms = await prisma.room.findMany({
      where,
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ building: "asc" }, { roomNumber: "asc" }],
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("GET /api/rooms ERROR:", error);

    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

// ============================================================
// POST — CREATE ROOM
// ============================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const roomNumber = String(body.roomNumber ?? "").trim();
    const building = String(body.building ?? "").trim();
    const type = String(body.type ?? "").trim().toUpperCase();
    const capacity = Number(body.capacity);
    const status = String(body.status ?? "AVAILABLE").trim().toUpperCase();
    const departmentId = body.departmentId
      ? String(body.departmentId).trim()
      : null;

    // ── Required field validation ──────────────────────────

    if (!roomNumber) {
      return NextResponse.json(
        { error: "Room number is required" },
        { status: 400 }
      );
    }

    if (!building) {
      return NextResponse.json(
        { error: "Building name is required" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Room type is required" },
        { status: 400 }
      );
    }

    // ── Validate enum ──────────────────────────────────────

    if (!VALID_ROOM_TYPES.includes(type as RoomType)) {
      return NextResponse.json(
        {
          error: `Invalid room type. Must be one of: ${VALID_ROOM_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!VALID_ROOM_STATUSES.includes(status as RoomStatus)) {
      return NextResponse.json(
        {
          error: `Invalid room status. Must be one of: ${VALID_ROOM_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ── Validate capacity ──────────────────────────────────

    if (!capacity || !Number.isInteger(capacity) || capacity <= 0) {
      return NextResponse.json(
        { error: "Capacity must be a positive whole number" },
        { status: 400 }
      );
    }

    // ── Validate department (if supplied) ──────────────────

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        return NextResponse.json(
          { error: "Department not found" },
          { status: 404 }
        );
      }
    }

    // ── Check compound unique [roomNumber, building] ───────

    const existingRoom = await prisma.room.findFirst({
      where: {
        roomNumber,
        building,
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        {
          error: `Room "${roomNumber}" already exists in "${building}"`,
        },
        { status: 409 }
      );
    }

    // ── Create room ────────────────────────────────────────

    const room = await prisma.room.create({
      data: {
        roomNumber,
        building,
        type: type as RoomType,
        capacity,
        departmentId,
        status: status as RoomStatus,
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

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("POST /api/rooms ERROR:", error);

    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — DELETE ROOM
// ============================================================

export async function DELETE(request: Request) {
  try {
    const body = await request.json();

    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // ── Find room with timetable entries ───────────────────

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        timetable: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // ── Guard: block if used in timetable ──────────────────

    if (room.timetable.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this room because it is being used in timetable entries",
        },
        { status: 409 }
      );
    }

    // ── Delete ─────────────────────────────────────────────

    await prisma.room.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/rooms ERROR:", error);

    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
