'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Scan,
  Boxes,
  Layers,
  Package,
  ListOrdered,
  QrCode,
  History,
  Search,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Warehouse Scan', href: '/scan', icon: Scan },
  { label: 'Inventory', href: '/inventory', icon: Boxes },
  { label: 'Batches', href: '/batches', icon: Layers },
  { label: 'Kits', href: '/kits', icon: Package },
  { label: 'Products Master', href: '/products', icon: ListOrdered },
  { label: 'QR Generator', href: '/qr-generator', icon: QrCode },
  { label: 'Search QR', href: '/search', icon: Search },
  { label: 'Audit Activity', href: '/activity', icon: History },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 md:top-14 h-[calc(100vh)] md:h-[calc(100vh-3.5rem)] w-56 bg-white border-r border-[#E5E5E5] z-50 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="py-4">
          <div className="px-4 mb-3 text-[11px] font-bold text-[#888888] tracking-wider uppercase">
            Operations
          </div>
          <nav className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded transition ${
                    isActive
                      ? 'bg-black text-white font-semibold'
                      : 'text-[#333333] hover:bg-neutral-100 hover:text-black'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom System Status */}
        <div className="p-3 border-t border-[#E5E5E5] text-[11px] text-[#666666]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="font-semibold text-[#111111]">MongoDB Connected</span>
          </div>
          <div className="text-[10px] text-[#888888] mt-1 font-mono">
            Unique Index Safe
          </div>
        </div>
      </aside>
    </>
  );
}
