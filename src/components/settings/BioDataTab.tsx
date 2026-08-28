import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Camera,
  Edit3,
  Save,
  X,
  Building,
  IdCard,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getBackend, postBackend } from "@/lib/backendApi";
import { useToast } from "@/hooks/use-toast";

export function BioDataTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    bio: "",
    student_number: "",
    department: "",
    college: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        bio: profile.bio || "",
        student_number: profile.student_number || "",
        department: profile.department || "",
        college: profile.college || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await postBackend(`/api/profiles/by-user/${user.uid}/`, {
        full_name: formData.full_name,
        phone: formData.phone,
        bio: formData.bio,
        department: formData.department,
        college: formData.college,
      });

      // Refetch profile to update global state
      const updatedProfile = await getBackend<any>(`/api/profiles/by-user/${user.uid}/`);

      if (updatedProfile) {
        setFormData({
          full_name: updatedProfile.full_name || "",
          email: updatedProfile.email || "",
          phone: updatedProfile.phone || "",
          bio: updatedProfile.bio || "",
          student_number: updatedProfile.student_number || "",
          department: updatedProfile.department || "",
          college: updatedProfile.college || "",
        });
      }

      // Profile updated
      setIsEditing(false);
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const profileFields = [
    {
      icon: IdCard,
      label: "Student Number",
      key: "student_number",
      editable: false,
    },
    { icon: Mail, label: "Email Address", key: "email", editable: false },
    { icon: Phone, label: "Phone Number", key: "phone", editable: true },
    { icon: Building, label: "Department", key: "department", editable: true },
    { icon: GraduationCap, label: "College", key: "college", editable: true },
  ];

  const getLastUpdatedLabel = () => {
    const updatedRaw = (profile as any)?.updated_at;
    if (!updatedRaw) return "Recently";

    const updatedDate =
      typeof updatedRaw?.toDate === "function"
        ? updatedRaw.toDate()
        : new Date(updatedRaw);

    if (!(updatedDate instanceof Date) || Number.isNaN(updatedDate.getTime())) {
      return "Recently";
    }

    return formatDistanceToNow(updatedDate, { addSuffix: true });
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/30 to-transparent rounded-full blur-3xl" />
        <CardContent className="pt-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar className="h-28 w-28 border-4 border-background shadow-xl">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {getInitials(formData.full_name)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center sm:text-left flex-1">
              <h2 className="text-2xl font-bold mb-1">{formData.full_name}</h2>
              <p className="text-muted-foreground mb-3">{formData.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Badge variant="outline">
                  {formData.student_number || "No Student ID"}
                </Badge>
                <Badge variant="secondary">
                  {formData.department || "No Department"}
                </Badge>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-0">
                  Active Student
                </Badge>
              </div>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={isSaving}
              className="gap-2"
            >
              {isEditing ? (
                isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Your basic profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                disabled={!isEditing}
                className={!isEditing ? "bg-muted" : ""}
              />
            </div>

            {profileFields.map((field, i) => (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="space-y-2"
              >
                <Label htmlFor={field.key} className="flex items-center gap-2">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                  {field.label}
                  {!field.editable && (
                    <Badge variant="outline" className="text-xs ml-auto">
                      Read-only
                    </Badge>
                  )}
                </Label>
                <Input
                  id={field.key}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) =>
                    setFormData({ ...formData, [field.key]: e.target.value })
                  }
                  disabled={!isEditing || !field.editable}
                  className={!isEditing || !field.editable ? "bg-muted" : ""}
                />
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Bio & Additional Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-secondary" />
                About Me
              </CardTitle>
              <CardDescription>Tell others about yourself</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                disabled={!isEditing}
                placeholder="Write a short bio about yourself..."
                className={`min-h-32 ${!isEditing ? "bg-muted" : ""}`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Member Since", value: "Active" },
                  {
                    label: "Last Updated",
                    value: getLastUpdatedLabel(),
                  },
                  { label: "Profile Status", value: "Complete" },
                  { label: "Account Type", value: "Student" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 rounded-xl bg-muted/50 text-center"
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="font-semibold text-sm">{stat.value}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isEditing && (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      Editing Mode Active
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Some fields like Student Number and Email cannot be
                      changed. Contact the registrar's office for official
                      changes.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-amber-600"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel Editing
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
