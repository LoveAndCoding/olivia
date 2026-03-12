import { BottomNav } from '../components/bottom-nav';
import { MemoryView } from '../components/screens/MemoryView';

export function MemoryPage() {
  return (
    <div className="screen">
      <MemoryView categories={[]} />
      <BottomNav activeTab="memory" />
    </div>
  );
}
