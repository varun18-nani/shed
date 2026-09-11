"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  Search,
  Plus,
  Trash2,
  CalendarDays,
  X,
  Edit2,
  Wand2,
  LayoutGrid,
  List,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  User,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Download,
  Printer,
  Send,
  Archive,
  Lock,
  Info,
} from "lucide-react";

// ─────────────────────────────────────────────
// CONSTANTS & TYPES
// ─────────────────────────────────────────────
const DAY_MAPPING: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

type TimetableEntry = {
  id: string;
  subject: { id: string; code: string; name: string; credits: number };
  faculty: { id: string; employeeId: string; firstName: string; lastName: string };
  room: { id: string; roomNumber: string; building: string; type: string; capacity: number; status: string };
  timeSlot: { id: string; dayOfWeek: number; startTime: string; endTime: string };
  section: { id: string; name: string; semester: number; department: string } | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  academicYear: string;
};

type Department = { id: string; name: string; code: string };
type Section = { id: string; name: string; semester: number; departmentId: string; capacity?: number | null };
type Subject = { id: string; name: string; code: string; departmentId: string; semester: number; facultyId?: string | null };
type Faculty = { id: string; name: string; employeeId: string; departmentId: string };
type Room = { id: string; roomNumber: string; building: string; type: string; capacity: number; status: string };
type TimeSlot = { id: string; dayOfWeek: number; startTime: string; endTime: string };

