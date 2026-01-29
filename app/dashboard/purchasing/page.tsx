'use client';
import PrNotificationBadge from '@/app/purchasing/PrNotificationBadge';
import Link from 'next/link';

export default function PurchasingDashboard() {
  return (
    <div className="p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Purchasing Dashboard</h1>
        <div className="flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
          <span className="text-sm font-medium text-red-700">Permintaan Baru:</span>
          <PrNotificationBadge />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card Purchase Request */}
        <Link href="/dashboard/purchasing/pr-list" className="p-6 border rounded-xl hover:shadow-lg transition bg-white">
          <h2 className="text-xl font-semibold mb-2 text-blue-600">Purchase Request (PR)</h2>
          <p className="text-gray-600 text-sm">Ceklis dan filter barang yang diminta produksi.</p>
        </Link>

        {/* Card Purchase Order */}
        <Link href="/dashboard/purchasing/create-po" className="p-6 border rounded-xl hover:shadow-lg transition bg-white">
          <h2 className="text-xl font-semibold mb-2 text-green-600">Create PO</h2>
          <p className="text-gray-600 text-sm">Buat order resmi dan kirim otomatis via WhatsApp.</p>
        </Link>

        {/* Card Receiving */}
        <Link href="/dashboard/purchasing/receiving" className="p-6 border rounded-xl hover:shadow-lg transition bg-white">
          <h2 className="text-xl font-semibold mb-2 text-purple-600">Receiving</h2>
          <p className="text-gray-600 text-sm">Konfirmasi barang datang & upload foto surat jalan.</p>
        </Link>
      </div>
    </div>
  );
}