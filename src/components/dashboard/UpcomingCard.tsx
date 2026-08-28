import { motion } from 'framer-motion';
import { Calendar, Clock, Video, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EventType = 'class' | 'assignment' | 'quiz' | 'deadline';

interface UpcomingCardProps {
  type: EventType;
  title: string;
  course: string;
  time: string;
  date: string;
  meetLink?: string;
  isUrgent?: boolean;
  delay?: number;
}

export function UpcomingCard({
  type,
  title,
  course,
  time,
  date,
  meetLink,
  isUrgent = false,
  delay = 0,
}: UpcomingCardProps) {
  const typeConfig = {
    class: {
      icon: Video,
      color: 'text-teal bg-teal/10',
      label: 'Live Class',
    },
    assignment: {
      icon: FileText,
      color: 'text-secondary bg-secondary/10',
      label: 'Assignment Due',
    },
    quiz: {
      icon: AlertCircle,
      color: 'text-lavender bg-lavender/10',
      label: 'Quiz',
    },
    deadline: {
      icon: Clock,
      color: 'text-coral bg-coral/10',
      label: 'Deadline',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
      className={cn(
        "flex gap-4 p-4 rounded-xl border bg-card transition-all hover:shadow-md",
        isUrgent && "border-coral/50 bg-coral/5"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl",
        config.color
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground mb-0.5">
              {config.label} • {course}
            </p>
            <h4 className="font-medium text-foreground truncate">{title}</h4>
          </div>
          {isUrgent && (
            <span className="flex-shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase bg-coral text-white rounded-full">
              Soon
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{time}</span>
          </div>
        </div>

        {type === 'class' && meetLink && (
          <Button
            size="sm"
            className="mt-3 h-8 bg-teal hover:bg-teal-light text-white"
            onClick={(e) => {
              e.preventDefault();
              window.open(meetLink, '_blank');
            }}
          >
            <Video className="h-3.5 w-3.5 mr-1.5" />
            Join Now
          </Button>
        )}
      </div>
    </motion.div>
  );
}
