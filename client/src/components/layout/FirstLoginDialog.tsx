import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ClipboardCheck, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function FirstLoginDialog() {
  const [open, setOpen] = useState(true);
  const { completeFirstLogin } = useAuth();
  const navigate = useNavigate();

  const handleSurveyNow = () => {
    completeFirstLogin();
    setOpen(false);
    navigate('/app/alumni/survey');
  };

  const handleLater = () => {
    completeFirstLogin();
    setOpen(false);
    navigate('/app/alumni/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Welcome! 🎓</DialogTitle>
          <DialogDescription>Thank you for activating your account. To help us track alumni employability, please complete the Tracer Survey.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button className="gap-2" onClick={handleSurveyNow}>
            <ClipboardCheck className="h-4 w-4" /> Take Tracer Survey Now
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleLater}>
            <Clock className="h-4 w-4" /> Take Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
