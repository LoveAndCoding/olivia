import { useNavigate } from '@tanstack/react-router';
import { BottomNav } from '../components/bottom-nav';
import { OliviaView } from '../components/screens/OliviaView';

export function OliviaPage() {
  const navigate = useNavigate();

  return (
    <div className="screen">
      <OliviaView onOpenReminders={() => void navigate({ to: '/reminders' })} />
      <BottomNav activeTab="olivia" />
    </div>
  );
}
