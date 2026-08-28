import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Users, BookOpen, Play } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CourseCardProps {
  id: string;
  title: string;
  code: string;
  instructor: string;
  thumbnail?: string;
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  students?: number;
  nextClass?: string;
  isLive?: boolean;
  delay?: number;
}

export function CourseCard({
  id,
  title,
  code,
  instructor,
  thumbnail,
  progress = 0,
  totalLessons = 12,
  completedLessons = 0,
  students = 45,
  nextClass,
  isLive = false,
  delay = 0,
}: CourseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Link
        to={`/courses/${id}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-card hover-lift"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-hero">
              <BookOpen className="h-12 w-12 text-primary-foreground/50" />
            </div>
          )}
          
          {/* Live indicator */}
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-coral text-white text-xs font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              LIVE
            </div>
          )}

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 group-hover:bg-foreground/20 transition-colors">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100">
              <Play className="h-6 w-6 ml-1" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <Badge variant="secondary" className="mb-2 text-xs">
              {code}
            </Badge>
            <h3 className="font-display text-lg font-semibold text-foreground line-clamp-2 group-hover:text-secondary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{instructor}</p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {completedLessons}/{totalLessons} lessons
              </span>
              <span className="font-medium text-secondary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 pt-2 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{students}</span>
            </div>
            {nextClass && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{nextClass}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
