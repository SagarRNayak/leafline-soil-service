import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import {
  LayoutDashboard,
  FlaskConical,
  FileSpreadsheet,
  AlertTriangle,
  History,
  Edit3,
  Microscope,
  ShieldAlert,
  Users,
  Settings,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;

  const navItems = [
    {
      label: 'Main Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['field_operator', 'agronomist', 'researcher', 'farmer', 'administrator'],
    },
    {
      label: 'Submit Sample',
      path: '/submit-sample',
      icon: FlaskConical,
      roles: ['field_operator', 'administrator'],
      badge: 'Operator'
    },
    {
      label: 'Analysis Results',
      path: '/analysis-results',
      icon: FileSpreadsheet,
      roles: ['field_operator', 'agronomist', 'farmer', 'administrator'],
    },
    {
      label: 'Nutrient Deficiency & Excess',
      path: '/deficiencies',
      icon: AlertTriangle,
      roles: ['agronomist', 'field_operator', 'administrator'],
      badge: 'AI View'
    },
    {
      label: 'Soil History',
      path: '/history',
      icon: History,
      roles: ['field_operator', 'agronomist', 'researcher', 'farmer', 'administrator'],
    },
    {
      label: 'Sample Correction',
      path: '/sample-correction',
      icon: Edit3,
      roles: ['field_operator', 'administrator'],
      badge: '7-Day'
    },
    {
      label: 'Researcher Dashboard',
      path: '/researcher',
      icon: Microscope,
      roles: ['researcher', 'administrator'],
      badge: 'Anon'
    },
    {
      label: 'Administrator Panel',
      path: '/admin',
      icon: ShieldAlert,
      roles: ['administrator'],
      badge: 'Admin'
    },
  ];

  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(role));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-200">
        <NavLink to="/">
          <Logo />
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-forest-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="rounded-md bg-forest-100 px-1.5 py-0.5 text-[10px] font-semibold text-forest-800">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 p-4 bg-slate-50">
        <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs text-slate-600">
          <div className="font-semibold text-slate-800 flex items-center justify-between">
            <span>Sunflower Starting Limits</span>
            <span className="text-[10px] text-leaf-600 font-bold">V1.0</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            NPK, pH & moisture rules configured as per Sunflower specification.
          </p>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
