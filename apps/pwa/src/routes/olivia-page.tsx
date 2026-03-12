import { BottomNav } from '../components/bottom-nav';
import { OliviaView } from '../components/screens/OliviaView';

export function OliviaPage() {
  return (
    <div className="screen">
      <OliviaView />
      <BottomNav activeTab="olivia" />
    </div>
  );
}
