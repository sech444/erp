'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Package, Hammer, HardHat,
  ClipboardList, Wallet, BookOpen, Building2, Bell,
  FolderOpen, ChevronDown, ChevronRight, LogOut,
  Menu, X, ShieldCheck, Car, BarChart3, DollarSign,
  TrendingUp, FileText, Wrench
} from 'lucide-react';
import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';

const NAV = [
  { label: 'Dashboard',       href: '/dashboard',          icon: LayoutDashboard },
  {
    label: 'CRM & Sales',     icon: TrendingUp,
    children: [
      { label: 'Leads & Pipeline', href: '/sales/leads' },
      { label: 'Clients',          href: '/sales/clients' },
      { label: 'Quotations',       href: '/sales/quotations' },
      { label: 'Analytics',        href: '/sales/analytics' },
    ],
  },
  {
    label: 'Projects',        icon: HardHat,
    children: [
      { label: 'All Projects',     href: '/projects' },
      { label: 'BOQ Management',   href: '/projects/boq' },
      { label: 'Work Orders',      href: '/projects/work-orders' },
      { label: 'Site Reports',     href: '/projects/site-reports' },
      { label: 'Drawing Analysis', href: '/projects/drawings' },
    ],
  },
  {
    label: 'Inventory',       icon: Package,
    children: [
      { label: 'Materials',        href: '/inventory/materials' },
      { label: 'Stock In / Out',   href: '/inventory/movements' },
      { label: 'Low Stock Alerts', href: '/inventory/alerts' },
      { label: 'Suppliers',        href: '/inventory/suppliers' },
      { label: 'Reports',          href: '/inventory/reports' },
    ],
  },
  {
    label: 'Purchasing',      icon: ClipboardList,
    children: [
      { label: 'Purchase Orders',   href: '/purchasing/orders' },
      { label: 'Requests',          href: '/purchasing/requests' },
      { label: 'Supplier Payments', href: '/purchasing/payments' },
    ],
  },
  { label: 'Subcontractors', href: '/subcontractors', icon: Hammer },
  {
    label: 'HR & Payroll',    icon: Users,
    children: [
      { label: 'Employees',        href: '/hr/employees' },
      { label: 'Attendance',       href: '/hr/attendance' },
      { label: 'Leave Requests',   href: '/hr/leave' },
      { label: 'Payroll',          href: '/hr/payroll' },
      { label: 'Performance',      href: '/hr/performance' },
      { label: 'Document Expiry',  href: '/hr/expiry' },
    ],
  },
  {
    label: 'Vehicles',        icon: Car,
    children: [
      { label: 'Fleet',            href: '/vehicles' },
      { label: 'Fuel Logs',        href: '/vehicles/fuel' },
      { label: 'Maintenance',      href: '/vehicles/maintenance' },
    ],
  },
  { label: 'Petty Cash',     href: '/petty-cash',  icon: Wallet },
  {
    label: 'Accounting',      icon: BookOpen,
    children: [
      { label: 'Chart of Accounts', href: '/accounting/accounts' },
      { label: 'Journal Entries',   href: '/accounting/journal' },
      { label: 'Invoices',          href: '/accounting/invoices' },
      { label: 'Payments',          href: '/accounting/payments' },
      { label: 'Retention',         href: '/accounting/retention' },
      { label: 'Bank Accounts',     href: '/accounting/bank' },
      { label: 'VAT Returns',       href: '/accounting/vat' },
    ],
  },
  {
    label: 'Financial Reports', icon: BarChart3,
    children: [
      { label: 'Profit & Loss',    href: '/reports/profit-loss' },
      { label: 'AR Aging',         href: '/reports/ar-aging' },
      { label: 'Project Profit',   href: '/reports/project-profit' },
    ],
  },
  { label: 'Documents',      href: '/documents',   icon: FolderOpen },
  { label: 'Warranties',     href: '/warranties',  icon: ShieldCheck },
  { label: 'Notifications',  href: '/notifications', icon: Bell },
];

function NavItem({ item }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(() =>
    item.children?.some(c => pathname.startsWith(c.href)) || false
  );
  const hasChildren = item.children?.length > 0;
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + '/')
    : item.children?.some(c => pathname.startsWith(c.href));
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={clsx(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          {Icon && <Icon size={17} className="shrink-0" />}
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {open && (
          <div className="ml-6 mt-0.5 border-l border-slate-200 pl-3 space-y-0.5">
            {item.children.map(child => (
              <Link
                key={child.href}
                href={child.href}
                className={clsx(
                  'block px-3 py-1.5 rounded-md text-sm transition-colors',
                  pathname === child.href || pathname.startsWith(child.href + '/')
                    ? 'text-blue-700 bg-blue-50 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                )}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={clsx(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      {Icon && <Icon size={17} className="shrink-0" />}
      {item.label}
    </Link>
  );
}

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const isAuthPage = pathname === '/login';
  if (isAuthPage) return <>{children}</>;

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Sidebar */}
      <aside className={clsx(
        'flex flex-col bg-white border-r border-slate-200 transition-all duration-200 shrink-0 z-20',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100 shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Building2 size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm">TechServ ERP</p>
            <p className="text-xs text-slate-400 truncate">Construction & Waterproofing</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map(item => <NavItem key={item.label} item={item} />)}
        </nav>

        {/* User footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <Users size={14} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name || 'Loading…'}</p>
            <p className="text-xs text-slate-400">{user?.role || ''}</p>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb */}
          <div className="flex-1 text-sm text-slate-500">
            {pathname.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i}>
                <span className={i === arr.length - 1 ? 'text-slate-800 font-medium capitalize' : 'capitalize'}>
                  {seg.replace(/-/g, ' ')}
                </span>
                {i < arr.length - 1 && <span className="mx-1.5 text-slate-300">/</span>}
              </span>
            ))}
          </div>

          <Link href="/notifications" className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
