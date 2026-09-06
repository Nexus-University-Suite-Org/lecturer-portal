import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  GraduationCap,
  MapPin,
  Phone,
  User,
  ShieldCheck,
  QrCode,
  Printer,
  Award,
  Briefcase,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, getNuBackend } from "@/lib/backendApi";

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-[11px] sm:text-xs text-muted-foreground border-b border-border/60 py-1 last:border-b-0">
    <span className="font-semibold uppercase tracking-wide">{label}</span>
    <span className="text-right text-foreground font-medium max-w-[55%]">
      {value}
    </span>
  </div>
);

interface CoreLecturer {
  id?: number;
  full_name?: string;
  email?: string;
  student_number?: string;
  department?: string;
  college?: string;
  specialization?: string;
  office_phone?: string;
  phone_number?: string;
  avatar_url?: string;
}

interface RegLecturer {
  lecturer_number?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
  specialization?: string;
  employment_date?: string;
  status?: string;
  phone?: string;
  avatar_url?: string;
}

interface LecturerCardData {
  name: string;
  title: string;
  department: string;
  staffNumber: string;
  employment: string;
  validThru: string;
  campus: string;
  phone: string;
  avatar: string | null;
  status: string;
}

const toMonthYear = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "NU";

function buildFallback(profile: any, user: any): LecturerCardData {
  return {
    name:
      profile?.full_name || user?.user_metadata?.full_name || "Lecturer Name",
    title: "Lecturer",
    department: profile?.department || "—",
    staffNumber: "",
    employment: "",
    validThru: toMonthYear(new Date(Date.now() + 365 * 24 * 3600 * 1000)),
    campus: profile?.college || "",
    phone: profile?.phone_number || profile?.phone || "",
    avatar: null,
    status: "Active",
  };
}

function compose(
  core: CoreLecturer | null,
  reg: RegLecturer | null,
  profile: any,
  user: any,
): LecturerCardData {
  const fallback = buildFallback(profile, user);

  const fullName =
    [reg?.first_name, reg?.last_name].filter(Boolean).join(" ").trim() ||
    core?.full_name ||
    fallback.name;

  const employmentDate = reg?.employment_date
    ? new Date(reg.employment_date)
    : null;

  const validBase = employmentDate
    ? new Date(employmentDate.getFullYear() + 1, employmentDate.getMonth(), 1)
    : new Date(Date.now() + 365 * 24 * 3600 * 1000);

  return {
    name: fullName,
    title: reg?.specialization || core?.specialization || fallback.title,
    department: reg?.department || core?.department || fallback.department,
    staffNumber: reg?.lecturer_number || core?.student_number || "",
    employment: employmentDate ? toMonthYear(employmentDate) : "",
    validThru: toMonthYear(validBase),
    campus: core?.college || fallback.campus,
    phone:
      reg?.phone || core?.phone_number || core?.office_phone || fallback.phone,
    avatar: reg?.avatar_url
      ? `http://localhost:8082${reg.avatar_url}`
      : core?.avatar_url
        ? `http://localhost:8084${core.avatar_url}`
        : null,
    status: reg?.status || fallback.status,
  };
}

