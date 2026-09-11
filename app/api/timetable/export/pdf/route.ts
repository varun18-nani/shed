import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit";

// ─────────────────────────────────────────────────────────────
// Day-of-week mapping (1 = Monday … 7 = Sunday)
// ─────────────────────────────────────────────────────────────
const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

// ─────────────────────────────────────────────────────────────
// Sanitise a string for use in a Content-Disposition filename
// ─────────────────────────────────────────────────────────────
function sanitiseFilename(raw: string): string {
  return raw
    .replace(/[^\w\s\-_.]/g, "")  // keep only safe characters
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
}

// ─────────────────────────────────────────────────────────────
// Collect PDFKit output into a Buffer
// ─────────────────────────────────────────────────────────────
function collectBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/timetable/export/pdf
// Query params:  sectionId (required)  |  academicYear (required)
// ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    // ── 1. Authenticate ──────────────────────────────────────
    let sessionToken = request.cookies.get("session")?.value;
    if (!sessionToken) {
      try {
        const cookieStore = await cookies();
        sessionToken = cookieStore.get("session")?.value;
      } catch {
        // fallback for direct test invocation
      }
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(sessionToken);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid session" },
        { status: 401 }
      );
    }

    // ── 2. Any authenticated role (ADMIN / FACULTY / STUDENT) may export ──
    if (!["ADMIN", "FACULTY", "STUDENT"].includes(payload.role)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 }
      );
    }

    // ── 3. Parse and validate query parameters ────────────────
    const { searchParams } = new URL(request.url);
    const sectionId   = searchParams.get("sectionId")?.trim()   || "";
    const academicYear = searchParams.get("academicYear")?.trim() || "";

    if (!sectionId || !academicYear) {
      return NextResponse.json(
        { error: "sectionId and academicYear query parameters are required" },
        { status: 400 }
      );
    }

    // ── 4. Resolve section meta ───────────────────────────────
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: { department: true },
    });

    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    // ── 5. Query PUBLISHED entries only ──────────────────────
    const entries = await prisma.timetableEntry.findMany({
      where: {
        sectionId,
        academicYear,
        status: "PUBLISHED",
      },
      include: {
        subject: {
          select: { id: true, code: true, name: true, credits: true, semester: true },
        },
        faculty: {
          select: {
            id: true,
            employeeId: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        room: {
          select: { id: true, roomNumber: true, building: true },
        },
        timeSlot: {
          select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
        },
      },
      orderBy: [
        { timeSlot: { dayOfWeek: "asc" } },
        { timeSlot: { startTime: "asc" } },
      ],
    });

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error:
            "No published timetable entries found for the given section and academic year",
        },
        { status: 404 }
      );
    }

    // ── 6. Build sorted day/timeslot grid ────────────────────
    // Unique time slots, sorted by startTime
    const timeSlotMap = new Map<
      string,
      { startTime: string; endTime: string }
    >();
    entries.forEach((e) => {
      const key = `${e.timeSlot.startTime}-${e.timeSlot.endTime}`;
      if (!timeSlotMap.has(key)) {
        timeSlotMap.set(key, {
          startTime: e.timeSlot.startTime,
          endTime: e.timeSlot.endTime,
        });
      }
    });
    const sortedSlots = Array.from(timeSlotMap.values()).sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    // Unique days present in the data, sorted Monday → Sunday
    const activeDays = Array.from(
      new Set(entries.map((e) => e.timeSlot.dayOfWeek))
    ).sort((a, b) => a - b);

    // entry lookup by day + slot key
    const cellMap = new Map<string, (typeof entries)[number]>();
    entries.forEach((e) => {
      const key = `${e.timeSlot.dayOfWeek}_${e.timeSlot.startTime}_${e.timeSlot.endTime}`;
      cellMap.set(key, e);
    });

    // ── 7. Generate PDF ───────────────────────────────────────
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: `SchedAI Timetable – ${section.name} (${academicYear})`,
        Author: "SchedAI Academic Management System",
        Subject: "Published Class Timetable",
        Creator: "SchedAI PDF Export",
      },
    });

    const bufferPromise = collectBuffer(doc);

    // Palette
    const C_BRAND     = "#0F172A";   // slate-900 header background
    const C_HEADER_TXT = "#FFFFFF";
    const C_ACCENT    = "#06B6D4";   // cyan-500
    const C_ROW_ALT   = "#F8FAFC";   // very light slate
    const C_BORDER    = "#CBD5E1";   // slate-300
    const C_CELL_HDR  = "#0EA5E9";   // sky-500 for day column
    const C_TEXT      = "#0F172A";
    const C_MUTED     = "#64748B";

    const PAGE_W = doc.page.width  - doc.page.margins.left - doc.page.margins.right;

    // ── Institution / Document Header ─────────────────────────
    // Banner bar
    doc.rect(doc.page.margins.left, 40, PAGE_W, 54).fill(C_BRAND);

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(C_HEADER_TXT)
      .text("SchedAI", doc.page.margins.left + 12, 50, { continued: true })
      .font("Helvetica")
      .fontSize(11)
      .fillColor(C_ACCENT)
      .text("  Academic Timetable Management System", { align: "left" });

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#94A3B8")
      .text("OFFICIAL PUBLISHED SCHEDULE — FOR INSTITUTIONAL USE", doc.page.margins.left + 12, 72);

    // Meta block (right side of banner)
    const metaX = doc.page.margins.left + PAGE_W - 260;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C_ACCENT)
      .text("DEPARTMENT", metaX, 48)
      .text("SECTION", metaX + 100, 48)
      .text("SEMESTER", metaX + 170, 48)
      .text("ACADEMIC YEAR", metaX, 68)

      .font("Helvetica")
      .fillColor(C_HEADER_TXT)
      .fontSize(9)
      .text(section.department.code || section.department.name, metaX, 57)
      .text(section.name, metaX + 100, 57)
      .text(`Sem ${section.semester}`, metaX + 170, 57)
      .text(academicYear, metaX, 77);

    let curY = 104; // below banner

    // ── Table ─────────────────────────────────────────────────
    const TIME_COL_W  = 80;
    const DAY_COL_W   = Math.floor((PAGE_W - TIME_COL_W) / activeDays.length);
    const ROW_H       = 54;
    const HEADER_H    = 22;

    // Draw column header row
    // "Time" header cell
    doc
      .rect(doc.page.margins.left, curY, TIME_COL_W, HEADER_H)
      .fill(C_CELL_HDR);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C_HEADER_TXT)
      .text("TIME", doc.page.margins.left + 4, curY + 7, {
        width: TIME_COL_W - 8,
        align: "center",
      });

    activeDays.forEach((day, di) => {
      const x = doc.page.margins.left + TIME_COL_W + di * DAY_COL_W;
      doc.rect(x, curY, DAY_COL_W, HEADER_H).fill(C_CELL_HDR);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(C_HEADER_TXT)
        .text(DAY_NAMES[day] || `Day ${day}`, x + 4, curY + 7, {
          width: DAY_COL_W - 8,
          align: "center",
        });
    });

    curY += HEADER_H;

    // Draw data rows
    sortedSlots.forEach((slot, rowIdx) => {
      // Check if we need a new page
      if (curY + ROW_H > doc.page.height - doc.page.margins.bottom - 24) {
        doc.addPage();
        curY = doc.page.margins.top;

        // Repeat header on new page
        doc
          .rect(doc.page.margins.left, curY, TIME_COL_W, HEADER_H)
          .fill(C_CELL_HDR);
        doc
          .font("Helvetica-Bold")
          .fontSize(8)
          .fillColor(C_HEADER_TXT)
          .text("TIME", doc.page.margins.left + 4, curY + 7, {
            width: TIME_COL_W - 8,
            align: "center",
          });
        activeDays.forEach((day, di) => {
          const x = doc.page.margins.left + TIME_COL_W + di * DAY_COL_W;
          doc.rect(x, curY, DAY_COL_W, HEADER_H).fill(C_CELL_HDR);
          doc
            .font("Helvetica-Bold")
            .fontSize(8)
            .fillColor(C_HEADER_TXT)
            .text(DAY_NAMES[day] || `Day ${day}`, x + 4, curY + 7, {
              width: DAY_COL_W - 8,
              align: "center",
            });
        });
        curY += HEADER_H;
      }

      const rowBg = rowIdx % 2 === 0 ? "#FFFFFF" : C_ROW_ALT;

      // Time column cell
      doc
        .rect(doc.page.margins.left, curY, TIME_COL_W, ROW_H)
        .fill(rowBg)
        .stroke(C_BORDER);
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C_MUTED)
        .text(slot.startTime, doc.page.margins.left + 4, curY + 10, {
          width: TIME_COL_W - 8,
          align: "center",
        });
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(C_MUTED)
        .text("to", doc.page.margins.left + 4, curY + 22, {
          width: TIME_COL_W - 8,
          align: "center",
        });
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C_MUTED)
        .text(slot.endTime, doc.page.margins.left + 4, curY + 33, {
          width: TIME_COL_W - 8,
          align: "center",
        });

      // Day cells
      activeDays.forEach((day, di) => {
        const x  = doc.page.margins.left + TIME_COL_W + di * DAY_COL_W;
        const cellKey = `${day}_${slot.startTime}_${slot.endTime}`;
        const entry = cellMap.get(cellKey);

        doc.rect(x, curY, DAY_COL_W, ROW_H).fill(rowBg).stroke(C_BORDER);

        if (entry) {
          const subjectCode = entry.subject.code   || "—";
          const subjectName = entry.subject.name   || "—";
          const facultyName =
            entry.faculty
              ? `${entry.faculty.user.firstName} ${entry.faculty.user.lastName}`.trim()
              : "—";
          const roomLabel =
            entry.room
              ? `${entry.room.roomNumber} (${entry.room.building})`
              : "—";

          const PAD = 5;
          // Subject code badge strip
          doc
            .rect(x, curY, DAY_COL_W, 13)
            .fill(C_ACCENT);
          doc
            .font("Helvetica-Bold")
            .fontSize(7)
            .fillColor(C_HEADER_TXT)
            .text(subjectCode, x + PAD, curY + 3, {
              width: DAY_COL_W - PAD * 2,
              ellipsis: true,
            });

          // Subject name
          doc
            .font("Helvetica-Bold")
            .fontSize(7)
            .fillColor(C_TEXT)
            .text(subjectName, x + PAD, curY + 16, {
              width: DAY_COL_W - PAD * 2,
              height: 14,
              ellipsis: true,
            });

          // Faculty
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor(C_MUTED)
            .text(`\u{1F464} ${facultyName}`, x + PAD, curY + 31, {
              width: DAY_COL_W - PAD * 2,
              ellipsis: true,
            });

          // Room
          doc
            .font("Helvetica")
            .fontSize(6.5)
            .fillColor(C_MUTED)
            .text(`\u{1F4CD} ${roomLabel}`, x + PAD, curY + 41, {
              width: DAY_COL_W - PAD * 2,
              ellipsis: true,
            });
        } else {
          // Free period
          doc
            .font("Helvetica")
            .fontSize(7)
            .fillColor("#CBD5E1")
            .text("—", x + 4, curY + ROW_H / 2 - 5, {
              width: DAY_COL_W - 8,
              align: "center",
            });
        }
      });

      curY += ROW_H;
    });

    // ── Footer on every page ──────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - doc.page.margins.bottom + 6;
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor(C_MUTED)
        .text(
          `SchedAI — ${section.department.name} | Section ${section.name} | Semester ${section.semester} | ${academicYear}`,
          doc.page.margins.left,
          footerY,
          { width: PAGE_W - 60, align: "left" }
        )
        .text(`Page ${i + 1} of ${totalPages}`, doc.page.margins.left, footerY, {
          width: PAGE_W,
          align: "right",
        });
    }

    doc.end();
    const pdfBuffer = await bufferPromise;

    // ── 8. Build safe Content-Disposition filename ────────────
    const rawFilename = `schedai-timetable-${section.name}-${academicYear}`;
    const safeFilename = sanitiseFilename(rawFilename) + ".pdf";

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/timetable/export/pdf ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF export" },
      { status: 500 }
    );
  }
}
