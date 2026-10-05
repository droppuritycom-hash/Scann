'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QrCode, Search, Menu, X, ArrowRight, Scan } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function Navbar({ onToggleSidebar, isSidebarOpen }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim().toUpperCase())}`);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E5E5E5] h-14">
      <div className="flex items-center justify-between h-full px-4 max-w-7xl mx-auto">
        {/* Left: Mobile Menu Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-[#111111] hover:bg-neutral-100 rounded"
            aria-label="Toggle Navigation"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-base text-[#111111]">
            <div className="w-7 h-7 bg-black text-white rounded flex items-center justify-center font-mono text-sm">
              QR
            </div>
            <span className="hidden sm:inline">INVENTORY ERP</span>
          </Link>
        </div>

        {/* Center: Universal Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search serial, batch, or kit..."
              className="w-full bg-[#FAFAFA] border border-[#E5E5E5] rounded pl-8 pr-3 py-1.5 text-xs text-[#111111] placeholder:text-[#888888] focus:bg-white focus:outline-none focus:border-black font-mono transition"
            />
            <Search className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </form>

        {/* Right: Quick Action Scan Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/scan"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded hover:bg-neutral-800 transition"
          >
            <Scan className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Scan</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