export default function LecturerIdCard() {
  const { user, profile } = useAuth();

  const [lecturer, setLecturer] = useState<LecturerCardData>(() =>
    buildFallback(profile, user),
  );

  useEffect(() => {
    let active = true;
    const uid = user?.uid;
    const email = (profile?.email || user?.email || "").toLowerCase();

    const run = async () => {
      let core: CoreLecturer | null = null;
      let reg: RegLecturer | null = null;

      if (uid) {
        try {
          core = await getBackend<CoreLecturer>(`/api/profiles/by-user/${uid}/`);
        } catch {
          /* ignore */
        }
      }

      try {
        const res = await getNuBackend<{ data?: RegLecturer[] }>(
          "/api/profiles?role=lecturer",
        );
        const list = res?.data ?? [];
        reg =
          list.find(
            (l) =>
              l.email &&
              l.email.toLowerCase() === (core?.email || email).toLowerCase(),
          ) || null;
      } catch {
        /* ignore */
      }

      if (!active) return;
      setLecturer(compose(core, reg, profile, user));
    };

    run();
    return () => {
      active = false;
    };
  }, [user, profile]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-24 md:pb-10 print:bg-white print:p-0">


      <main className="container py-8 print:p-0 print:max-w-none">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
            <div className="space-y-1">
              <Badge className="w-fit" variant="secondary">
                Digital + Print Ready
              </Badge>
              <h1 className="font-display text-3xl sm:text-4xl font-bold">
                Staff ID Card
              </h1>
              <p className="text-sm text-muted-foreground">
                Preview the front and back of your official Nexus University
                Staff ID. Click print to produce both sides.
              </p>
            </div>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Front & Back
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4 items-stretch">
            {/* Front Side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative h-full"
            >
              <Card
                className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-primary to-secondary text-primary-foreground h-full flex flex-col"
                style={{
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_0%,white,transparent_30%)]" />
                <CardContent className="relative p-6 space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] font-semibold">
                        Nexus University
                      </p>
                      <h2 className="text-2xl font-black">Staff ID</h2>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-white/20 text-white border-white/30"
                    >
                      Valid Thru: {lecturer.validThru}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-2xl font-bold tracking-wide">
                      {getInitials(lecturer.name)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold leading-tight">
                        {lecturer.name}
                      </p>
                      <p className="text-sm text-white/80">{lecturer.title}</p>
                      <div className="flex items-center gap-2 text-xs text-white/80">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{lecturer.staffNumber}</span>
                      </div>
                      {lecturer.employment && (
                        <div className="text-xs text-white/70 font-mono">
                          Employment: {lecturer.employment}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-white/90">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      <span className="truncate">{lecturer.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                      <span>{lecturer.validThru}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{lecturer.campus || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="truncate">{lecturer.phone || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-white/80">
                      <p className="font-semibold">Nexus University</p>
                      <p>Main Campus • Kampala</p>
                    </div>
                    <div className="text-right text-[10px] uppercase tracking-wide text-white/70">
                      <p className="flex items-center gap-1 justify-end">
                        <Award className="h-3 w-3" />
                        <span>Academic Staff</span>
                      </p>
                      <p>Property of Nexus University.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground">Front Side</p>
            </motion.div>

            {/* Back Side */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative h-full"
            >
              <Card className="overflow-hidden border border-border/60 shadow-2xl bg-card h-full flex flex-col">
                <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Back of Card</h2>
                    <Badge variant="outline" className="text-[11px]">
                      Staff
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <InfoRow
                      label="Staff No."
                      value={lecturer.staffNumber || "—"}
                    />
                    <InfoRow
                      label="Employment"
                      value={lecturer.employment || "—"}
                    />
                    <InfoRow label="Status" value={lecturer.status} />
                    <InfoRow label="Title" value={lecturer.title} />
                    <InfoRow label="Department" value={lecturer.department} />
                    <InfoRow label="Campus" value={lecturer.campus || "—"} />
                    <InfoRow label="Phone" value={lecturer.phone || "—"} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">
                        Cardholder Responsibilities
                      </p>
                      <p>- Present on request by university authorities.</p>
                      <p>- Report loss immediately to HR office.</p>
                      <p>- Non-transferable; remains university property.</p>
                      <p>- Grants access to staff facilities.</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="bg-white p-2 rounded-lg border">
                        <QrCode className="h-16 w-16" />
                      </div>
                      <p className="text-[11px] text-muted-foreground text-center">
                        Scan for verification
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-2 text-foreground">
                      <User className="h-4 w-4" />
                      <span>HR Department | Nexus University</span>
                    </div>
                    <span className="text-right">hr@nexusuniversity.ac.ug</span>
                  </div>
                </CardContent>
              </Card>
              <p className="mt-2 text-xs text-muted-foreground">Back Side</p>
            </motion.div>
          </div>
        </div>
      </main>

      <div className="print:hidden">
        <LecturerBottomNav />
      </div>
    </div>
  );
}
