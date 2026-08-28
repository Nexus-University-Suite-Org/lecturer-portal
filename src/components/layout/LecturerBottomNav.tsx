import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  Mail,
  CheckCircle2,
  User,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const lecturerNavItems = [
  { label: "Home", href: "/lecturer", icon: Home },
  { label: "Courses", href: "/lecturer/courses", icon: BookOpen },
  { label: "Quizzes", href: "/lecturer/quiz", icon: HelpCircle },
  { label: "Messages", href: "/lecturer/messages", icon: Mail },
  { label: "Profile", href: "/profile", icon: User },
];

export function LecturerBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {lecturerNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                  isActive && "bg-primary/10"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "scale-110")} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
