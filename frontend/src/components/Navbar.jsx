import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Activity, Bell, ChevronDown, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [healthStatus, setHealthStatus] = useState('healthy');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await api.get('/health');
        if (res.data.status === 'healthy') {
          setHealthStatus('healthy');
        }
      } catch (err) {
        setHealthStatus('degraded');
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'field_operator':
        return { label: 'Field Operator', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'agronomist':
        return { label: 'Agronomist', bg: 'bg-teal-50 text-teal-700 border-teal-200' };
      case 'researcher':
        return { label: 'Breeder / Researcher', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'farmer':
        return { label: 'Farmer', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'administrator':
        return { label: 'Administrator', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role || 'User', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        {/* Service 2 Indicator */}
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-forest-50 text-forest-800 border border-forest-200">
          <span className="h-1.5 w-1.5 rounded-full bg-forest-600 animate-pulse"></span>
          Service 2: Soil & Nutrient Intelligence
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* AWS & Service Health Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-600">
          <Activity className="h-3.5 w-3.5 text-leaf-600" />
          <span>API & AWS RDS:</span>
          <span className={`inline-flex items-center gap-1 ${healthStatus === 'healthy' ? 'text-emerald-600 font-semibold' : 'text-amber-600'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${healthStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            {healthStatus === 'healthy' ? 'Connected' : 'Degraded'}
          </span>
        </div>

        {/* User Card */}
        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-900 leading-tight">
                {user.fullName || user.email}
              </span>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-semibold text-forest-800 hover:text-forest-900 px-4 py-2 rounded-lg bg-forest-50 hover:bg-forest-100 border border-forest-200 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};
export default Navbar;
