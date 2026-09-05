import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  ChevronRight,
  Bell,
  Lock,
  User,
  BookOpen,
  Palette,
  Eye,
  Heart,
  Award,
  Clock,
  Mail,
  Volume2,
  Database,
  FileText,
  Zap,
  Save,
  RotateCcw,
  ArrowLeft,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Code2,
  Calendar,
} from "lucide-react";

import { LecturerBottomNav } from "@/components/layout/LecturerBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { postBackend } from "@/lib/backendApi";
import { useToast } from "@/hooks/use-toast";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 },
  }),
};

const buildGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const todayLabel = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});

export default function LecturerSettings() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [officeHours, setOfficeHours] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState<any>(null);

  // Appearance preferences state
  const [colorTheme, setColorTheme] = useState("Auto");
  const [dashboardLayout, setDashboardLayout] = useState("Compact");
  const [fontSize, setFontSize] = useState("Medium");
  const [language, setLanguage] = useState("English");
  const [showSidebar, setShowSidebar] = useState(true);
  const [animateTransitions, setAnimateTransitions] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showTooltips, setShowTooltips] = useState(true);

  // Teaching preferences state
  const [classDuration, setClassDuration] = useState("120");
  const [teachingMode, setTeachingMode] = useState("hybrid");
  const [maxStudents, setMaxStudents] = useState("45");
  const [gradingScale, setGradingScale] = useState("Numerical (0-100)");
  const [attendanceTracking, setAttendanceTracking] = useState(true);
  const [lateSubmissions, setLateSubmissions] = useState(false);
  const [assignmentRubrics, setAssignmentRubrics] = useState(true);
  const [peerReview, setPeerReview] = useState(false);

  // Notification preferences state
  const [emailNewSubmissions, setEmailNewSubmissions] = useState(true);
  const [emailGradeRequests, setEmailGradeRequests] = useState(true);
  const [emailDeadlines, setEmailDeadlines] = useState(true);
  const [emailMessages, setEmailMessages] = useState(true);
  const [emailAnnouncements, setEmailAnnouncements] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [inAppNotifications, setInAppNotifications] = useState(true);
  const [digestEmail, setDigestEmail] = useState(false);

  // Grading preferences state
  const [defaultGradingScale, setDefaultGradingScale] =
    useState("Numerical (0-100)");
  const [latePenalty, setLatePenalty] = useState("5");
  const [minPassingGrade, setMinPassingGrade] = useState("40");
  const [roundingMethod, setRoundingMethod] = useState("Round Down");
  const [showFeedback, setShowFeedback] = useState(true);
  const [allowDisputes, setAllowDisputes] = useState(true);
  const [publishByDate, setPublishByDate] = useState(false);
  const [showClassAverage, setShowClassAverage] = useState(true);

  // Privacy preferences state
  const [profileVisible, setProfileVisible] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const hydrateProfile = (p: any) => {
    if (!p) return;
    setFullName(p.full_name || "");
    setEmail(p.email || user?.email || "");
    setDepartment(p.department || "");
    setSpecialization(p.specialization || "");
    setOfficeLocation(p.office_location || "");
    setOfficeHours(p.office_hours || "");
    setOfficePhone(p.office_phone || "");
    setPhoneNumber(p.phone_number || "");
    setBio(p.bio || "");

    setColorTheme(p.color_theme || "Auto");
    setDashboardLayout(p.dashboard_layout || "Compact");
    setFontSize(p.font_size || "Medium");
    setLanguage(p.language || "English");
    setShowSidebar(p.show_sidebar !== false);
    setAnimateTransitions(p.animate_transitions !== false);
    setCompactMode(p.compact_mode || false);
    setShowTooltips(p.show_tooltips !== false);

    setClassDuration(
      p.class_duration != null ? String(p.class_duration) : "120",
    );
    setTeachingMode(p.teaching_mode || "hybrid");
    setMaxStudents(p.max_students != null ? String(p.max_students) : "45");
    setGradingScale(p.grading_scale || "Numerical (0-100)");
    setAttendanceTracking(p.attendance_tracking !== false);
    setLateSubmissions(p.late_submissions || false);
    setAssignmentRubrics(p.assignment_rubrics !== false);
    setPeerReview(p.peer_review || false);

    setEmailNewSubmissions(p.email_new_submissions !== false);
    setEmailGradeRequests(p.email_grade_requests !== false);
    setEmailDeadlines(p.email_deadlines !== false);
    setEmailMessages(p.email_messages !== false);
    setEmailAnnouncements(p.email_announcements || false);
    setPushNotifications(p.push_notifications !== false);
    setInAppNotifications(p.in_app_notifications !== false);
    setDigestEmail(p.digest_email || false);

    setDefaultGradingScale(
      p.default_grading_scale || "Numerical (0-100)",
    );
    setLatePenalty(p.late_penalty != null ? String(p.late_penalty) : "5");
    setMinPassingGrade(
      p.min_passing_grade != null ? String(p.min_passing_grade) : "40",
    );
    setRoundingMethod(p.rounding_method || "Round Down");
    setShowFeedback(p.show_feedback !== false);
    setAllowDisputes(p.allow_disputes !== false);
    setPublishByDate(p.publish_by_date || false);
    setShowClassAverage(p.show_class_average !== false);

    setProfileVisible(p.profile_visible !== false);
    setShowEmail(p.show_email !== false);
    setTwoFactorAuth(p.two_factor_auth || false);
    setLoginAlerts(p.login_alerts !== false);
  };

  // Quick local (login) profile hydration as a fallback
  useEffect(() => {
    hydrateProfile(profile);
    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, user]);

  // Load persisted preferences from the backend so saved values are restored
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const data: any = await getBackend(
          `/api/profiles/by-user/${user.uid}`,
          true,
        );
        if (data && typeof data === "object") {
          setSavedProfile(data);
          hydrateProfile(data);
        }
      } catch (error) {
        console.warn(
          "[LecturerSettings] Failed to load profile from backend:",
          error,
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const settingsTabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "teaching", label: "Teaching", icon: BookOpen },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "grading", label: "Grading", icon: Award },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "privacy", label: "Privacy & Security", icon: Lock },
  ];

  const handleSave = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);

    try {
      await postBackend(
        "/api/profiles/by-user/" + user.uid + "/",
        {
          full_name: fullName,
          department: department,
          specialization: specialization,
          office_location: officeLocation,
          office_hours: officeHours,
          office_phone: officePhone,
          phone_number: phoneNumber,
          bio: bio,
          color_theme: colorTheme,
          dashboard_layout: dashboardLayout,
          font_size: fontSize,
          language: language,
          show_sidebar: showSidebar,
          animate_transitions: animateTransitions,
          compact_mode: compactMode,
          show_tooltips: showTooltips,
          class_duration: classDuration,
          teaching_mode: teachingMode,
          max_students: maxStudents,
          grading_scale: gradingScale,
          attendance_tracking: attendanceTracking,
          late_submissions: lateSubmissions,
          assignment_rubrics: assignmentRubrics,
          peer_review: peerReview,
          email_new_submissions: emailNewSubmissions,
          email_grade_requests: emailGradeRequests,
          email_deadlines: emailDeadlines,
          email_messages: emailMessages,
          email_announcements: emailAnnouncements,
          push_notifications: pushNotifications,
          in_app_notifications: inAppNotifications,
          digest_email: digestEmail,
          default_grading_scale: defaultGradingScale,
          late_penalty: latePenalty,
          min_passing_grade: minPassingGrade,
          rounding_method: roundingMethod,
          show_feedback: showFeedback,
          allow_disputes: allowDisputes,
          publish_by_date: publishByDate,
          show_class_average: showClassAverage,
          profile_visible: profileVisible,
          show_email: showEmail,
          two_factor_auth: twoFactorAuth,
          login_alerts: loginAlerts,
        },
        true,
      );

      setSaved(true);
      toast({
        title: "Success",
        description: "Settings updated successfully!",
      });

      // Clear saved status after some time
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Error saving profile", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handlePasswordUpdate = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirmation don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPassword(true);

    try {
      await postBackend(
        "/api/v1/auth/change-password",
        {
          uid: user?.uid,
          current_password: currentPassword,
          new_password: newPassword,
        },
        true,
      );

      toast({
        title: "Password Updated",
        description: "Your password has been successfully changed",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Password update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 pb-28">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-lavender/10 blur-3xl" />
      </div>

      <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Hero */}
          <div className="relative overflow-hidden rounded-3xl hero-gradient p-6 sm:p-8">
            <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-teal/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <SettingsIcon className="h-3.5 w-3.5" />
                Settings & Preferences
              </span>
              <h1 className="mt-4 text-3xl font-display font-bold text-white sm:text-4xl">
                {buildGreeting()}, {user?.email?.split("@")[0] || "Lecturer"}
              </h1>
              <p className="mt-1.5 text-sm font-medium text-white/80">
                Customize your teaching experience and manage your account
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  {todayLabel}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <BookOpen className="h-3.5 w-3.5" />
                  {settingsTabs.find((t) => t.id === activeTab)?.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm">
                  <Shield className="h-3.5 w-3.5" />
                  {twoFactorAuth ? "2FA on" : "2FA off"}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 grid gap-6 lg:grid-cols-4">
            {/* Sidebar Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1"
            >
              <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg sticky top-20">
                <CardHeader className="pb-3 border-b border-border/60">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {settingsTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <motion.button
                        key={tab.id}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                          isActive
                            ? "bg-gradient-to-r from-primary to-secondary text-white border border-primary/30 shadow-lg"
                            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{tab.label}</span>
                        {isActive && (
                          <ChevronRight className="h-4 w-4 ml-auto text-white" />
                        )}
                      </motion.button>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Profile Settings */}
              {activeTab === "profile" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Profile Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          placeholder="your.email@university.edu"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all opacity-60 cursor-not-allowed"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Department
                        </label>
                        <input
                          type="text"
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Your department"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Specialization
                        </label>
                        <input
                          type="text"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          placeholder="Your specialization"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Professional Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={4}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Office Location
                        </label>
                        <input
                          type="text"
                          value={officeLocation}
                          onChange={(e) => setOfficeLocation(e.target.value)}
                          placeholder="Building A, Room 204"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={5}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Office Hours
                        </label>
                        <input
                          type="text"
                          value={officeHours}
                          onChange={(e) => setOfficeHours(e.target.value)}
                          placeholder="Mon-Fri, 2:00-4:00 PM"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={6}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Office Phone
                        </label>
                        <input
                          type="tel"
                          value={officePhone}
                          onChange={(e) => setOfficePhone(e.target.value)}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={7}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+256 700 000 000"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={8}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Bio
                        </label>
                        <textarea
                          value={bio}
                          onChange={(e) => setBio(e.target.value)}
                          rows={3}
                          placeholder="Dedicated educator with 15+ years of experience"
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Teaching Settings */}
              {activeTab === "teaching" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-blue-500" />
                        Teaching Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Default Class Duration (minutes)",
                          value: classDuration,
                          setter: setClassDuration,
                          type: "text",
                        },
                        {
                          label: "Preferred Teaching Mode",
                          value: teachingMode,
                          setter: setTeachingMode,
                          type: "select",
                          options: ["In-person", "Online", "Hybrid"],
                        },
                        {
                          label: "Max Students per Class",
                          value: maxStudents,
                          setter: setMaxStudents,
                          type: "text",
                        },
                        {
                          label: "Grading Scale",
                          value: gradingScale,
                          setter: setGradingScale,
                          type: "select",
                          options: [
                            "Numerical (0-100)",
                            "Letter Grades (A-F)",
                            "Percentage",
                          ],
                        },
                      ].map((field, idx) => (
                        <motion.div
                          key={field.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-foreground">
                            {field.label}
                          </label>
                          {field.type === "select" ? (
                            <select
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                            />
                          )}
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Class Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Enable Attendance Tracking",
                          checked: attendanceTracking,
                          setter: setAttendanceTracking,
                        },
                        {
                          label: "Allow Late Submissions",
                          checked: lateSubmissions,
                          setter: setLateSubmissions,
                        },
                        {
                          label: "Require Assignment Rubrics",
                          checked: assignmentRubrics,
                          setter: setAssignmentRubrics,
                        },
                        {
                          label: "Enable Peer Review",
                          checked: peerReview,
                          setter: setPeerReview,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 4}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40 cursor-pointer"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Email Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "New Student Submissions",
                          checked: emailNewSubmissions,
                          setter: setEmailNewSubmissions,
                        },
                        {
                          label: "Grade Requests",
                          checked: emailGradeRequests,
                          setter: setEmailGradeRequests,
                        },
                        {
                          label: "Assignment Deadlines",
                          checked: emailDeadlines,
                          setter: setEmailDeadlines,
                        },
                        {
                          label: "Student Messages",
                          checked: emailMessages,
                          setter: setEmailMessages,
                        },
                        {
                          label: "Class Announcements",
                          checked: emailAnnouncements,
                          setter: setEmailAnnouncements,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-primary" />
                        Other Notifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Push Notifications on Mobile",
                          checked: pushNotifications,
                          setter: setPushNotifications,
                        },
                        {
                          label: "In-App Notifications",
                          checked: inAppNotifications,
                          setter: setInAppNotifications,
                        },
                        {
                          label: "Digest Email (Weekly)",
                          checked: digestEmail,
                          setter: setDigestEmail,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 5}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Grading Settings */}
              {activeTab === "grading" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Grading System
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Default Grading Scale",
                          value: defaultGradingScale,
                          setter: setDefaultGradingScale,
                          type: "select",
                          options: [
                            "Numerical (0-100)",
                            "Letter Grades (A-F)",
                            "Percentage",
                          ],
                        },
                        {
                          label: "Late Submission Penalty (%)",
                          value: latePenalty,
                          setter: setLatePenalty,
                          type: "text",
                        },
                        {
                          label: "Minimum Passing Grade",
                          value: minPassingGrade,
                          setter: setMinPassingGrade,
                          type: "text",
                        },
                        {
                          label: "Grade Rounding Method",
                          value: roundingMethod,
                          setter: setRoundingMethod,
                          type: "select",
                          options: ["Round Up", "Round Down", "Round Nearest"],
                        },
                      ].map((field, idx) => (
                        <motion.div
                          key={field.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx}
                          className="space-y-2"
                        >
                          <label className="text-sm font-semibold text-foreground">
                            {field.label}
                          </label>
                          {field.type === "select" ? (
                            <select
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            >
                              {field.options?.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => field.setter(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                          )}
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Grade Display
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Show Detailed Feedback to Students",
                          checked: showFeedback,
                          setter: setShowFeedback,
                        },
                        {
                          label: "Allow Grade Disputes",
                          checked: allowDisputes,
                          setter: setAllowDisputes,
                        },
                        {
                          label: "Publish Grades by Date",
                          checked: publishByDate,
                          setter: setPublishByDate,
                        },
                        {
                          label: "Show Class Average",
                          checked: showClassAverage,
                          setter: setShowClassAverage,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 4}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Appearance Settings */}
              {activeTab === "appearance" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Display Preferences
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Color Theme
                        </label>
                        <select
                          value={colorTheme}
                          onChange={(e) => setColorTheme(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        >
                          <option>Auto</option>
                          <option>Light</option>
                          <option>Dark</option>
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Dashboard Layout
                        </label>
                        <select
                          value={dashboardLayout}
                          onChange={(e) => setDashboardLayout(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        >
                          <option>Compact</option>
                          <option>Comfortable</option>
                          <option>Spacious</option>
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Font Size
                        </label>
                        <select
                          value={fontSize}
                          onChange={(e) => setFontSize(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        >
                          <option>Small</option>
                          <option>Medium</option>
                          <option>Large</option>
                        </select>
                      </motion.div>

                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        >
                          <option>English</option>
                          <option>Spanish</option>
                          <option>French</option>
                          <option>German</option>
                        </select>
                      </motion.div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-primary" />
                        Interface Options
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={4}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={showSidebar}
                          onChange={(e) => setShowSidebar(e.target.checked)}
                          className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                        />
                        <span className="font-medium text-foreground">
                          Show Sidebar on Home
                        </span>
                      </motion.label>

                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={5}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={animateTransitions}
                          onChange={(e) =>
                            setAnimateTransitions(e.target.checked)
                          }
                          className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                        />
                        <span className="font-medium text-foreground">
                          Animate Transitions
                        </span>
                      </motion.label>

                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={6}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={compactMode}
                          onChange={(e) => setCompactMode(e.target.checked)}
                          className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                        />
                        <span className="font-medium text-foreground">
                          Compact Mode
                        </span>
                      </motion.label>

                      <motion.label
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={7}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={showTooltips}
                          onChange={(e) => setShowTooltips(e.target.checked)}
                          className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                        />
                        <span className="font-medium text-foreground">
                          Show Helper Tooltips
                        </span>
                      </motion.label>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Privacy & Security */}
              {activeTab === "privacy" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-6"
                >
                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary" />
                        Password & Security
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={0}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Current Password
                        </label>
                        <input
                          type="password"
                          placeholder="Enter your current password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={1}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          New Password
                        </label>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>
                      <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={2}
                        className="space-y-2"
                      >
                        <label className="text-sm font-semibold text-foreground">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-lg border border-border/60 bg-muted/30 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        />
                      </motion.div>
                      <motion.button
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        custom={3}
                        onClick={handlePasswordUpdate}
                        disabled={updatingPassword}
                        className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber to-amber-dark text-navy font-semibold shadow-glow transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatingPassword ? "Updating..." : "Update Password"}
                      </motion.button>
                    </CardContent>
                  </Card>

                  <Card className="border-border/60 bg-card/70 backdrop-blur-lg backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-teal/10 border-b border-border/60">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Account Privacy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {[
                        {
                          label: "Make Profile Visible to Students",
                          checked: profileVisible,
                          setter: setProfileVisible,
                        },
                        {
                          label: "Show Email to Enrolled Students",
                          checked: showEmail,
                          setter: setShowEmail,
                        },
                        {
                          label: "Enable Two-Factor Authentication",
                          checked: twoFactorAuth,
                          setter: setTwoFactorAuth,
                        },
                        {
                          label: "Login Alerts",
                          checked: loginAlerts,
                          setter: setLoginAlerts,
                        },
                      ].map((option, idx) => (
                        <motion.label
                          key={option.label}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          custom={idx + 4}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={option.checked}
                            onChange={(e) => option.setter(e.target.checked)}
                            className="w-5 h-5 rounded border-primary/50 text-primary focus:ring-2 focus:ring-primary/40"
                          />
                          <span className="font-medium text-foreground">
                            {option.label}
                          </span>
                        </motion.label>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-red-500/30 bg-card/70 backdrop-blur-lg overflow-hidden hover:shadow-xl transition-all">
                    <CardHeader className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-b border-red-500/30">
                      <CardTitle className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        Danger Zone
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        These actions are permanent and cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        className="w-full bg-red-600 hover:bg-red-700"
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                      >
                        {deletingAccount ? "Deleting..." : "Delete Account"}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Save Button */}
              <div className="sticky bottom-20 md:bottom-0 flex gap-3">
                <Button
                  className="flex-1 bg-gradient-to-r from-amber to-amber-dark text-navy shadow-glow hover:opacity-90 transition-all gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSave}
                  disabled={savingProfile}
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  className="border-border/60 hover:bg-muted/50 gap-2"
                  onClick={() => hydrateProfile(savedProfile || profile)}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              {/* Success Message */}
              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="fixed bottom-32 md:bottom-8 right-6 bg-emerald text-navy px-6 py-3 rounded-lg shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  Settings saved successfully!
                </motion.div>
              )}
            </motion.div>
          </div>
      </main>

      <LecturerBottomNav />
    </div>
  );
}
