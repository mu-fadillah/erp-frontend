import PrNotificationBadge from './purchasing/PrNotificationBadge';

export default function Sidebar() {
  return (
    <nav>
      <a href="/dashboard/purchasing">
        Menu Purchasing 
        {/* Badge akan muncul di samping tulisan Menu [cite: 2026-01-25] */}
        <PrNotificationBadge />
      </a>
    </nav>
  );
}