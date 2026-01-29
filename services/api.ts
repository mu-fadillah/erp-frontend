/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = 'http://localhost:3000';

export const getStocks = async () => {
  const response = await fetch(`${API_URL}/stock`);
  if (!response.ok) throw new Error('Gagal mengambil data stok');
  return response.json();
};

export const runProduction = async (productId: string, quantity: number) => {
  const response = await fetch(`${API_URL}/production`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Gagal menjalankan produksi');
  }
  return response.json();
};

export const createSalesOrder = async (data: { customerName: string, items: any[] }) => {
  const response = await fetch(`${API_URL}/sales-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Gagal memproses penjualan');
  return response.json();
};

export const getSalesHistory = async () => {
  const response = await fetch(`${API_URL}/sales-order`);
  if (!response.ok) throw new Error('Gagal mengambil riwayat penjualan');
  return response.json();
};

export const updateStock = async (productId: string, quantity: number) => {
  const response = await fetch(`${API_URL}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity }),
  });
  if (!response.ok) throw new Error('Gagal memperbarui stok');
  return response.json();
};