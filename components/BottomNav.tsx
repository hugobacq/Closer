"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const leftItems = [
  {
    href: "/home",
    label: "Accueil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/questions",
    label: "Questions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

const rightItems = [
  {
    href: "/calendar",
    label: "Calendrier",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Profil",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link href={href} className="flex items-center justify-center flex-1 py-3 transition-all">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${
          isActive ? "bg-rose-100 text-rose-500 scale-105" : "text-stone-400"
        }`}
      >
        {icon}
      </div>
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const isPhotoActive = pathname === "/photo";

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-lg border-t border-stone-100/80 z-50">
      <div className="flex items-center justify-around px-1 pt-2 pb-safe">
        {leftItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        {/* Bouton central Photo */}
        <div className="flex items-center justify-center flex-1 -mt-5">
          <Link
            href="/photo"
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
              isPhotoActive
                ? "bg-rose-600 shadow-rose-300"
                : "bg-rose-500 shadow-rose-200 hover:bg-rose-600"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </Link>
        </div>

        {rightItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
