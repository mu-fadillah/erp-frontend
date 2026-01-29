import React, { useEffect, useState } from 'react';

export default function PrNotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Fetch data PR yang pending dari backend [cite: 2026-01-25]
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/purchasing/pr/pending`)
      .then(res => res.json())
      .then(data => setCount(data.length));
  }, []);

  if (count === 0) return null;

  return (
    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
      {count} Baru
    </span>
  );
}