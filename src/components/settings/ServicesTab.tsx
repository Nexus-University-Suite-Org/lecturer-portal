import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, CreditCard, IdCard, BookCopy, Building2, 
  GraduationCap, Printer, Mail, Phone, MapPin, Clock,
  ChevronRight, ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  fee: number;
  processingTime: string;
  category: string;
  status?: 'available' | 'requested' | 'processing' | 'ready';
}

const services: Service[] = [
  {
    id: 'transcript',
    name: 'Academic Transcript',
    description: 'Official certified record of your academic performance',
    icon: FileText,
    fee: 50000,
    processingTime: '5-7 working days',
    category: 'Academic Documents',
    status: 'available'
  },
  {
    id: 'id_card',
    name: 'Student ID Card',
    description: 'New or replacement student identification card',
    icon: IdCard,
    fee: 25000,
    processingTime: '3-5 working days',
    category: 'Identification',
    status: 'available'
  },
  {
    id: 'certificate',
    name: 'Provisional Certificate',
    description: 'Temporary certificate before official graduation',
    icon: GraduationCap,
    fee: 75000,
    processingTime: '7-10 working days',
    category: 'Academic Documents',
    status: 'available'
  },
  {
    id: 'recommendation',
    name: 'Letter of Recommendation',
    description: 'Official recommendation letter from the university',
    icon: Mail,
    fee: 20000,
    processingTime: '5-7 working days',
    category: 'Official Letters',
    status: 'available'
  },
  {
    id: 'enrollment_letter',
    name: 'Enrollment Confirmation',
    description: 'Letter confirming your enrollment status',
    icon: BookCopy,
    fee: 15000,
    processingTime: '2-3 working days',
    category: 'Official Letters',
    status: 'available'
  },
  {
    id: 'bank_letter',
    name: 'Bank/Loan Letter',
    description: 'Official letter for bank or loan applications',
    icon: Building2,
    fee: 20000,
    processingTime: '2-3 working days',
    category: 'Official Letters',
    status: 'available'
  },
];

const officeLocations = [
  { name: 'Academic Registry', building: 'Senate Building', room: 'Ground Floor', hours: '8:00 AM - 5:00 PM' },
  { name: 'Finance Office', building: 'Administration Block', room: 'Room 102', hours: '8:30 AM - 4:30 PM' },
  { name: 'Student Affairs', building: 'Lincoln House', room: 'First Floor', hours: '8:00 AM - 5:00 PM' },
];

export function ServicesTab() {
  const { toast } = useToast();
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const requestService = (service: Service) => {
    toast({
      title: "Service Requested",
      description: `Your request for ${service.name} has been submitted. Generate a PRN to make payment.`,
    });
    setSelectedService(service.id);
  };

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) acc[service.category] = [];
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  return (
    <div className="space-y-6">
      {/* Services Header */}
      <Card className="bg-gradient-to-r from-accent/10 via-transparent to-primary/10">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                <Printer className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">University Services</h3>
                <p className="text-sm text-muted-foreground">Request documents and official letters</p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              {services.length} Services Available
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Service Categories */}
      {Object.entries(groupedServices).map(([category, categoryServices]) => (
        <div key={category} className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {category}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryServices.map((service, i) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow group">
                  <CardContent className="pt-6 h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <service.icon className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        UGX {service.fee.toLocaleString()}
                      </Badge>
                    </div>
                    <h4 className="font-semibold mb-2">{service.name}</h4>
                    <p className="text-sm text-muted-foreground mb-4 flex-grow">{service.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Clock className="h-3 w-3" />
                      {service.processingTime}
                    </div>
                    <Button 
                      onClick={() => requestService(service)} 
                      className="w-full gap-2"
                      variant={selectedService === service.id ? "secondary" : "default"}
                    >
                      {selectedService === service.id ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Requested
                        </>
                      ) : (
                        <>
                          Request Service
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ))}

      {/* Office Locations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-secondary" />
            Office Locations
          </CardTitle>
          <CardDescription>Where to collect your documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {officeLocations.map((office, i) => (
              <motion.div
                key={office.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <h4 className="font-semibold text-sm mb-1">{office.name}</h4>
                <p className="text-xs text-muted-foreground mb-2">
                  {office.building} • {office.room}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {office.hours}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Important Notes */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-2">Important Information</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Payment must be completed before document processing begins</li>
                <li>• Bring your student ID when collecting documents</li>
                <li>• Processing times may vary during peak periods</li>
                <li>• Contact the relevant office for express processing options</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