function StatusBadge({ status }: { status: TimetableEntry["status"] }) {
  const config = {
    DRAFT: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
    PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    ARCHIVED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config[status] || config.DRAFT}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────
export default function TimetablePage() {
  // Data state
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  // Generator panel state
  const [genDeptId, setGenDeptId] = useState("");
  const [genSemester, setGenSemester] = useState<number | "">("");
  const [genSectionId, setGenSectionId] = useState("");
  const [genAcademicYear, setGenAcademicYear] = useState(
    `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{
    success: boolean;
    message: string;
    existing?: boolean;
    diagnostics?: any;
  } | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterSemester, setFilterSemester] = useState<string>("");
  const [filterSection, setFilterSection] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterFaculty, setFilterFaculty] = useState("");
  const [filterRoom, setFilterRoom] = useState("");

  // View state: grid or list
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // UI status state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Lifecycle states (Publish / Archive)
  const [isPublishing, setIsPublishing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: "publish" | "archive";
    sectionId: string;
    sectionName: string;
    academicYear: string;
    count: number;
  } | null>(null);

  // Modal State for Manual CRUD
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form Fields for Manual Entry
  const [subjectId, setSubjectId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYear, setAcademicYear] = useState(
    `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`
  );
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");

  // ── Load All Initial Data ───────────────────
  async function loadData() {
    setLoading(true);
    try {
      const [entriesRes, deptRes, secRes, subjRes, facRes, roomRes, timeRes] = await Promise.all([
        fetch("/api/timetable"),
        fetch("/api/departments"),
        fetch("/api/sections"),
        fetch("/api/subjects"),
        fetch("/api/faculty"),
        fetch("/api/rooms"),
        fetch("/api/timeslots"),
      ]);

      if (entriesRes.ok) setEntries(await entriesRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (secRes.ok) setSections(await secRes.json());
      if (subjRes.ok) setSubjects(await subjRes.json());
      if (facRes.ok) setFaculties(await facRes.json());
      if (roomRes.ok) setRooms(await roomRes.json());
      if (timeRes.ok) setTimeSlots(await timeRes.json());
    } catch (err) {
      console.error(err);
      setError("Failed to load timetable data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ── Generator Dependent Sections ────────────
  const genAvailableSections = useMemo(() => {
    if (!genDeptId || !genSemester) return [];
    return sections.filter(
      (s) => s.departmentId === genDeptId && s.semester === Number(genSemester)
    );
  }, [sections, genDeptId, genSemester]);

  const handleGenDeptChange = (deptId: string) => {
    setGenDeptId(deptId);
    setGenSectionId("");
    setGenResult(null);
  };

  const handleGenSemesterChange = (sem: string) => {
    const semNum = sem === "" ? "" : Number(sem);
    setGenSemester(semNum);
    setGenSectionId("");
    setGenResult(null);
  };

  // Preview state
  const [previewData, setPreviewData] = useState<{
    qualityScore?: number;
    qualityBreakdown?: any;
    recommendations?: string[];
    entries?: any[];
  } | null>(null);

  // Phase 12 Optimization & Regeneration State
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isApplyingCandidate, setIsApplyingCandidate] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [regenerateModal, setRegenerateModal] = useState<{
    sectionId: string;
    academicYear: string;
    sectionName: string;
  } | null>(null);

  // ── Optimization: Generate Multiple Candidates ───
  async function handleOptimizeTimetable(allowDraftReplace: boolean = false) {
    setGenResult(null);
    setPreviewData(null);
    setCandidates([]);
    setSelectedCandidateId(null);
    setError("");

    if (!genDeptId) {
      setError("Please select a department for optimization.");
      return;
    }
    if (!genSemester) {
      setError("Please select a semester for optimization.");
      return;
    }
    if (!genSectionId) {
      setError("Please select a section for optimization.");
      return;
    }
    if (!genAcademicYear.trim()) {
      setError("Please enter a valid academic year (e.g. 2026-27).");
      return;
    }

    setIsOptimizing(true);

    try {
      const res = await fetch("/api/timetable/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: genDeptId,
          semester: Number(genSemester),
          sectionId: genSectionId,
          academicYear: genAcademicYear.trim(),
          candidateCount: 4,
          allowExistingDraft: allowDraftReplace,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.candidates?.length > 0) {
        setCandidates(data.candidates);
        setSelectedCandidateId(data.candidates[0].id);
        setPreviewData({
          qualityScore: data.candidates[0].qualityScore,
          qualityBreakdown: data.candidates[0].breakdown,
          recommendations: data.candidates[0].recommendations,
          entries: data.candidates[0].entries,
        });
        setGenResult({
          success: true,
          message: `Generated ${data.candidateCount} candidate schedules! Best Quality Score: ${data.bestScore}/100. Inspect and select your preferred schedule below.`,
        });
      } else if (res.status === 409 && data.diagnostics?.status === "DRAFT") {
        setRegenerateModal({
          sectionId: genSectionId,
          academicYear: genAcademicYear.trim(),
          sectionName: sections.find((s) => s.id === genSectionId)?.name || "Selected Section",
        });
      } else {
        setGenResult({
          success: false,
          message: data.error || "Optimization could not find valid candidate schedules.",
          diagnostics: data.diagnostics,
        });
      }
    } catch (err: any) {
      setGenResult({
        success: false,
        message: err.message || "A network error occurred during optimization.",
      });
    } finally {
      setIsOptimizing(false);
    }
  }

  // ── Apply/Save Selected Candidate ───
  async function handleApplyCandidate(candidate: any) {
    if (!candidate) return;
    setIsApplyingCandidate(true);
    setError("");

    try {
      const res = await fetch("/api/timetable/optimize/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: genSectionId,
          academicYear: genAcademicYear.trim(),
          candidateId: candidate.id,
          entries: candidate.entries.map((e: any) => ({
            subjectId: e.subjectId,
            facultyId: e.facultyId,
            roomId: e.roomId,
            timeSlotId: e.timeSlotId,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`Candidate #${candidate.candidateIndex} (${candidate.strategyName}) saved as official DRAFT timetable!`);
        setCandidates([]);
        setPreviewData(null);
        setGenResult(null);
        const entriesRes = await fetch("/api/timetable");
        if (entriesRes.ok) setEntries(await entriesRes.json());
      } else {
        setError(data.error || "Failed to save candidate timetable.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to apply candidate schedule.");
    } finally {
      setIsApplyingCandidate(false);
    }
  }

  // ── Trigger Automatic Timetable Generation ───
  async function handleGenerateTimetable(previewMode: boolean = false) {
    setGenResult(null);
    if (!previewMode) setPreviewData(null);
    setError("");

    if (!genDeptId) {
      setError("Please select a department for generation.");
      return;
    }
    if (!genSemester) {
      setError("Please select a semester for generation.");
      return;
    }
    if (!genSectionId) {
      setError("Please select a section for generation.");
      return;
    }
    if (!genAcademicYear.trim()) {
      setError("Please enter a valid academic year (e.g. 2026-27).");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("/api/timetable/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: genDeptId,
          semester: Number(genSemester),
          sectionId: genSectionId,
          academicYear: genAcademicYear.trim(),
          preview: previewMode,
        }),
      });

      const data = await res.json();

      if (previewMode && res.ok && data.success) {
        setPreviewData({
          qualityScore: data.qualityScore,
          qualityBreakdown: data.qualityBreakdown,
          recommendations: data.recommendations,
          entries: data.entries,
        });
        setGenResult({
          success: true,
          message: `Preview generated successfully. Quality Score: ${data.qualityScore}/100. ${data.entriesCount} periods mapped.`,
        });
      } else if (res.status === 201 && data.success) {
        setPreviewData({
          qualityScore: data.qualityScore,
          qualityBreakdown: data.qualityBreakdown,
          recommendations: data.recommendations,
        });
        setGenResult({
          success: true,
          message: `Timetable generated & saved successfully — ${data.entriesCreated} periods created (Quality Score: ${data.qualityScore || "N/A"}/100).`,
        });
        const entriesRes = await fetch("/api/timetable");
        if (entriesRes.ok) setEntries(await entriesRes.json());
      } else if (res.status === 409 && data.existingEntries) {
        setGenResult({
          success: false,
          existing: true,
          message: `Timetable already exists for this section for ${genAcademicYear}.`,
        });
      } else {
        setGenResult({
          success: false,
          message: data.error || "Unable to generate timetable.",
          diagnostics: data.diagnostics,
        });
      }
    } catch (err: any) {
      setGenResult({
        success: false,
        message: err.message || "A network error occurred during timetable generation.",
      });
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Publish Action Handler ───────────────────
  async function handlePublishTimetable(secId: string, yr: string) {
    setIsPublishing(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/timetable/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: secId,
          academicYear: yr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish timetable");
      }

      setSuccess(`Timetable published successfully (${data.publishedCount} periods published).`);
      setConfirmModal(null);
      const entriesRes = await fetch("/api/timetable");
      if (entriesRes.ok) setEntries(await entriesRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPublishing(false);
    }
  }

  // ── Archive Action Handler ───────────────────
  async function handleArchiveTimetable(secId: string, yr: string) {
    setIsArchiving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/timetable/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: secId,
          academicYear: yr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to archive timetable");
      }

      setSuccess(`Timetable archived successfully (${data.archivedCount} periods archived).`);
      setConfirmModal(null);
      const entriesRes = await fetch("/api/timetable");
      if (entriesRes.ok) setEntries(await entriesRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsArchiving(false);
    }
  }

  // ── Filtered Timetable Entries ───────────────
  const filteredEntries = useMemo(() => {
    // If preview entries are active, display preview entries
    const sourceEntries = previewData?.entries && previewData.entries.length > 0 ? previewData.entries : entries;

    return sourceEntries.filter((entry) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        entry.subject.code.toLowerCase().includes(q) ||
        entry.subject.name.toLowerCase().includes(q) ||
        entry.faculty.firstName?.toLowerCase().includes(q) ||
        entry.faculty.lastName?.toLowerCase().includes(q) ||
        entry.room.roomNumber.toLowerCase().includes(q) ||
        entry.room.building.toLowerCase().includes(q) ||
        (entry.section?.name.toLowerCase().includes(q) ?? false);

      const matchesDept =
        !filterDept ||
        entry.section?.department === filterDept ||
        departments.find((d) => d.id === filterDept)?.name === entry.section?.department;

      const matchesSemester =
        !filterSemester || entry.section?.semester?.toString() === filterSemester;

      const matchesSection = !filterSection || entry.section?.id === filterSection;

      const matchesYear = !filterYear || entry.academicYear === filterYear;

      const matchesDay = !filterDay || entry.timeSlot.dayOfWeek.toString() === filterDay;

      const matchesFaculty = !filterFaculty || entry.faculty.id === filterFaculty;

      const matchesRoom = !filterRoom || entry.room.id === filterRoom;

      return (
        matchesSearch &&
        matchesDept &&
        matchesSemester &&
        matchesSection &&
        matchesYear &&
        matchesDay &&
        matchesFaculty &&
        matchesRoom
      );
    });
  }, [
    entries,
    previewData,
    search,
    filterDept,
    filterSemester,
    filterSection,
    filterYear,
    filterDay,
    filterFaculty,
    filterRoom,
    departments,
  ]);

  // ── Lifecycle Status Analysis for Selected Section + Year ──
  const sectionLifecycleState = useMemo(() => {
    if (!filterSection || !filterYear) return null;

    const targetEntries = entries.filter(
      (e) => e.section?.id === filterSection && e.academicYear === filterYear
    );

    if (targetEntries.length === 0) return null;

    const targetSection = sections.find((s) => s.id === filterSection);
    const count = targetEntries.length;
    const draftCount = targetEntries.filter((e) => e.status === "DRAFT").length;
    const publishedCount = targetEntries.filter((e) => e.status === "PUBLISHED").length;
    const archivedCount = targetEntries.filter((e) => e.status === "ARCHIVED").length;

    let overallStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "MIXED" = "MIXED";
    if (draftCount === count) overallStatus = "DRAFT";
    else if (publishedCount === count) overallStatus = "PUBLISHED";
    else if (archivedCount === count) overallStatus = "ARCHIVED";

    return {
      sectionId: filterSection,
      sectionName: targetSection?.name || "Selected Section",
      academicYear: filterYear,
      count,
      overallStatus,
      draftCount,
      publishedCount,
      archivedCount,
    };
  }, [entries, sections, filterSection, filterYear]);

  // ── Export CSV Handler ───────────────────────
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      setError("No timetable entries available to export.");
      return;
    }

    const headers = [
      "Day",
      "Start Time",
      "End Time",
      "Subject Code",
      "Subject Name",
      "Faculty",
      "Room",
      "Section",
      "Academic Year",
      "Status",
    ];

    const escapeCSV = (val: any) => {
      const str = String(val ?? "").trim();
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredEntries.map((e) => [
      escapeCSV(DAY_MAPPING[e.timeSlot.dayOfWeek] || `Day ${e.timeSlot.dayOfWeek}`),
      escapeCSV(e.timeSlot.startTime),
      escapeCSV(e.timeSlot.endTime),
      escapeCSV(e.subject.code),
      escapeCSV(e.subject.name),
      escapeCSV(`${e.faculty.firstName} ${e.faculty.lastName}`),
      escapeCSV(`${e.room.roomNumber} (${e.room.building})`),
      escapeCSV(e.section ? `${e.section.name} (Sem ${e.section.semester})` : "None"),
      escapeCSV(e.academicYear),
      escapeCSV(e.status),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);

    let filename = "schedai-timetable-export.csv";
    if (filterSection && filterYear) {
      const sec = sections.find((s) => s.id === filterSection);
      filename = `schedai-timetable-${filterYear}-section-${sec?.name || filterSection}.csv`;
    } else if (filterYear) {
      filename = `schedai-timetable-${filterYear}.csv`;
    }

    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Print Timetable Handler ──────────────────
  const handlePrintTimetable = () => {
    window.print();
  };

  // ── Export PDF Handler ───────────────────────
  const handleExportPDF = async () => {
    if (!filterSection || !filterYear) {
      setError("Please filter by a specific Section and Academic Year before exporting PDF.");
      return;
    }
    setIsPdfExporting(true);
    setError("");
    try {
      const params = new URLSearchParams({
        sectionId: filterSection,
        academicYear: filterYear,
      });
      const res = await fetch(`/api/timetable/export/pdf?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "PDF generation failed" }));
        throw new Error(data.error || `PDF export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const sec = sections.find((s) => s.id === filterSection);
      const filename = `schedai-timetable-${sec?.name || filterSection}-${filterYear}.pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "Failed to export PDF.");
    } finally {
      setIsPdfExporting(false);
    }
  };

  // ── Manual Modal Dependent Logic ────────────
  const selectedSubject = useMemo(() => subjects.find((s) => s.id === subjectId), [subjects, subjectId]);

  const validFaculties = useMemo(() => {
    if (!selectedSubject) return faculties;
    return faculties.filter((f) => f.departmentId === selectedSubject.departmentId);
  }, [faculties, selectedSubject]);

  const validSections = useMemo(() => {
    if (!selectedSubject) return sections;
    return sections.filter((s) => s.departmentId === selectedSubject.departmentId);
  }, [sections, selectedSubject]);

  // ── Manual CRUD Handlers ────────────────────
  function openAddForm() {
    setError("");
    setSuccess("");
    setEditId(null);
    setSubjectId("");
    setFacultyId("");
    setRoomId("");
    setTimeSlotId("");
    setSectionId("");
    setStatus("DRAFT");
    setShowForm(true);
  }

  function openEditForm(entry: TimetableEntry) {
    setError("");
    setSuccess("");
    setEditId(entry.id);
    setSubjectId(entry.subject.id);
    setFacultyId(entry.faculty.id);
    setRoomId(entry.room.id);
    setTimeSlotId(entry.timeSlot.id);
    setSectionId(entry.section?.id || "");
    setAcademicYear(entry.academicYear);
    setStatus(entry.status);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = {
        id: editId,
        subjectId,
        facultyId,
        roomId,
        timeSlotId,
        sectionId: sectionId || undefined,
        academicYear,
        status,
      };

      const res = await fetch("/api/timetable", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save entry");
      }

      setSuccess(`Timetable entry ${editId ? "updated" : "created"} successfully.`);
      setShowForm(false);
      const entriesRes = await fetch("/api/timetable");
      if (entriesRes.ok) setEntries(await entriesRes.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this timetable entry?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/timetable", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setSuccess("Entry deleted successfully.");
      const entriesRes = await fetch("/api/timetable");
      if (entriesRes.ok) setEntries(await entriesRes.json());
    } catch (err: any) {
      setError(err.message);
    }
  }

  // ── Grid Grouping ───────────────────────────
  const activeDays = useMemo(() => {
    const daysInTimeSlots = Array.from(new Set(timeSlots.map((ts) => ts.dayOfWeek))).sort((a, b) => a - b);
    return daysInTimeSlots.length > 0 ? daysInTimeSlots : [1, 2, 3, 4, 5];
  }, [timeSlots]);

  const uniqueTimeSlotRanges = useMemo(() => {
    const map = new Map<string, { startTime: string; endTime: string }>();
    timeSlots.forEach((ts) => {
      const key = `${ts.startTime}-${ts.endTime}`;
      if (!map.has(key)) {
        map.set(key, { startTime: ts.startTime, endTime: ts.endTime });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timeSlots]);

  const gridEntriesMap = useMemo(() => {
    const map = new Map<string, TimetableEntry[]>();
    filteredEntries.forEach((entry) => {
      const key = `${entry.timeSlot.dayOfWeek}_${entry.timeSlot.startTime}_${entry.timeSlot.endTime}`;
      const list = map.get(key) || [];
      list.push(entry);
      map.set(key, list);
    });
    return map;
  }, [filteredEntries]);

  const uniqueAcademicYears = useMemo(() => {
    return Array.from(new Set(entries.map((e) => e.academicYear)));
  }, [entries]);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex">
      {/* Sidebar hidden in Print view via print:hidden */}
      <div className="print:hidden">
        <Sidebar />
      </div>

      <section className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        {/* TOPBAR (Hidden in Print) */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 shrink-0 bg-slate-950/60 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-xl w-96 border border-white/5">
            <Search size={18} className="text-gray-400" />
            <input
              placeholder="Search timetable by subject, faculty, room..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-white placeholder-gray-500 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-500 hover:text-gray-300">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => {
                loadData();
                setSuccess("Data refreshed.");
                setTimeout(() => setSuccess(""), 3000);
              }}
              title="Refresh Data"
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-cyan-400" : ""} />
            </button>
            <Bell className="text-gray-400 cursor-pointer hover:text-white transition" />
            <div className="bg-gradient-to-tr from-cyan-500 to-blue-600 h-10 w-10 rounded-full flex items-center justify-center font-bold shadow-lg shadow-cyan-500/20 cursor-pointer">
              A
            </div>
          </div>
        </header>

        {/* PRINT EXCLUSIVE HEADER */}
        <div className="hidden print:block p-6 mb-4 border-b-2 border-slate-800 text-black">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">SchedAI Academic Timetable</h1>
              <p className="text-sm text-slate-600 mt-1">Official Schedule Report</p>
            </div>
            <div className="text-right text-sm text-slate-700">
              {filterSection && (
                <div>
                  <strong>Section:</strong> {sections.find((s) => s.id === filterSection)?.name}
                </div>
              )}
              {filterSemester && (
                <div>
                  <strong>Semester:</strong> {filterSemester}
                </div>
              )}
              {filterYear && (
                <div>
                  <strong>Academic Year:</strong> {filterYear}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar space-y-8 print:p-0 print:overflow-visible">
          {/* HEADER & TOP ACTION BUTTONS */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 print:hidden">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 shadow-inner">
                <CalendarDays className="text-cyan-400" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  Timetable Management
                </h1>
                <p className="text-slate-400 mt-1 text-sm">
                  Generate, publish, archive, and export academic schedules.
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                title="Export filtered records to CSV"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition active:scale-95"
              >
                <Download size={15} className="text-cyan-400" />
                <span>Export CSV</span>
              </button>

              {/* Export PDF Button */}
              <button
                onClick={handleExportPDF}
                disabled={isPdfExporting || !filterSection || !filterYear}
                title={!filterSection || !filterYear ? "Select a Section and Academic Year to export PDF" : "Export published timetable as PDF"}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPdfExporting ? (
                  <RefreshCw size={15} className="text-rose-400 animate-spin" />
                ) : (
                  <Download size={15} className="text-rose-400" />
                )}
                <span>{isPdfExporting ? "Generating…" : "Export PDF"}</span>
              </button>

              {/* Print Timetable Button */}
              <button
                onClick={handlePrintTimetable}
                title="Print clean schedule view"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white font-medium text-xs transition active:scale-95"
              >
                <Printer size={15} className="text-purple-400" />
                <span>Print</span>
              </button>

              {/* Toggle view mode */}
              <div className="bg-slate-900 border border-white/10 p-1 rounded-xl flex items-center gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid size={14} /> Grid
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    viewMode === "list"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <List size={14} /> Table
                </button>
              </div>

              <button
                onClick={openAddForm}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 font-semibold shadow-lg shadow-cyan-500/20 transition-all active:scale-95 text-xs text-white"
              >
                <Plus size={16} />
                Add Entry
              </button>
            </div>
          </div>

          {/* GLOBAL FEEDBACK ALERTS */}
          {(error || success) && (
            <div
              className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all print:hidden ${
                error
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-green-500/30 bg-green-500/10 text-green-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <span>{error || success}</span>
              </div>
              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ============================================================
              PART 5 & 6 — SECTION TIMETABLE LIFECYCLE CONTROLS
              ============================================================ */}
          {sectionLifecycleState && (
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl border ${
                    sectionLifecycleState.overallStatus === "PUBLISHED"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : sectionLifecycleState.overallStatus === "ARCHIVED"
                      ? "bg-slate-800 border-white/10 text-slate-400"
                      : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  }`}
                >
                  {sectionLifecycleState.overallStatus === "PUBLISHED" ? (
                    <CheckCircle2 size={22} />
                  ) : sectionLifecycleState.overallStatus === "ARCHIVED" ? (
                    <Archive size={22} />
                  ) : (
                    <Lock size={22} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Section {sectionLifecycleState.sectionName} ({sectionLifecycleState.academicYear})
                    </span>
                    <StatusBadge
                      status={
                        sectionLifecycleState.overallStatus === "MIXED"
                          ? "DRAFT"
                          : sectionLifecycleState.overallStatus
                      }
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sectionLifecycleState.count} scheduled periods &bull;{" "}
                    {sectionLifecycleState.overallStatus === "DRAFT"
                      ? "All periods in DRAFT. Publish to make this timetable active."
                      : sectionLifecycleState.overallStatus === "PUBLISHED"
                      ? "Official schedule active. Archive when transitioning academic cycles."
                      : sectionLifecycleState.overallStatus === "ARCHIVED"
                      ? "This timetable is archived and preserved for historical records."
                      : "Timetable has mixed entry statuses and cannot be bulk transitioned."}
                  </p>
                </div>
              </div>

              {/* Action Buttons based on lifecycle status */}
              <div className="flex items-center gap-2.5">
                {sectionLifecycleState.overallStatus === "DRAFT" && (
                  <>
                    <button
                      onClick={() => {
                        const sec = sections.find((s) => s.id === sectionLifecycleState.sectionId);
                        if (sec) {
                          setGenDeptId(sec.departmentId);
                          setGenSemester(sec.semester);
                          setGenSectionId(sec.id);
                          setGenAcademicYear(sectionLifecycleState.academicYear);
                        }
                        setRegenerateModal({
                          sectionId: sectionLifecycleState.sectionId,
                          academicYear: sectionLifecycleState.academicYear,
                          sectionName: sectionLifecycleState.sectionName,
                        });
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 font-semibold text-xs text-purple-300 transition active:scale-95"
                    >
                      <RefreshCw size={13} className="text-purple-400" />
                      <span>Regenerate Draft</span>
                    </button>
                    <button
                      onClick={() =>
                        setConfirmModal({
                          type: "publish",
                          sectionId: sectionLifecycleState.sectionId,
                          sectionName: sectionLifecycleState.sectionName,
                          academicYear: sectionLifecycleState.academicYear,
                          count: sectionLifecycleState.count,
                        })
                      }
                      disabled={isPublishing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 font-semibold text-xs text-white shadow-lg shadow-emerald-500/20 transition active:scale-95"
                    >
                      <Send size={15} />
                      <span>Publish Timetable</span>
                    </button>
                  </>
                )}

                {sectionLifecycleState.overallStatus === "PUBLISHED" && (
                  <>
                    <span className="text-[11px] text-slate-400 mr-1 italic">
                      Published timetable cannot be regenerated.
                    </span>
                    <button
                      onClick={() =>
                        setConfirmModal({
                          type: "archive",
                          sectionId: sectionLifecycleState.sectionId,
                          sectionName: sectionLifecycleState.sectionName,
                          academicYear: sectionLifecycleState.academicYear,
                          count: sectionLifecycleState.count,
                        })
                      }
                      disabled={isArchiving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:bg-slate-700 border border-white/10 font-semibold text-xs text-slate-200 transition active:scale-95"
                    >
                      <Archive size={15} className="text-slate-400" />
                      <span>Archive Timetable</span>
                    </button>
                  </>
                )}

                {sectionLifecycleState.overallStatus === "ARCHIVED" && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-400 cursor-not-allowed">
                    <Archive size={14} /> Archived (Cannot be regenerated)
                  </span>
                )}

                {sectionLifecycleState.overallStatus === "MIXED" && (
                  <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-300">
                    <AlertTriangle size={14} /> Mixed Statuses
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ============================================================
              AUTOMATIC TIMETABLE GENERATOR PANEL (Hidden in Print)
              ============================================================ */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/80 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden print:hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl border border-cyan-500/30">
                <Sparkles className="text-cyan-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Automatic Timetable Generator
                  <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    AI Constraint Engine
                  </span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Select department, semester, and section to generate conflict-free schedules based on credits, room capacity, and faculty availability.
                </p>
              </div>
            </div>

            {/* GENERATOR CONTROLS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* 1. Department */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Department <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={genDeptId}
                  onChange={(e) => handleGenDeptChange(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-slate-200"
                >
                  <option value="">Select Department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Semester */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Semester <span className="text-cyan-400">*</span>
                </label>
                <select
                  value={genSemester}
                  onChange={(e) => handleGenSemesterChange(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-slate-200"
                >
                  <option value="">Select Semester</option>
                  {SEMESTERS.map((sem) => (
                    <option key={sem} value={sem}>
                      Semester {sem}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Section (Dependent) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>
                    Section <span className="text-cyan-400">*</span>
                  </span>
                  {genDeptId && genSemester && genAvailableSections.length === 0 && (
                    <span className="text-yellow-400 text-[10px] lowercase">no sections found</span>
                  )}
                </label>
                <select
                  value={genSectionId}
                  onChange={(e) => {
                    setGenSectionId(e.target.value);
                    setGenResult(null);
                  }}
                  disabled={!genDeptId || !genSemester || genAvailableSections.length === 0}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!genDeptId || !genSemester
                      ? "Select Dept & Sem first"
                      : genAvailableSections.length === 0
                      ? "No sections available"
                      : "Select Section"}
                  </option>
                  {genAvailableSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      Section {sec.name} {sec.capacity ? `(Cap: ${sec.capacity})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Academic Year */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Academic Year <span className="text-cyan-400">*</span>
                </label>
                <input
                  type="text"
                  value={genAcademicYear}
                  onChange={(e) => {
                    setGenAcademicYear(e.target.value);
                    setGenResult(null);
                  }}
                  placeholder="e.g. 2026-27"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-slate-200 placeholder-slate-600"
                />
              </div>
            </div>

            {/* GENERATE & OPTIMIZE BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-400">
                You can <span className="text-cyan-400 font-semibold">Preview</span>, compare <span className="text-purple-400 font-semibold">Multiple Candidates</span>, or directly generate <span className="text-yellow-400 font-semibold">DRAFT</span> entries.
              </div>
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleGenerateTimetable(true)}
                  disabled={isGenerating || isOptimizing || !genDeptId || !genSemester || !genSectionId || !genAcademicYear.trim()}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-cyan-500/30 text-cyan-300 font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles size={14} className="text-cyan-400" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => handleOptimizeTimetable(false)}
                  disabled={isGenerating || isOptimizing || !genDeptId || !genSemester || !genSectionId || !genAcademicYear.trim()}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isOptimizing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-purple-400" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-purple-400" />
                      <span>Optimize & Compare</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleGenerateTimetable(false)}
                  disabled={isGenerating || isOptimizing || !genDeptId || !genSemester || !genSectionId || !genAcademicYear.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:opacity-90 font-semibold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-white" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 size={14} />
                      <span>Generate & Save</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* GENERATOR RESULT DISPLAY */}
            {genResult && (
              <div className="mt-5">
                {genResult.success ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 flex items-start justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 size={20} className="shrink-0 text-green-400" />
                        <div>
                          <div className="font-semibold">{genResult.message}</div>
                          <div className="text-xs text-green-500 mt-0.5">
                            {previewData?.entries
                              ? "Preview active. Click 'Generate & Save' above to persist into database as DRAFT."
                              : "View updated schedule in the timetable below."}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => { setGenResult(null); setPreviewData(null); }} className="text-green-500 hover:text-green-300">
                        <X size={16} />
                      </button>
                    </div>

                    {/* CANDIDATES COMPARISON & SELECTION SECTION */}
                    {candidates.length > 0 && (
                      <div className="bg-slate-950/80 border border-purple-500/30 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-purple-400" size={18} />
                            <span className="font-bold text-white text-sm">Optimization Candidates ({candidates.length} generated)</span>
                          </div>
                          <span className="text-xs text-purple-300 font-medium">
                            Select a candidate to view on grid or save as official DRAFT
                          </span>
                        </div>

                        {/* Candidates Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                          {candidates.map((cand) => {
                            const isSelected = selectedCandidateId === cand.id;
                            const isBest = cand.qualityScore === Math.max(...candidates.map((c) => c.qualityScore));

                            return (
                              <div
                                key={cand.id}
                                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                                  isSelected
                                    ? "bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-500/10"
                                    : "bg-slate-900/60 border-white/10 hover:border-white/20"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-slate-200">
                                      Candidate #{cand.candidateIndex}
                                    </span>
                                    {isBest && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Best Score
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-medium truncate mb-2">
                                    {cand.strategyName}
                                  </div>
                                  <div className="text-2xl font-black font-mono text-purple-300">
                                    {cand.qualityScore}
                                    <span className="text-xs text-slate-500 font-normal">/100</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-2 space-y-0.5">
                                    <div>Day Spread: {cand.breakdown.dayDistribution}/25</div>
                                    <div>Subject Balance: {cand.breakdown.workloadBalance}/25</div>
                                    <div>Gap Efficiency: {cand.breakdown.gapPenalty}/20</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                  <button
                                    onClick={() => {
                                      setSelectedCandidateId(cand.id);
                                      setPreviewData({
                                        qualityScore: cand.qualityScore,
                                        qualityBreakdown: cand.breakdown,
                                        recommendations: cand.recommendations,
                                        entries: cand.entries,
                                      });
                                    }}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                                      isSelected
                                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                                    }`}
                                  >
                                    {isSelected ? "Viewing" : "Preview"}
                                  </button>
                                  <button
                                    onClick={() => handleApplyCandidate(cand)}
                                    disabled={isApplyingCandidate}
                                    className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 font-semibold text-xs text-white transition active:scale-95 disabled:opacity-50"
                                  >
                                    {isApplyingCandidate ? "Saving..." : "Apply"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* QUALITY SCORE & RECOMMENDATIONS DISPLAY */}
                    {previewData && (
                      <div className="bg-slate-950 border border-white/10 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Sparkles className="text-cyan-400" size={18} />
                            <span className="font-bold text-white text-sm">Timetable Quality Assessment</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Score:</span>
                            <span
                              className={`text-base font-extrabold font-mono px-2.5 py-0.5 rounded-lg border ${
                                (previewData.qualityScore ?? 0) >= 80
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : (previewData.qualityScore ?? 0) >= 60
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                                  : "bg-red-500/10 text-red-400 border-red-500/30"
                              }`}
                            >
                              {previewData.qualityScore ?? 0}/100
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Metrics */}
                        {previewData.qualityBreakdown && (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                              <span className="text-slate-400 block text-[11px]">Day Spread</span>
                              <span className="font-bold text-slate-200 mt-1 block">
                                {previewData.qualityBreakdown.dayDistribution}/25
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                              <span className="text-slate-400 block text-[11px]">Subject Balance</span>
                              <span className="font-bold text-slate-200 mt-1 block">
                                {previewData.qualityBreakdown.workloadBalance}/25
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                              <span className="text-slate-400 block text-[11px]">Gap Efficiency</span>
                              <span className="font-bold text-slate-200 mt-1 block">
                                {previewData.qualityBreakdown.gapPenalty}/20
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                              <span className="text-slate-400 block text-[11px]">Room Utilization</span>
                              <span className="font-bold text-slate-200 mt-1 block">
                                {previewData.qualityBreakdown.roomUtilization}/15
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5">
                              <span className="text-slate-400 block text-[11px]">Consecutive Load</span>
                              <span className="font-bold text-slate-200 mt-1 block">
                                {previewData.qualityBreakdown.consecutivePenalty}/15
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Smart Recommendations */}
                        {previewData.recommendations && previewData.recommendations.length > 0 && (
                          <div className="pt-2 border-t border-white/5 space-y-1.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                              Smart Optimization Recommendations
                            </span>
                            <ul className="space-y-1 text-xs text-slate-300">
                              {previewData.recommendations.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-cyan-400 font-bold">&bull;</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : genResult.existing ? (
                  <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="shrink-0 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-amber-300">{genResult.message}</div>
                        <p className="text-xs text-amber-400/80 mt-1">
                          Automatic overwriting is disabled to preserve existing schedules. Filter by this section to view, publish, or edit entries.
                        </p>
                        <div className="flex items-center gap-3 mt-3">
                          <button
                            onClick={() => {
                              setFilterSection(genSectionId);
                              setFilterYear(genAcademicYear);
                              setGenResult(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold text-amber-200 transition"
                          >
                            View This Timetable
                          </button>
                          <button
                            onClick={() => setGenResult(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-semibold text-red-400">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{genResult.message}</span>
                      </div>
                      <button onClick={() => setGenResult(null)} className="text-red-400 hover:text-red-200">
                        <X size={16} />
                      </button>
                    </div>

                    {genResult.diagnostics && (
                      <div className="mt-3 pt-3 border-t border-red-500/20 space-y-2 text-xs">
                        {genResult.diagnostics.error && (
                          <div className="text-red-200">
                            <span className="font-semibold">Details: </span>
                            {genResult.diagnostics.error}
                          </div>
                        )}
                        {genResult.diagnostics.unscheduledSubjects?.length > 0 && (
                          <div className="space-y-1 mt-2">
                            <span className="font-semibold text-red-200">Unscheduled subjects:</span>
                            <div className="grid gap-1.5 mt-1">
                              {genResult.diagnostics.unscheduledSubjects.map((u: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                                >
                                  <div>
                                    <span className="font-bold text-white">{u.subjectName}</span>{" "}
                                    <span className="text-slate-400">({u.subjectCode})</span>
                                    <div className="text-[11px] text-red-300 mt-0.5">
                                      Reason: {u.reason || "No valid faculty/room/time-slot combination available."}
                                    </div>
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-300 bg-black/40 px-2 py-1 rounded">
                                    Req: {u.requiredHours ?? u.requiredCredits ?? "-"} | Sched:{" "}
                                    {u.scheduledHours ?? u.scheduled ?? "0"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================
              FILTERS BAR (Hidden in Print)
              ============================================================ */}
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-xl space-y-4 print:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Filter size={16} className="text-cyan-400" />
                <span>Filter Timetable Records</span>
                <span className="text-xs text-slate-500 ml-1">
                  ({filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"} found)
                </span>
              </div>
              {(filterDept ||
                filterSemester ||
                filterSection ||
                filterYear ||
                filterDay ||
                filterFaculty ||
                filterRoom ||
                search) && (
                <button
                  onClick={() => {
                    setFilterDept("");
                    setFilterSemester("");
                    setFilterSection("");
                    setFilterYear("");
                    setFilterDay("");
                    setFilterFaculty("");
                    setFilterRoom("");
                    setSearch("");
                  }}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <X size={12} /> Clear all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {/* Filter: Department */}
              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setFilterSection("");
                }}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              {/* Filter: Semester */}
              <select
                value={filterSemester}
                onChange={(e) => {
                  setFilterSemester(e.target.value);
                  setFilterSection("");
                }}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Semesters</option>
                {SEMESTERS.map((sem) => (
                  <option key={sem} value={sem.toString()}>
                    Semester {sem}
                  </option>
                ))}
              </select>

              {/* Filter: Section */}
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Sections</option>
                {sections
                  .filter((s) => {
                    const matchDept = !filterDept || departments.find((d) => d.id === s.departmentId)?.name === filterDept;
                    const matchSem = !filterSemester || s.semester.toString() === filterSemester;
                    return matchDept && matchSem;
                  })
                  .map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} (Sem {sec.semester})
                    </option>
                  ))}
              </select>

              {/* Filter: Academic Year */}
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Years</option>
                {uniqueAcademicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {/* Filter: Day */}
              <select
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Days</option>
                {Object.entries(DAY_MAPPING).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              {/* Filter: Faculty */}
              <select
                value={filterFaculty}
                onChange={(e) => setFilterFaculty(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Faculty</option>
                {faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>

              {/* Filter: Room */}
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-cyan-500 text-slate-300"
              >
                <option value="">All Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} ({r.building})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ============================================================
              VISUAL TIMETABLE GRID & TABLE VIEW
              ============================================================ */}
          {loading ? (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-16 text-center text-gray-400 shadow-xl">
              <RefreshCw size={32} className="mx-auto text-cyan-400 animate-spin mb-4" />
              <p className="text-base font-medium">Loading timetable schedules...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-16 text-center shadow-xl print:bg-transparent print:border-none">
              <CalendarDays size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-gray-300 text-lg font-medium print:text-black">
                No timetable entries match the selected filters.
              </p>
              <p className="text-slate-500 text-sm mt-1 print:hidden">
                Try generating an automatic timetable or add an entry manually.
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* ──────────────── VISUAL GRID VIEW ──────────────── */
            <div className="space-y-6 print:space-y-4">
              {activeDays
                .filter((day) => !filterDay || day.toString() === filterDay)
                .map((dayNum) => {
                  const dayName = DAY_MAPPING[dayNum] || `Day ${dayNum}`;
                  const dayHasEntries = uniqueTimeSlotRanges.some((slot) => {
                    const key = `${dayNum}_${slot.startTime}_${slot.endTime}`;
                    return (gridEntriesMap.get(key) || []).length > 0;
                  });

                  if (!dayHasEntries && (filterDept || filterSection || filterFaculty || filterRoom || search)) {
                    return null;
                  }

                  return (
                    <div
                      key={dayNum}
                      className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-slate-300 print:text-black"
                    >
                      {/* Day Header */}
                      <div className="bg-slate-800/80 px-6 py-3.5 border-b border-white/10 flex items-center justify-between print:bg-slate-100 print:border-slate-300">
                        <div className="flex items-center gap-2.5">
                          <Clock size={16} className="text-cyan-400 print:text-slate-800" />
                          <h3 className="text-base font-bold text-white print:text-slate-900 tracking-wide">
                            {dayName}
                          </h3>
                        </div>
                        <span className="text-xs font-medium text-slate-400 print:text-slate-600">
                          {
                            uniqueTimeSlotRanges.reduce((acc, slot) => {
                              const key = `${dayNum}_${slot.startTime}_${slot.endTime}`;
                              return acc + (gridEntriesMap.get(key)?.length || 0);
                            }, 0)
                          }{" "}
                          scheduled periods
                        </span>
                      </div>

                      {/* Day Grid Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-950/40 text-slate-400 text-xs font-semibold uppercase tracking-wider print:bg-slate-50 print:text-slate-700 print:border-slate-200">
                              <th className="px-5 py-3 text-left w-44">Time Slot</th>
                              <th className="px-5 py-3 text-left">Scheduled Class & Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 print:divide-slate-200">
                            {uniqueTimeSlotRanges.map((slot, idx) => {
                              const key = `${dayNum}_${slot.startTime}_${slot.endTime}`;
                              const cellEntries = gridEntriesMap.get(key) || [];

                              return (
                                <tr key={idx} className="hover:bg-white/[0.015] transition-colors">
                                  {/* Time Column */}
                                  <td className="px-5 py-4 align-top w-44">
                                    <div className="font-mono text-sm font-semibold text-cyan-400 print:text-slate-900">
                                      {slot.startTime} - {slot.endTime}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">Period {idx + 1}</div>
                                  </td>

                                  {/* Entry Cards Column */}
                                  <td className="px-5 py-4">
                                    {cellEntries.length === 0 ? (
                                      <div className="text-xs text-slate-600 italic py-2 print:text-slate-400">
                                        No class scheduled
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 print:grid-cols-2">
                                        {cellEntries.map((entry) => (
                                          <div
                                            key={entry.id}
                                            className="bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:border-cyan-500/40 transition shadow-lg group relative flex flex-col justify-between space-y-3 print:bg-white print:border-slate-300 print:shadow-none"
                                          >
                                            {/* Card Top: Code, Status & Actions */}
                                            <div>
                                              <div className="flex items-start justify-between gap-2">
                                                <div>
                                                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                                                    {entry.subject.code}
                                                  </span>
                                                  <h4 className="font-bold text-sm text-white print:text-slate-900 mt-1.5 line-clamp-1">
                                                    {entry.subject.name}
                                                  </h4>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <StatusBadge status={entry.status} />
                                                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1 print:hidden">
                                                    <button
                                                      onClick={() => openEditForm(entry)}
                                                      title="Edit Entry"
                                                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                                                    >
                                                      <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                      onClick={() => handleDelete(entry.id)}
                                                      title="Delete Entry"
                                                      className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400"
                                                    >
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Card Details: Faculty & Room */}
                                              <div className="mt-3 space-y-1 text-xs text-slate-300 print:text-slate-700">
                                                <div className="flex items-center gap-1.5">
                                                  <User size={13} className="text-cyan-400 shrink-0 print:text-slate-600" />
                                                  <span className="font-medium truncate">
                                                    {entry.faculty.firstName} {entry.faculty.lastName}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-400 print:text-slate-600">
                                                  <Building size={13} className="text-purple-400 shrink-0 print:text-slate-600" />
                                                  <span>
                                                    Room:{" "}
                                                    <strong className="text-slate-200 print:text-slate-900">
                                                      {entry.room.roomNumber}
                                                    </strong>{" "}
                                                    ({entry.room.building})
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Card Footer: Section, Year */}
                                            <div className="pt-2 border-t border-white/5 print:border-slate-200 flex items-center justify-between text-[11px] text-slate-400 print:text-slate-600">
                                              <div className="flex items-center gap-1 font-medium text-slate-300 print:text-slate-800">
                                                <GraduationCap size={12} className="text-slate-400" />
                                                <span>
                                                  {entry.section ? `Sec ${entry.section.name} (Sem ${entry.section.semester})` : "All"}
                                                </span>
                                              </div>
                                              <span className="font-mono text-slate-500">{entry.academicYear}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* ──────────────── TABLE VIEW ──────────────── */
            <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-xl print:bg-white print:border-slate-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-800/50 border-b border-white/10 text-slate-400 text-xs font-semibold uppercase tracking-wider print:bg-slate-100 print:text-slate-700">
                      <th className="px-6 py-4">Day & Time</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Faculty</th>
                      <th className="px-6 py-4">Room</th>
                      <th className="px-6 py-4">Section & Sem</th>
                      <th className="px-6 py-4">Academic Year</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-slate-200">
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group print:text-slate-900">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-cyan-400 print:text-slate-900">
                            {DAY_MAPPING[entry.timeSlot.dayOfWeek]}
                          </div>
                          <div className="text-xs text-slate-400 print:text-slate-600 mt-0.5 font-mono">
                            {entry.timeSlot.startTime} - {entry.timeSlot.endTime}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white print:text-slate-900">{entry.subject.name}</div>
                          <div className="text-xs text-cyan-400 print:text-slate-700 font-mono mt-0.5">
                            {entry.subject.code}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 print:text-slate-800 text-sm">
                          {entry.faculty.firstName} {entry.faculty.lastName}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-200 print:text-slate-900 text-sm">
                            {entry.room.roomNumber}
                          </div>
                          <div className="text-xs text-slate-500 print:text-slate-600 mt-0.5">
                            {entry.room.building}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 print:text-slate-800 text-sm">
                          {entry.section ? (
                            <span>
                              {entry.section.name}{" "}
                              <span className="text-xs text-slate-500">(Sem {entry.section.semester})</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 print:text-slate-700 text-sm font-mono">
                          {entry.academicYear}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="px-6 py-4 text-right print:hidden">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditForm(entry)}
                              title="Edit Entry"
                              className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              title="Delete Entry"
                              className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          CONFIRMATION MODAL (PUBLISH / ARCHIVE)
          ============================================================ */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden p-6 md:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl border ${
                  confirmModal.type === "publish"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                }`}
              >
                {confirmModal.type === "publish" ? <Send size={28} /> : <Archive size={28} />}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {confirmModal.type === "publish" ? "Publish Timetable" : "Archive Timetable"}
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  {confirmModal.type === "publish"
                    ? "Publishing makes this schedule official for faculty and students."
                    : "Archiving preserves this schedule as a historical record."}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-white/5 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Section:</span>
                <span className="font-semibold text-white">{confirmModal.sectionName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Academic Year:</span>
                <span className="font-mono text-cyan-400">{confirmModal.academicYear}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Classes / Periods:</span>
                <span className="font-semibold text-white">{confirmModal.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Transition:</span>
                <span className="font-bold text-emerald-400">
                  {confirmModal.type === "publish" ? "DRAFT → PUBLISHED" : "PUBLISHED → ARCHIVED"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 font-medium text-xs text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === "publish") {
                    handlePublishTimetable(confirmModal.sectionId, confirmModal.academicYear);
                  } else {
                    handleArchiveTimetable(confirmModal.sectionId, confirmModal.academicYear);
                  }
                }}
                disabled={isPublishing || isArchiving}
                className={`px-6 py-2.5 rounded-xl font-semibold text-xs text-white shadow-lg transition active:scale-95 flex items-center gap-2 ${
                  confirmModal.type === "publish"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20"
                    : "bg-gradient-to-r from-slate-700 to-slate-800 shadow-slate-700/20"
                }`}
              >
                {(isPublishing || isArchiving) && <RefreshCw size={14} className="animate-spin" />}
                <span>
                  {confirmModal.type === "publish"
                    ? isPublishing
                      ? "Publishing..."
                      : "Confirm Publish"
                    : isArchiving
                    ? "Archiving..."
                    : "Confirm Archive"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MANUAL ENTRY ADD/EDIT MODAL
          ============================================================ */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 md:p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/50">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {editId ? "Edit Timetable Entry" : "Add Timetable Entry"}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Schedule or modify an entry with automated conflict checking.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1 custom-scrollbar">
              {error && (
                <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex gap-3 items-start">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-400" />
                  <div>{error}</div>
                </div>
              )}

              <form id="timetable-form" onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-6">
                {/* SUBJECT */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Subject <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    required
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value);
                      setFacultyId("");
                      setSectionId("");
                    }}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition text-slate-200"
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - Sem {s.semester}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FACULTY */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Faculty <span className="text-cyan-400">*</span>
                    {subjectId && (
                      <span className="text-cyan-400 text-xs ml-2">(Filtered by department)</span>
                    )}
                  </label>
                  <select
                    required
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    disabled={!subjectId}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
                  >
                    <option value="">Select Faculty</option>
                    {validFaculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                {/* ROOM */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Room <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    required
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-slate-200"
                  >
                    <option value="">Select Room</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id} disabled={r.status !== "AVAILABLE"}>
                        {r.roomNumber} - {r.building} (Cap: {r.capacity}){" "}
                        {r.status !== "AVAILABLE" ? `[${r.status}]` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TIMESLOT */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Time Slot <span className="text-cyan-400">*</span>
                  </label>
                  <select
                    required
                    value={timeSlotId}
                    onChange={(e) => setTimeSlotId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-slate-200"
                  >
                    <option value="">Select Time Slot</option>
                    {timeSlots.map((t) => (
                      <option key={t.id} value={t.id}>
                        {DAY_MAPPING[t.dayOfWeek]} : {t.startTime} - {t.endTime}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SECTION */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Section <span className="text-slate-500 text-xs font-normal">(Optional)</span>
                  </label>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value)}
                    disabled={!subjectId}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
                  >
                    <option value="">No Specific Section</option>
                    {validSections.map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name} (Sem {s.semester})
                      </option>
                    ))}
                  </select>
                </div>

                {/* ACADEMIC YEAR */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Academic Year <span className="text-cyan-400">*</span>
                  </label>
                  <input
                    required
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2026-27"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-slate-200"
                  />
                </div>

                {/* STATUS */}
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-300">Status</label>
                  <select
                    required
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-cyan-500 text-slate-200"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                form="timetable-form"
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-50 transition active:scale-95 text-white"
              >
                {saving ? "Saving..." : editId ? "Save Changes" : "Create Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGENERATE CONFIRMATION MODAL */}
      {regenerateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-purple-400">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <RefreshCw size={22} className="text-purple-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Regenerate Timetable</h3>
            </div>

            <p className="text-sm text-slate-300">
              This will replace the current <span className="text-yellow-400 font-semibold">DRAFT</span> timetable for{" "}
              <strong className="text-white">Section {regenerateModal.sectionName}</strong> ({regenerateModal.academicYear}).
            </p>

            <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-300">
              <span className="font-semibold block mb-1">Safety Policy:</span>
              Published schedules are never replaced. All current draft periods will be removed and new optimized candidates will be generated for your selection.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegenerateModal(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setRegenerateModal(null);
                  handleOptimizeTimetable(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90 font-semibold text-xs text-white shadow-lg shadow-purple-500/20 transition active:scale-95"
              >
                Proceed with Regeneration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles & Print Rules */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

        @media print {
          body { background: white !important; color: black !important; }
          main { background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `,
        }}
      />
    </main>
  );
}