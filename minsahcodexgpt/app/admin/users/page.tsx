'use client';





import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { useState } from 'react';
import { useAdminAuth, PERMISSIONS } from '@/contexts/AdminAuthContext';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Shield,
  User,
  Mail,
  Calendar,
  Lock,
  Unlock,
} from 'lucide-react';
import { clsx } from 'clsx';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor' | 'moderator';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  permissions: string[];
}

export default function UsersManagementPage() {
  const { pushToast, requestConfirmation } = useToast();
  const { hasPermission } = useAdminAuth();
  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: '1',
      name: 'Admin',
      email: 'sahal',
      role: 'super_admin',
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: '2024-01-01',
      permissions: ['all'],
    },
    {
      id: '2',
      name: 'John Doe',
      email: 'john.doe@minsahbeauty.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-01-20',
      createdAt: '2024-01-05',
      permissions: ['products', 'orders', 'customers'],
    },
    {
      id: '3',
      name: 'Jane Smith',
      email: 'jane.smith@minsahbeauty.com',
      role: 'editor',
      status: 'active',
      lastLogin: '2024-01-19',
      createdAt: '2024-01-10',
      permissions: ['content', 'blog'],
    },
    {
      id: '4',
      name: 'Mike Wilson',
      email: 'mike.wilson@minsahbeauty.com',
      role: 'moderator',
      status: 'inactive',
      lastLogin: '2024-01-15',
      createdAt: '2024-01-12',
      permissions: ['reviews', 'comments'],
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  if (!hasPermission(PERMISSIONS.USERS_MANAGE)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You don't have permission to manage users.</p>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = async (userId: string) => {
    if (userId === '1') {
      pushToast({ tone: 'danger', description: 'Cannot delete super admin user!' });
      return;
    }
    if (await requestConfirmation({ title: 'Delete this user?', description: 'The user will lose access to the admin account.', confirmLabel: 'Delete user', tone: 'danger' })) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleToggleStatus = (userId: string) => {
    if (userId === '1') {
      pushToast({ tone: 'danger', description: 'Cannot modify super admin status!' });
      return;
    }
    setUsers(users.map(u =>
      u.id === userId
        ? { ...u, status: u.status === 'active' ? 'inactive' as const : 'active' as const }
        : u
    ));
  };

  const getStatusColor = (status: AdminUser['status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
      case 'inactive':
        return 'bg-white/[0.06] text-[#8A8F98] border border-white/[0.08]';
      case 'suspended':
        return 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
      default:
        return 'bg-white/[0.06] text-[#8A8F98] border border-white/[0.08]';
    }
  };

  const getRoleColor = (role: AdminUser['role']) => {
    switch (role) {
      case 'super_admin':
        return 'bg-white/[0.12] text-white border border-white/[0.20]';
      case 'admin':
        return 'bg-blue-500/10 text-blue-300 border border-blue-500/20';
      case 'editor':
        return 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20';
      case 'moderator':
        return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
      default:
        return 'bg-white/[0.06] text-[#8A8F98] border border-white/[0.08]';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#F7F8F8]">User Management</h1>
          <p className="text-xs text-[#8A8F98] mt-0.5">Manage admin users and their permissions</p>
        </div>
        <Button className="mt-3 sm:mt-0 h-8.5 px-3.5 bg-white text-black font-medium text-xs rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white/90 active:scale-[0.98] transition-all inline-flex items-center">
          <Plus className="w-4 h-4 mr-1.5" />
          Add User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Total Users</p>
              <p className="text-xl font-semibold tracking-tight text-[#F7F8F8] mt-1">{users.length}</p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
        </div>

        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Active Users</p>
              <p className="text-xl font-semibold tracking-tight text-white mt-1">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Admins</p>
              <p className="text-xl font-semibold tracking-tight text-blue-300 mt-1">
                {users.filter(u => u.role === 'admin' || u.role === 'super_admin').length}
              </p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-tight text-[#8A8F98]">Inactive</p>
              <p className="text-xl font-semibold tracking-tight text-[#8A8F98] mt-1">
                {users.filter(u => u.status === 'inactive').length}
              </p>
            </div>
            <div className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-[#62666D]" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] p-3 mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#62666D]" />
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-white/[0.08] bg-[#0D0E11] text-xs text-[#F7F8F8] placeholder-[#62666D] rounded-lg focus:ring-1 focus:ring-white/20 focus:border-white/20"
            />
          </div>

          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 border border-white/[0.08] bg-[#0D0E11] text-xs text-[#F7F8F8] rounded-lg focus:ring-1 focus:ring-white/20 focus:border-white/20"
          >
            <option value="all">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="moderator">Moderator</option>
          </Select>
        </div>
      </div>

      {/* Users Table */}
      <div className="linear-card bg-[#08090A] rounded-xl border border-white/[0.08] overflow-hidden shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#08090A] border-b border-white/[0.08]">
              <tr>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  User
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Role
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-3.5 py-2.5 text-left text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Created
                </th>
                <th className="px-3.5 py-2.5 text-right text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#08090A] divide-y divide-white/[0.06]">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-white/[0.04] border border-white/[0.08] rounded-full flex items-center justify-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10)]">
                        <span className="text-white text-xs font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-2.5">
                        <div className="text-xs font-medium text-[#F7F8F8]">{user.name}</div>
                        <div className="text-[10px] text-[#8A8F98] flex items-center">
                          <Mail className="w-2.5 h-2.5 mr-1 text-[#62666D]" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-none',
                      getRoleColor(user.role)
                    )}>
                      <Shield className="w-2.5 h-2.5 mr-1" />
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium leading-none capitalize',
                      getStatusColor(user.status)
                    )}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center text-xs text-[#8A8F98]">
                      <Calendar className="w-3 h-3 mr-1 text-[#62666D]" />
                      {new Date(user.lastLogin).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-xs text-[#8A8F98]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.05] text-[#D0D6E0] hover:text-white hover:bg-white/[0.08] active:scale-[0.97] transition-all disabled:opacity-40"
                        title="Edit"
                        disabled={user.id === '1'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        onClick={() => handleToggleStatus(user.id)}
                        className={clsx(
                          'h-7 w-7 p-0 flex items-center justify-center rounded-md border active:scale-[0.97] transition-all disabled:opacity-40',
                          user.status === 'active' ? 'border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        )}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                        disabled={user.id === '1'}
                      >
                        {user.status === 'active' ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-7 w-7 p-0 flex items-center justify-center rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 active:scale-[0.97] transition-all disabled:opacity-40"
                        title="Delete"
                        disabled={user.id === '1'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No users found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Permissions Reference */}
      <div className="mt-6 bg-[#151516] rounded-xl border border-white/[0.08] p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-[#F7F8F8] mb-4">Role Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <h4 className="font-medium text-white mb-2">Super Admin</h4>
            <ul className="text-sm text-[#8A8F98] space-y-1">
              <li>&bull; All permissions</li>
              <li>&bull; User management</li>
              <li>&bull; Settings control</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-400 mb-2">Admin</h4>
            <ul className="text-sm text-[#8A8F98] space-y-1">
              <li>&bull; Products & Orders</li>
              <li>&bull; Customers</li>
              <li>&bull; Analytics</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white mb-2">Editor</h4>
            <ul className="text-sm text-[#8A8F98] space-y-1">
              <li>&bull; Blog posts</li>
              <li>&bull; Content management</li>
              <li>&bull; Media library</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-white/80 mb-2">Moderator</h4>
            <ul className="text-sm text-[#8A8F98] space-y-1">
              <li>&bull; Reviews moderation</li>
              <li>&bull; Comments</li>
              <li>&bull; User reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
