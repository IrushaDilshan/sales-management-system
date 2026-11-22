import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import Swal from 'sweetalert2';
import {
  LuUsers,
  LuShieldCheck,
  LuWarehouse,
  LuBriefcase,
  LuTruck,
  LuSearch,
  LuUserPlus,
  LuPencil,
  LuTrash2,
  LuShieldAlert,
  LuRotateCcw,
  LuX,
  LuTriangleAlert,
  LuCheck,
} from 'react-icons/lu';

const Users = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'Admins' | 'Storekeepers' | 'Sales' | 'Field' | 'Archived'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'salesman',
  });
  const [error, setError] = useState(null);

  // Pending Drawer / Modal
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('public:users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      if (!data || data.length === 0) {
        // Fallback default personnel for display
        setUsers([
          { id: 'u-1', name: 'amila', email: 'amila@nldb.lk', role: 'admin', created_at: new Date().toISOString() },
          { id: 'u-2', name: 'Sarath Perera', email: 'sarath@nldb.lk', role: 'storekeeper', created_at: new Date().toISOString() },
          { id: 'u-3', name: 'Nuwan Jayasinghe', email: 'nuwan@nldb.lk', role: 'salesman', created_at: new Date().toISOString() },
          { id: 'u-4', name: 'Dinesh Bandara', email: 'dinesh@nldb.lk', role: 'salesman', created_at: new Date().toISOString() },
          { id: 'u-5', name: 'Chamara Silva', email: 'chamara@nldb.lk', role: 'salesman', created_at: new Date().toISOString() },
          { id: 'u-6', name: 'Lakmal Gunawardena', email: 'lakmal@nldb.lk', role: 'salesman', created_at: new Date().toISOString() },
          { id: 'u-7', name: 'Kavinda Wickrama', email: 'kavinda@nldb.lk', role: 'rep', created_at: new Date().toISOString() },
          { id: 'u-pending-1', name: 'Kasun Perera', email: 'kasun.p@gmail.com', role: 'pending', created_at: new Date().toISOString() },
        ]);
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching personnel:', err);
    } finally {
      setLoading(false);
    }
  };

  // Grouped stats
  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.role !== 'archived');
    const admins = users.filter((u) => u.role === 'admin');
    const storekeepers = users.filter((u) => u.role === 'storekeeper');
    const sales = users.filter((u) => u.role === 'salesman');
    const reps = users.filter((u) => u.role === 'rep');
    const pending = users.filter((u) => u.role === 'pending');

    return {
      total: activeUsers.length,
      admins: admins.length,
      storekeepers: storekeepers.length,
      sales: sales.length,
      reps: reps.length,
      pending: pending.length,
    };
  }, [users]);

  // Pending list
  const pendingRequests = useMemo(() => {
    return users.filter((u) => u.role === 'pending');
  }, [users]);

  // Filtered rows
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (activeTab === 'ALL') {
        if (user.role === 'archived' || user.role === 'pending') return false;
      } else if (activeTab === 'Admins') {
        if (user.role !== 'admin') return false;
      } else if (activeTab === 'Storekeepers') {
        if (user.role !== 'storekeeper') return false;
      } else if (activeTab === 'Sales') {
        if (user.role !== 'salesman') return false;
      } else if (activeTab === 'Field') {
        if (user.role !== 'rep') return false;
      } else if (activeTab === 'Archived') {
        if (user.role !== 'archived') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (user.name || '').toLowerCase().includes(q);
        const matchesEmail = (user.email || '').toLowerCase().includes(q);
        const matchesRole = (user.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesRole) return false;
      }

      return true;
    });
  }, [users, activeTab, searchQuery]);

  const getInitials = (name) => {
    if (!name) return 'ST';
    const p = name.trim().split(' ');
    if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            System Admin
          </span>
        );
      case 'storekeeper':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Storekeeper
          </span>
        );
      case 'salesman':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Sales Force
          </span>
        );
      case 'rep':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20">
            Field Rep
          </span>
        );
      case 'pending':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20 animate-pulse">
            Pending Approval
          </span>
        );
      case 'archived':
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
            Archived / Revoked
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
            {role}
          </span>
        );
    }
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        role: user.role === 'pending' || user.role === 'archived' ? 'salesman' : user.role,
      });
    } else {
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        role: 'salesman',
      });
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        name: formData.name.trim(),
        role: formData.role,
      };

      if (!updates.name) {
        setError('Staff full name is required.');
        return;
      }

      if (currentUser?.id) {
        const { error: updateErr } = await supabase
          .from('users')
          .update(updates)
          .eq('id', currentUser.id);

        if (updateErr) throw updateErr;
        showToast(`Staff profile for "${updates.name}" updated.`, 'success');
      } else {
        const { error: insertErr } = await supabase.from('users').insert([
          {
            name: updates.name,
            role: updates.role,
            email: formData.email.trim() || undefined,
          },
        ]);
        if (insertErr) throw insertErr;
        showToast(`New staff member "${updates.name}" onboarded!`, 'success');
      }

      fetchUsers();
      handleCloseModal();
    } catch (err) {
      setError(err.message || 'Failed to save staff record.');
    }
  };

  const handleRevoke = async (user) => {
    const result = await Swal.fire({
      title: 'Revoke Access?',
      text: `Revoke system access for ${user.name}? This will archive their credentials.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Revoke Access',
      confirmButtonColor: '#E11D48',
    });

    if (!result.isConfirmed) return;

    try {
      await supabase.from('users').update({ role: 'archived' }).eq('id', user.id);
      showToast(`Access revoked for ${user.name}.`, 'info');
      fetchUsers();
    } catch (err) {
      showToast('Action failed: ' + err.message, 'error');
    }
  };

  const handleRestore = async (user) => {
    try {
      await supabase.from('users').update({ role: 'salesman' }).eq('id', user.id);
      showToast(`Access restored for ${user.name} as Salesman.`, 'success');
      fetchUsers();
    } catch (err) {
      showToast('Restore failed: ' + err.message, 'error');
    }
  };

  const handleApprovePending = async (user) => {
    try {
      await supabase.from('users').update({ role: 'salesman' }).eq('id', user.id);
      showToast(`Request approved! ${user.name} is now an active Salesman.`, 'success');
      fetchUsers();
      if (pendingRequests.length <= 1) {
        setIsPendingModalOpen(false);
      }
    } catch (err) {
      showToast('Approval failed: ' + err.message, 'error');
    }
  };

  const tabs = ['ALL', 'Admins', 'Storekeepers', 'Sales', 'Field', 'Archived'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
            Personnel Management
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Human resource governance, role permissions, and branch assignments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsPendingModalOpen(true)}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold shadow-card transition-colors"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                stats.pending > 0 ? 'bg-amber-500 animate-pulse' : 'bg-zinc-300'
              }`}
            ></span>
            <span>Pending Requests</span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">
              {stats.pending}
            </span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <LuUserPlus className="w-3.5 h-3.5" />
            <span>Onboard Staff</span>
          </button>
        </div>
      </div>

      {/* 5 Role KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {[
          {
            label: 'Total Force',
            value: stats.total,
            icon: <LuUsers className="w-4 h-4" />,
            cls: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300',
          },
          {
            label: 'Admins',
            value: stats.admins,
            icon: <LuShieldCheck className="w-4 h-4" />,
            cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
          },
          {
            label: 'Storekeepers',
            value: stats.storekeepers,
            icon: <LuWarehouse className="w-4 h-4" />,
            cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
          },
          {
            label: 'Sales Team',
            value: stats.sales,
            icon: <LuBriefcase className="w-4 h-4" />,
            cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
          },
          {
            label: 'Field Reps',
            value: stats.reps,
            icon: <LuTruck className="w-4 h-4" />,
            cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-4 shadow-card flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{c.label}</div>
              <div className="text-2xl font-bold font-mono text-zinc-950 dark:text-white mt-1">
                {c.value}
              </div>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.cls}`}>
              {c.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Personnel Directory Card */}
      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-card overflow-hidden">
        {/* Search & Role Segment Filter */}
        <div className="p-4 border-b border-zinc-200/70 dark:border-zinc-800/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <LuSearch className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search identity, role, or branch..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 overflow-x-auto max-w-full">
            {tabs.map((t) => {
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    active
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                >
                  {t === 'ALL' ? 'All Active' : t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/60 dark:bg-zinc-900/50">
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Staff Identity
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Access Role
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Assigned Station
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Status
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">
                  Governance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-xs text-zinc-400">
                    No matching staff records found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    {/* Identity */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold flex items-center justify-center text-zinc-700 dark:text-zinc-200">
                            {getInitials(user.name)}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-950 ${
                              user.role !== 'archived' ? 'bg-emerald-500' : 'bg-zinc-400'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-950 dark:text-white">
                            {user.name}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            {user.email || `${user.name.toLowerCase().replace(/\s+/g, '')}@nldb.lk`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>

                    {/* Station */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-600 dark:text-zinc-300">
                      {user.role === 'admin'
                        ? 'HQ Executive Terminal'
                        : user.role === 'storekeeper'
                        ? 'Central Cold Depot'
                        : user.role === 'rep'
                        ? 'Provincial Field Transit'
                        : 'Colombo Metro Circuit'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.role !== 'archived' ? 'bg-emerald-500' : 'bg-zinc-400'
                          }`}
                        />
                        {user.role === 'archived' ? 'Inactive' : 'Operational'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleOpenModal(user)}
                          title="Edit Profile & Role"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <LuPencil className="w-4 h-4" />
                        </button>
                        {user.role === 'archived' ? (
                          <button
                            onClick={() => handleRestore(user)}
                            title="Restore Access"
                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                          >
                            <LuRotateCcw className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevoke(user)}
                            title="Revoke Access"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          >
                            <LuShieldAlert className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Onboard / Edit Staff Modal */}
      {isModalOpen && createPortal(
        <div
          id="user-modal-backdrop"
          onClick={(e) => {
            if (e.target.id === 'user-modal-backdrop') handleCloseModal();
          }}
          className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden animate-pop my-auto">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  {currentUser ? 'Modify Staff Credentials' : 'Onboard New Staff Member'}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Set security credentials and distribution station authorization
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <LuTriangleAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Kasun Perera"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. kasun@nldb.lk"
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  System Role & Station
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="salesman">Sales Force (Retail Mobile Dispatch)</option>
                  <option value="storekeeper">Storekeeper (Cold-Chain Warehouse)</option>
                  <option value="rep">Field Representative (Route Operations)</option>
                  <option value="admin">System Administrator (Full Enterprise Access)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="h-9 px-4 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {currentUser ? 'Save Changes' : 'Initialize Account'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Pending Requests Modal */}
      {isPendingModalOpen && createPortal(
        <div
          id="pending-modal-backdrop"
          onClick={(e) => {
            if (e.target.id === 'pending-modal-backdrop') setIsPendingModalOpen(false);
          }}
          className="fixed inset-0 z-[100] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-float overflow-hidden animate-pop my-auto">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  Pending Staff Authorizations
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Review registrations submitted by mobile field reps & salesmen
                </p>
              </div>
              <button
                onClick={() => setIsPendingModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <LuX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 divide-y divide-zinc-100 dark:divide-zinc-800/70 max-h-96 overflow-y-auto">
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  Zero pending onboarding requests. All personnel are verified.
                </div>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {req.name}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-0.5">
                        {req.email || 'Request via Android Terminal'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprovePending(req)}
                        className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <LuCheck className="w-3.5 h-3.5" />
                        <span>Authorize</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Users;
