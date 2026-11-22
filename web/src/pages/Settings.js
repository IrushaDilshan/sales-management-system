import React, { useState, useEffect } from 'react';
import { supabase } from '../shared/supabaseClient';
import { useToast } from '../shared/ToastContext';
import {
  LuUser,
  LuShield,
  LuPalette,
  LuBuilding,
  LuLock,
  LuCheck,
  LuTriangleAlert,
} from 'react-icons/lu';

const Settings = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState({ name: 'amila', email: 'amila@gmail.com', role: 'admin' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [profileName, setProfileName] = useState('amila');
  const [twoFactor, setTwoFactor] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [error, setError] = useState(null);

  // Theme preference
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        setUser(authUser);
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle();

        if (data) {
          setUserData({
            name: data.name || authUser.email?.split('@')[0] || 'amila',
            email: authUser.email || 'amila@gmail.com',
            role: data.role || 'Administrator',
          });
          setProfileName(data.name || authUser.email?.split('@')[0] || 'amila');
        } else {
          setUserData({
            name: authUser.email?.split('@')[0] || 'amila',
            email: authUser.email || 'amila@gmail.com',
            role: 'Administrator',
          });
          setProfileName(authUser.email?.split('@')[0] || 'amila');
        }
      }
    } catch (err) {
      console.warn('Could not fetch settings user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (user?.id) {
        await supabase.from('users').update({ name: profileName }).eq('id', user.id);
      }

      setUserData((prev) => ({ ...prev, name: profileName }));
      showToast('Profile information updated successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      if (passwordData.newPassword.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }

      const { error: pwdErr } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (pwdErr) throw pwdErr;

      setPasswordData({ currentPassword: '', newPassword: '' });
      showToast('Password rotated successfully.', 'success');
    } catch (err) {
      setError(err.message || 'Password update failed.');
    } finally {
      setSaving(false);
    }
  };

  const setTheme = (dark) => {
    setIsDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nldb_theme', 'dark');
      showToast('Obsidian Dark appearance activated.', 'info');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nldb_theme', 'light');
      showToast('Light appearance activated.', 'info');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <LuUser className="w-4 h-4" />, sub: 'Personal details' },
    {
      id: 'security',
      label: 'Security',
      icon: <LuShield className="w-4 h-4" />,
      sub: 'Password & 2FA',
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: <LuPalette className="w-4 h-4" />,
      sub: 'Theme & alerts',
    },
    {
      id: 'account',
      label: 'Workspace Info',
      icon: <LuBuilding className="w-4 h-4" />,
      sub: 'NLDB metadata',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-zinc-950 dark:text-white">
          Account Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Manage profile details, security policies, and workspace appearance
        </p>
      </div>

      {/* Grid: Tabs on left, Content on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Sub-nav Sidebar */}
        <div className="lg:col-span-3 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-2 shadow-card space-y-1">
          {tabs.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setError(null);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <div className="shrink-0">{t.icon}</div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-[11px] opacity-70">{t.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-9 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 p-6 shadow-card">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <LuTriangleAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="animate-view">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Profile Information
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-6">
                Update your administrator identity shown across audit logs.
              </p>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      disabled
                      value={userData.email}
                      className="w-full h-10 pl-3.5 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-400 cursor-not-allowed"
                    />
                    <LuLock className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    Managed by NLDB Identity Directory — email cannot be changed directly.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="animate-view">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Security & Access
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-6">
                Protect administrative access with two-factor authentication and passwords.
              </p>
              <div className="space-y-5 max-w-lg">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                      Two-Factor Authentication (2FA)
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Require verification code when signing in from new field devices.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTwoFactor(!twoFactor);
                      showToast(
                        `Two-factor authentication ${!twoFactor ? 'enabled' : 'disabled'}.`,
                        'info'
                      );
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                      twoFactor ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transform transition ${
                        twoFactor ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3.5 pt-2">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="New password (min. 6 characters)"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    className="w-full h-10 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-950 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors"
                  >
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="animate-view">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Workspace Appearance
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-6">
                Choose your preferred interface theme for day or night shifts.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <button
                  type="button"
                  onClick={() => setTheme(false)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    !isDark
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.03]'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-full h-16 rounded-lg bg-[#F7F7F8] border border-zinc-200 mb-3 p-2 flex flex-col gap-1.5">
                    <div className="w-1/2 h-2 rounded bg-zinc-300"></div>
                    <div className="w-3/4 h-2 rounded bg-emerald-500/50"></div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                    Light Mode
                  </div>
                  <div className="text-xs text-zinc-500">Crisp high-contrast daylight UI</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme(true)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isDark
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-500/[0.06]'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <div className="w-full h-16 rounded-lg bg-[#09090B] border border-zinc-800 mb-3 p-2 flex flex-col gap-1.5">
                    <div className="w-1/2 h-2 rounded bg-zinc-700"></div>
                    <div className="w-3/4 h-2 rounded bg-emerald-500/60"></div>
                  </div>
                  <div className="text-sm font-semibold text-zinc-950 dark:text-white">
                    Obsidian Dark
                  </div>
                  <div className="text-xs text-zinc-500">Low-glare studio dark theme</div>
                </button>
              </div>
            </div>
          )}

          {/* Workspace Info Tab */}
          {activeTab === 'account' && (
            <div className="animate-view">
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Workspace Metadata
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-5">
                Organization deployment and license tier details.
              </p>
              <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm max-w-lg">
                <div className="py-3 flex justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">Organization</dt>
                  <dd className="font-semibold text-zinc-950 dark:text-white">
                    National Livestock Development Board
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">License Plan</dt>
                  <dd>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Manager Pro Enterprise
                    </span>
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">Region Node</dt>
                  <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    LK-WEST-COLOMBO-01
                  </dd>
                </div>
                <div className="py-3 flex justify-between">
                  <dt className="text-zinc-500 dark:text-zinc-400">Build Version</dt>
                  <dd className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                    v3.4.2-stable
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
