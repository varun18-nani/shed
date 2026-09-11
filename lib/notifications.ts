import { prisma } from "@/lib/prisma";

export type PrismaTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export interface DispatchTimetablePublishedInput {
  sectionId: string;
  academicYear: string;
  tx?: PrismaTransactionClient;
}

export interface RecipientInfo {
  userId: string;
  role: "FACULTY" | "STUDENT";
  name: string;
  email: string;
}

export interface DispatchResult {
  success: boolean;
  sectionId: string;
  sectionName: string;
  academicYear: string;
  recipientCount: number;
  facultyCount: number;
  studentCount: number;
  createdNotificationsCount: number;
}

/**
 * Resolves unique recipient users (assigned faculty + enrolled section students)
 * for a published timetable identified by sectionId and academicYear.
 */
export async function resolveTimetableRecipients(
  sectionId: string,
  academicYear: string,
  client: PrismaTransactionClient | typeof prisma = prisma
): Promise<{ sectionName: string; recipients: RecipientInfo[] }> {
  // 1. Fetch section details with enrolled students and their user accounts
  const section = await client.section.findUnique({
    where: { id: sectionId },
    include: {
      students: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
          },
        },
      },
    },
  });

  if (!section) {
    throw new Error(`Section with id ${sectionId} not found`);
  }

  // 2. Fetch distinct faculty assigned to timetable entries for this section and academicYear
  const entries = await client.timetableEntry.findMany({
    where: {
      sectionId,
      academicYear,
    },
    include: {
      faculty: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, isActive: true },
          },
        },
      },
    },
  });

  const recipientMap = new Map<string, RecipientInfo>();

  // Add assigned faculty recipients
  for (const entry of entries) {
    const facUser = entry.faculty?.user;
    if (facUser && facUser.isActive && !recipientMap.has(facUser.id)) {
      recipientMap.set(facUser.id, {
        userId: facUser.id,
        role: "FACULTY",
        name: `${facUser.firstName} ${facUser.lastName}`.trim(),
        email: facUser.email,
      });
    }
  }

  // Add enrolled student recipients
  for (const student of section.students) {
    const stuUser = student.user;
    if (stuUser && stuUser.isActive && !recipientMap.has(stuUser.id)) {
      recipientMap.set(stuUser.id, {
        userId: stuUser.id,
        role: "STUDENT",
        name: `${stuUser.firstName} ${stuUser.lastName}`.trim(),
        email: stuUser.email,
      });
    }
  }

  return {
    sectionName: section.name,
    recipients: Array.from(recipientMap.values()),
  };
}

/**
 * Creates persistent in-app notifications for all recipients of a published timetable.
 * Compatible with Prisma transactions. Errors propagate to the caller.
 */
export async function dispatchTimetablePublishedNotification(
  input: DispatchTimetablePublishedInput
): Promise<DispatchResult> {
  const { sectionId, academicYear, tx } = input;
  const client = tx ?? prisma;

  const { sectionName, recipients } = await resolveTimetableRecipients(
    sectionId,
    academicYear,
    client
  );

  if (recipients.length === 0) {
    return {
      success: true,
      sectionId,
      sectionName,
      academicYear,
      recipientCount: 0,
      facultyCount: 0,
      studentCount: 0,
      createdNotificationsCount: 0,
    };
  }

  const title = "Timetable Published";
  const message = `The timetable for Section ${sectionName} (${academicYear}) has been published.`;

  const notificationData = recipients.map((r) => ({
    userId: r.userId,
    title,
    message,
    type: "TIMETABLE_PUBLISHED" as const,
    link: r.role === "FACULTY" ? "/faculty/timetable" : "/student/timetable",
    isRead: false,
  }));

  const createResult = await client.notification.createMany({
    data: notificationData,
  });

  const facultyCount = recipients.filter((r) => r.role === "FACULTY").length;
  const studentCount = recipients.filter((r) => r.role === "STUDENT").length;

  return {
    success: true,
    sectionId,
    sectionName,
    academicYear,
    recipientCount: recipients.length,
    facultyCount,
    studentCount,
    createdNotificationsCount: createResult.count,
  };
}
