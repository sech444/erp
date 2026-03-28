// 'use client';

// import Link from 'next/link';
// import { usePathname } from 'next/navigation';
// import { useState } from 'react';
// import {
//   LayoutDashboard, Users, FileText, Package, Hammer,
//   HardHat, ClipboardList, Truck, Wallet, BookOpen,
//   Receipt, Building2, Bell, FolderOpen, ChevronDown,
//   ChevronRight, LogOut, Menu, X, ShieldCheck, Car,
//   BarChart3, DollarSign, Calculator, Wrench
// } from 'lucide-react';
// import { clsx } from 'clsx';

// const NAV = [
//   {
//     label: 'Dashboard',
//     href: '/dashboard',
//     icon: LayoutDashboard,
//   },
//   {
//     label: 'CRM & Sales',
//     icon: Users,
//     children: [
//       { label: 'Leads & Pipeline', href: '/sales/leads' },
//       { label: 'Clients',         href: '/sales/clients' },
//       { label: 'Quotations',      href: '/sales/quotations' },
//       { label: 'Analytics',       href: '/sales/analytics' },
//     ],
//   },
//   {
//     label: 'Projects',
//     icon: HardHat,
//     children: [
//       { label: 'All Projects',    href: '/projects' },
//       { label: 'BOQ Management',  href: '/projects/boq' },
//       { label: 'Work Orders',     href: '/projects/work-orders' },
//       { label: 'Site Reports',    href: '/projects/site-reports' },
//       { label: 'Drawing Analysis', href: '/projects/drawings' },
//     ],
//   },
//   {
//     label: 'Inventory',
//     icon: Package,
//     children: [
//       { label: 'Materials',       href: '/inventory/materials' },
//       { label: 'Stock In / Out',  href: '/inventory/movements' },
//       { label: 'Low Stock Alerts', href: '/inventory/alerts' },
//       { label: 'Suppliers',       href: '/inventory/suppliers' },
//       { label: 'Reports',         href: '/inventory/reports' },
//     ],
//   },
//   {
//     label: 'Purchasing',
//     icon: ClipboardList,
//     children: [
//       { label: 'Purchase Orders', href: '/purchasing/orders' },
//       { label: 'Requests',        href: '/purchasing/requests' },
//       { label: 'Supplier Payments', href: '/purchasing/payments' },
//     ],
//   },
//   {
//     label: 'Subcontractors',
//     icon: Hammer,
//     href: '/subcontractors',
//   },
//   {
//     label: 'HR & Payroll',
//     icon: Users,
//     children: [
//       { label: 'Employees',       href: '/hr/employees' },
//       { label: 'Attendance',      href: '/hr/attendance' },
//       { label: 'Leave Requests',  href: '/hr/leave' },
//       { label: 'Payroll',         href: '/hr/payroll' },
//       { label: 'Performance',     href: '/hr/performance' },
//       { label: 'Document Expiry', href: '/hr/expiry' },
//     ],
//   },
//   {
//     label: 'Vehicles',
//     icon: Car,
//     children: [
//       { label: 'Fleet',           href: '/vehicles' },
//       { label: 'Fuel Logs',       href: '/vehicles/fuel' },
//       { label: 'Maintenance',     href: '/vehicles/maintenance' },
//     ],
//   },
//   {
//     label: 'Petty Cash',
//     icon: Wallet,
//     href: '/petty-cash',
//   },
//   {
//     label: 'Accounting',
//     icon: BookOpen,
//     children: [
//       { label: 'Chart of Accounts', href: '/accounting/accounts' },
//       { label: 'Journal Entries', href: '/accounting/journal' },
//       { label: 'Invoices',        href: '/accounting/invoices' },
//       { label: 'Payments',        href: '/accounting/payments' },
//       { label: 'Retention',       href: '/accounting/retention' },
//       { label: 'Bank Accounts',   href: '/accounting/bank' },
//       { label: 'VAT Returns',     href: '/accounting/vat' },
//     ],
//   },
//   {
//     label: 'Financial Reports',
//     icon: BarChart3,
//     children: [
//       { label: 'Profit & Loss',   href: '/reports/profit-loss' },
//       { label: 'AR Aging',        href: '/reports/ar-aging' },
//       { label: 'Project Profit',  href: '/reports/project-profit' },
//     ],
//   },
//   {
//     label: 'Documents',
//     icon: FolderOpen,
//     href: '/documents',
//   },
//   {
//     label: 'Warranties',
//     icon: ShieldCheck,
//     href: '/warranties',
//   },
//   {
//     label: 'Notifications',
//     icon: Bell,
//     href: '/notifications',
//   },
// ];

