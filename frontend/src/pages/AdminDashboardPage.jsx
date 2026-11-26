import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  ShieldAlert,
  UserCheck,
  UserX,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  RefreshCw,
  Clock,
  Plus
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('users'); // users, assignments, audit, health
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [healthInfo, setHealthInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  // New assignment form state
  const [newUserId, setNewUserId] = useState('');
  const [newFieldId, setNewFieldId] = useState('fld_0412');
  const [newRole, setNewRole] = useState('field_operator');

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const [uRes, aRes, logRes, hRes] = await Promise.all([
        api.get('/auth/admin/users'),
        api.get('/api/v1/soil/assignments'),
        api.get('/auth/admin/audit-logs?size=30'),
        api.get('/health')
      ]);
      setUsers(uRes.data);
      setAssignments(aRes.data);
      setAuditLogs(logRes.data.items);
      setHealthInfo(hRes.data);
      if (uRes.data.length > 0) {
        setNewUserId(uRes.data[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load administrative data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleApproveUser = async (userId) => {
    try {
      await api.post(`/auth/admin/users/${userId}/approve`);
      setMsg(`User approved successfully.`);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Approval failed.');
    }
  };

  const handleRejectUser = async (userId) => {
    try {
      await api.post(`/auth/admin/users/${userId}/reject`);
      setMsg(`User registration rejected.`);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Rejection failed.');
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/v1/soil/assignments', {
        userId: newUserId,
        fieldId: newFieldId,
        role: newRole
      });
      setMsg(`Assigned user to field ${newFieldId}.`);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Assignment failed.');
    }
  };

  const handleRevokeAssignment = async (assignId) => {
    try {
      await api.delete(`/api/v1/soil/assignments/${assignId}`);
      setMsg(`Assignment revoked.`);
      loadAllData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Revocation failed.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-forest-950 sm:text-3xl">Administrator Control Center</h1>
          <p className="mt-1 text-xs text-slate-500">
            User access governance, field assignments, system health verification, and immutable activity audit.
          </p>
        </div>

        <button
          onClick={loadAllData}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Security Notice Pill */}
      <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 text-xs text-purple-900 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0 text-purple-600 mt-0.5" />
        <div>
          <span className="font-bold">Role Limitation (Section 2.2 & 4.J):</span>
          <p className="mt-0.5 text-purple-800">
            Administrators manage accounts and field links. To preserve scientific integrity, administrators CANNOT modify or alter soil measurement records.
          </p>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800 flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        {[
          { id: 'users', label: 'User Approvals', icon: UserCheck, count: users.filter(u => !u.isApproved).length },
          { id: 'assignments', label: 'Field Assignments', icon: Layers, count: assignments.length },
          { id: 'audit', label: 'Activity Logs', icon: FileText, count: auditLogs.length },
          { id: 'health', label: 'System Health', icon: Activity }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-forest-900 text-forest-950 bg-slate-50/50 rounded-t-xl'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-forest-900 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USER REGISTRATION APPROVALS */}
      {activeTab === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-base font-bold text-forest-950">Registration Access Control</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review new accounts. Field Operators, Agronomists, and Researchers require manual authorization.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Organisation</th>
                  <th className="py-3 px-4">Requested Role</th>
                  <th className="py-3 px-4">Email Verified</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Decision Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                    <td className="py-3 px-4 font-mono">{u.email}</td>
                    <td className="py-3 px-4">{u.organisation}</td>
                    <td className="py-3 px-4">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {u.isVerified ? (
                        <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {u.isApproved ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                          Active & Approved
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                          Awaiting Approval
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {!u.isApproved ? (
                        <>
                          <button
                            onClick={() => handleApproveUser(u.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(u.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-sm"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRejectUser(u.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-semibold"
                        >
                          Revoke Access
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FIELD ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          {/* Create Assignment Form */}
          <form onSubmit={handleCreateAssignment} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-forest-950 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-leaf-600" />
              <span>Assign User to Field</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select User</label>
                <select
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field ID</label>
                <input
                  type="text"
                  required
                  value={newFieldId}
                  onChange={(e) => setNewFieldId(e.target.value)}
                  placeholder="fld_0412"
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Field Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2 px-3 text-xs bg-white"
                >
                  <option value="field_operator">Field Operator</option>
                  <option value="agronomist">Agronomist</option>
                  <option value="farmer">Farmer</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-forest-900 py-2 px-4 text-xs font-bold text-white shadow hover:bg-forest-800 transition-all"
                >
                  Create Field Link
                </button>
              </div>
            </div>
          </form>

          {/* Assignments Table */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-base font-bold text-forest-950">Active Field Permissions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Controls which users can submit or view data for specific fields.</p>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Field ID</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Granted Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {assignments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{a.userName} ({a.userEmail})</td>
                    <td className="py-3 px-4 font-mono font-bold text-forest-900">{a.fieldId}</td>
                    <td className="py-3 px-4 capitalize">{a.role}</td>
                    <td className="py-3 px-4 text-slate-500">{new Date(a.grantedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      {a.isActive ? (
                        <span className="text-emerald-700 font-bold">Active</span>
                      ) : (
                        <span className="text-slate-400">Revoked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.isActive && (
                        <button
                          onClick={() => handleRevokeAssignment(a.id)}
                          className="text-xs font-bold text-red-600 hover:text-red-800"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-base font-bold text-forest-950">System Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              NS-BR-06 & Security Governance: Every operational action logged. Contains NO raw measurement values.
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-mono text-[11px]">
              {auditLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-slate-500">{new Date(l.occurredAt).toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">{l.actorUserId}</td>
                  <td className="py-2.5 px-4 capitalize">{l.actorRole}</td>
                  <td className="py-2.5 px-4 font-bold text-forest-900">{l.action}</td>
                  <td className="py-2.5 px-4">{l.targetId || '-'}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      l.outcome === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {l.outcome}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 font-sans">{l.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-forest-950">Microservice Operational Metrics</h3>
              <p className="text-xs text-slate-500">Live health monitoring endpoint: /health</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>All Systems Operational</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Service Name</span>
              <p className="mt-1 font-bold text-slate-900 text-sm">{healthInfo?.service || 'Leafline Soil Service'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Database Connection</span>
              <p className="mt-1 font-bold text-emerald-700 text-sm capitalize">{healthInfo?.database || 'Connected (AWS RDS)'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Active Rule Engine</span>
              <p className="mt-1 font-mono font-bold text-slate-900 text-sm">{healthInfo?.ruleVersion || 'SUNFLOWER_RULES_V1'}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 uppercase font-bold text-[10px]">Worker Status</span>
              <p className="mt-1 font-bold text-leaf-700 text-sm capitalize">{healthInfo?.workerStatus || 'Active'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminDashboardPage;
