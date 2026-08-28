import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  BarChart3,
  FileText,
  HelpCircle,
  Users,
  MessageCircle,
  Target,
  User,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/contexts/SiteSettingsContext";
import { GraduationCap } from "lucide-react";

const lecturerNavItems = [
  { label: "Dashboard", href: "/lecturer", icon: BookOpen },
  { label: "My Courses", href: "/lecturer/courses", icon: BookOpen },
  { label: "Grades", href: "/lecturer/gradebook", icon: BarChart3 },
  { label: "Assignments", href: "/lecturer/assignments", icon: FileText },
  { label: "Quizzes", href: "/lecturer/quiz", icon: HelpCircle },
  { label: "Enrollments", href: "/lecturer/enrollments", icon: Users },
  {
    label: "Announcements",
    href: "/lecturer/announcements",
    icon: MessageCircle,
  },
  { label: "Roster", href: "/lecturer/roster", icon: Users },
  { label: "Analytics", href: "/lecturer/analytics", icon: Target },
  { label: "ID Card", href: "/lecturer/id-card", icon: User },
  { label: "Settings", href: "/lecturer/settings", icon: Settings },
];

export function LecturerSidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  if (!user) return null;

  return (
    <div className="fixed left-0 top-0 z-40 h-full w-64 bg-card border-r border-border shadow-lg">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-center border-b border-border px-4">
          <Link to="/lecturer" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground transition-transform group-hover:scale-105 shadow-lg">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={`${settings.siteName} logo`}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <GraduationCap className="h-6 w-6" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold text-foreground">
                {settings.shortName}
              </span>
              <span className="text-xs text-muted-foreground">Lecturer</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {lecturerNavItems.map((item, index) => {
              const isActive = location.pathname === item.href;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 ${
                      isActive
                        ? "bg-primary/15 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
