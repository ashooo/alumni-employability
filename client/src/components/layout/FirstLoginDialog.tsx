import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ClipboardCheck, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function FirstLoginDialog() {
  const [open, setOpen] = useState(true);
  const { completeFirstLogin, updateUser, user } = useAuth();
  const navigate = useNavigate();

  const markPromptSeen = () => {
    completeFirstLogin();

    if (user?.survey) {
      updateUser({
        survey: {
          ...user.survey,
          isFirstLogin: false
        }
      });
    }
  };

  const handleSurveyNow = () => {
    markPromptSeen();
    setOpen(false);
    navigate('/app/alumni/survey');
  };

  const handleLater = () => {
    markPromptSeen();
    setOpen(false);
    navigate('/app/alumni/dashboard');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Welcome!</DialogTitle>
          <DialogDescription>
            Thank you for activating your account. We&apos;ll start with a short employment-status
            check, then guide you to the correct survey path.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex flex-col gap-3">
          <Button className="gap-2" onClick={handleSurveyNow}>
            <ClipboardCheck className="h-4 w-4" /> Start Survey Now
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleLater}>
            <Clock className="h-4 w-4" /> Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
