/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from 'react';
import { getSalesHistory } from '../../services/api';
import Link from 'next/link';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getSalesHistory().then(setHistory).catch(console.error);
  }, []);

  // HITUNG TOTAL PENDAPATAN
  const totalRevenue = history.reduce((acc: number, order: any) => {
    const orderTotal = order.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    return acc + orderTotal;
  }, 0);

  return (
    <main className="p-10 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Riwayat Penjualan</h1>
          <p className="text-gray-500">Pantau semua transaksi masuk</p>
        </div>
        <Link href="/" className="bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
          ← Kembali ke Kasir
        </Link>
      </div>

      {/* WIDGET KEUANGAN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-green-600 rounded-2xl shadow-lg shadow-green-100 text-white">
          <p className="text-green-100 text-sm font-medium uppercase tracking-wider">Total Pendapatan</p>
          <h2 className="text-3xl font-bold mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</h2>
        </div>
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Total Transaksi</p>
          <h2 className="text-3xl font-bold mt-1 text-gray-800">{history.length}</h2>
        </div>
      </div>

      {/* TABEL DATA (Tetap sama seperti sebelumnya) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Tanggal</th>
              <th className="p-4 font-semibold text-gray-600">Pelanggan</th>
              <th className="p-4 font-semibold text-gray-600">Produk</th>
              <th className="p-4 font-semibold text-gray-600 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {history.map((order: any) => (
              <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4 text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleString('id-ID')}
                </td>
                <td className="p-4 font-medium text-gray-900">{order.customerName}</td>
                <td className="p-4">
                  {order.items.map((item: any) => (
                    <span key={item.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      {item.product.name} (x{item.quantity})
                    </span>
                  ))}
                </td>
                <td className="p-4 text-right font-bold text-gray-700">
                  Rp {(order.items.reduce((s: number, i: any) => s + (i.price * i.quantity), 0)).toLocaleString('id-ID')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}