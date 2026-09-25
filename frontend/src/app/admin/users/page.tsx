"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Download, 
  MoreVertical,
  Mail,
  Shield,
  UserCheck,
  UserX,
  Calendar,
  Loader2,
  Users as UsersIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface UsersStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  verifiedUsers: number;
  newThisMonth: number;
}

export default function AdminUsersPage() {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

        const response = await fetch(`${API_BASE_URL}/dev/users`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        console.log('Fetched users:', data);
        setUsers(Array.isArray(data) ? data : []);

        // Calculate stats
        const totalUsers = data.length;
        const activeUsers = data.filter((u: User) => u.isActive).length;
        const adminUsers = data.filter((u: User) => u.role === 'Admin').length;
        const verifiedUsers = data.filter((u: User) => u.emailVerified).length;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = data.filter((u: User) => 
          new Date(u.createdAt) >= startOfMonth
        ).length;

        setStats({
          totalUsers,
          activeUsers,
          adminUsers,
          verifiedUsers,
          newThisMonth,
        });
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated]);

  // Filter users based on search and filters
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      !searchQuery ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    
    const matchesStatus = 
      statusFilter === 'All' ||
      (statusFilter === 'Active' && user.isActive) ||
      (statusFilter === 'Inactive' && !user.isActive) ||
      (statusFilter === 'Verified' && user.emailVerified) ||
      (statusFilter === 'Unverified' && !user.emailVerified);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleExportUsers = () => {
    // Create CSV content
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Email Verified', 'Created At', 'Last Login'];
    const rows = filteredUsers.map(user => [
      user.id,
      user.firstName,
      user.lastName,
      user.email,
      user.role,
      user.isActive ? 'Active' : 'Inactive',
      user.emailVerified ? 'Yes' : 'No',
      new Date(user.createdAt).toLocaleString(),
      user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success('Users exported successfully');
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'Admin' 
      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  };

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and monitor all registered users
          </p>
        </div>
        <Button onClick={handleExportUsers} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export Users
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl">{stats.totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-2xl text-green-600">{stats.activeUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Admins</CardDescription>
              <CardTitle className="text-2xl text-purple-600">{stats.adminUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Verified</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{stats.verifiedUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>New This Month</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{stats.newThisMonth}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <Shield className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Verified">Email Verified</SelectItem>
                <SelectItem value="Unverified">Email Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Email Verified</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {user.firstName[0]}{user.lastName[0]}
                          </div>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-gray-500">ID: {user.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(user.isActive)}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <UserCheck className="w-5 h-5 text-green-600" />
                        ) : (
                          <UserX className="w-5 h-5 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.lastLoginAt ? (
                          <div className="text-sm">
                            {new Date(user.lastLoginAt).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>View Orders</DropdownMenuItem>
                            <DropdownMenuItem>Send Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Deactivate Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No users found</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {filteredUsers.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}
    </div>
  );
}