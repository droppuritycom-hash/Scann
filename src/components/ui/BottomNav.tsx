'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Scan, Boxes, Layers, Package } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const items = [
    { label: 'Home', href: '/', icon: LayoutDashboard },
    { label: 'Batches', href: '/batches', icon: Layers },
    { label: 'Scan', href: '/scan', icon: Scan, isPrimary: true },
    { label: 'Kits', href: '/kits', icon: Package },
    { label: 'Inventory', href: '/inventory', icon: Boxes },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E5E5] h-14 flex items-center justify-around px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        if (item.isPrimary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center -mt-4"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border ${
                  isActive
                    ? 'bg-black text-white border-black'
                    : 'bg-black text-white border-black'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5 text-[#111111]">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 ${
              isActive ? 'text-black font-bold' : 'text-[#666666]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] mt-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