// function NavItem({ item, depth = 0 }) {
//   const pathname = usePathname();
//   const [open, setOpen] = useState(false);
//   const hasChildren = item.children?.length > 0;
//   const isActive = item.href ? pathname.startsWith(item.href) : item.children?.some(c => pathname.startsWith(c.href));
//   const Icon = item.icon;

//   if (hasChildren) {
//     return (
//       <div>
//         <button
//           onClick={() => setOpen(o => !o)}
//           className={clsx(
//             'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
//             isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
//           )}
//         >
//           {Icon && <Icon size={18} className="shrink-0" />}
//           <span className="flex-1 text-left">{item.label}</span>
//           {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
//         </button>
//         {open && (
//           <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-200 pl-3">
//             {item.children.map(child => (
//               <Link
//                 key={child.href}
//                 href={child.href}
//                 className={clsx(
//                   'block px-3 py-1.5 rounded-md text-sm transition-colors',
//                   pathname === child.href
//                     ? 'text-blue-700 bg-blue-50 font-medium'
//                     : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
//                 )}
//               >
//                 {child.label}
//               </Link>
//             ))}
//           </div>
//         )}
//       </div>
//     );
//   }

//   return (
//     <Link
//       href={item.href}
//       className={clsx(
//         'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
//         isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
//       )}
//     >
//       {Icon && <Icon size={18} className="shrink-0" />}
//       {item.label}
//     </Link>
//   );
// }

// export default function RootLayout({ children }) {
//   const [sidebarOpen, setSidebarOpen] = useState(true);

//   return (
//     <html lang="en">
//       <body className="bg-slate-50 text-slate-900 antialiased">
//         <div className="flex h-screen overflow-hidden">

//           {/* Sidebar */}
//           <aside className={clsx(
//             'flex flex-col bg-white border-r border-slate-200 transition-all duration-200 shrink-0',
//             sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
//           )}>
//             {/* Logo */}
//             <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100">
//               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
//                 <Building2 size={18} className="text-white" />
//               </div>
//               <div className="min-w-0">
//                 <p className="font-bold text-slate-900 text-sm truncate">TechServ ERP</p>
//                 <p className="text-xs text-slate-400">Construction & Waterproofing</p>
//               </div>
//             </div>

//             {/* Nav */}
//             <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
//               {NAV.map(item => (
//                 <NavItem key={item.label} item={item} />
//               ))}
//             </nav>

//             {/* User */}
//             <div className="border-t border-slate-100 px-4 py-3 flex items-center gap-3">
//               <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
//                 <Users size={14} className="text-slate-500" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <p className="text-sm font-medium text-slate-800 truncate">Admin</p>
//                 <p className="text-xs text-slate-400">ADMIN</p>
//               </div>
//               <button className="p-1 text-slate-400 hover:text-slate-600">
//                 <LogOut size={16} />
//               </button>
//             </div>
//           </aside>

//           {/* Main */}
//           <div className="flex-1 flex flex-col overflow-hidden">
//             {/* Topbar */}
//             <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 shrink-0">
//               <button
//                 onClick={() => setSidebarOpen(o => !o)}
//                 className="p-1 text-slate-500 hover:text-slate-700"
//               >
//                 {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
//               </button>
//               <div className="flex-1" />
//               <Link href="/notifications" className="p-2 text-slate-500 hover:text-slate-700 relative">
//                 <Bell size={20} />
//                 <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
//               </Link>
//             </header>

//             {/* Page content */}
//             <main className="flex-1 overflow-y-auto">
//               {children}
//             </main>
//           </div>
//         </div>
//       </body>
//     </html>
//   );
// }




import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata = {
  title: 'TechServ ERP',
  description: 'Construction & Waterproofing ERP System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}