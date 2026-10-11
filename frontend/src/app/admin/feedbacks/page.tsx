"use client";

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  MessageSquare, 
  Star, 
  MoreVertical,
  Check,
  X,
  Trash2,
  Loader2,
  AlertCircle,
  TrendingUp,
  Award,
} from 'lucide-react';
import { toast } from 'sonner';

interface Feedback {
  id: number;
  userId: number;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  isApproved: boolean;
  isFeatured: boolean;
  createdAt: string;
}

interface FeedbackStats {
  total: number;
  approved: number;
  pending: number;
  featured: number;
  averageRating: number;
}

export default function AdminFeedbacksPage() {
  const { isAuthenticated } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    approved: 0,
    pending: 0,
    featured: 0,
    averageRating: 0
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'featured'>('all');

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5185/api';

  const loadFeedbacks = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/feedbacks/admin/all`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feedbacks');
      }

      const data = await response.json();
      setFeedbacks(data);
      
      // Calculate stats
      const totalRatings = data.reduce((sum: number, f: Feedback) => sum + f.rating, 0);
      const stats: FeedbackStats = {
        total: data.length,
        approved: data.filter((f: Feedback) => f.isApproved).length,
        pending: data.filter((f: Feedback) => !f.isApproved).length,
        featured: data.filter((f: Feedback) => f.isFeatured).length,
        averageRating: data.length > 0 ? totalRatings / data.length : 0
      };
      setStats(stats);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      toast.error('Failed to load feedbacks');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, API_BASE_URL]);

  const filterFeedbacksByStatus = useCallback(() => {
    let filtered = [...feedbacks];
    
    switch (filterStatus) {
      case 'pending':
        filtered = feedbacks.filter(f => !f.isApproved);
        break;
      case 'approved':
        filtered = feedbacks.filter(f => f.isApproved);
        break;
      case 'featured':
        filtered = feedbacks.filter(f => f.isFeatured);
        break;
      default:
        // 'all' - no filtering
        break;
    }
    
    setFilteredFeedbacks(filtered);
  }, [feedbacks, filterStatus]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  useEffect(() => {
    filterFeedbacksByStatus();
  }, [filterFeedbacksByStatus]);

  const updateFeedbackStatus = async (id: number, isApproved: boolean, isFeatured: boolean) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${API_BASE_URL}/feedbacks/${id}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isApproved, isFeatured }),
      });

      if (!response.ok) {
        throw new Error('Failed to update feedback status');
      }

      toast.success('Feedback status updated successfully');
      await loadFeedbacks();
    } catch (error) {
      console.error('Error updating feedback:', error);
      toast.error('Failed to update feedback status');
    }
  };

  const handleApprove = async (id: number) => {
    const feedback = feedbacks.find(f => f.id === id);
    if (feedback) {
      await updateFeedbackStatus(id, true, feedback.isFeatured);
    }
  };

  const handleReject = async (id: number) => {
    const feedback = feedbacks.find(f => f.id === id);
    if (feedback) {
      await updateFeedbackStatus(id, false, feedback.isFeatured);
    }
  };

  const handleToggleFeatured = async (id: number) => {
    const feedback = feedbacks.find(f => f.id === id);
    if (feedback) {
      await updateFeedbackStatus(id, feedback.isApproved, !feedback.isFeatured);
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAuthenticated) return;

    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/feedbacks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete feedback');
      }

      toast.success('Feedback deleted successfully');
      await loadFeedbacks();
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast.error('Failed to delete feedback');
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading feedbacks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manage Feedbacks</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Review and manage customer feedback and testimonials
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Feedbacks</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Review</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved</p>
              <p className="text-2xl font-bold">{stats.approved}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Featured</p>
              <p className="text-2xl font-bold">{stats.featured}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Rating</p>
              <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feedback List</CardTitle>
              <CardDescription>Review and manage all customer feedbacks</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All ({stats.total})
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                Pending ({stats.pending})
              </Button>
              <Button
                variant={filterStatus === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('approved')}
              >
                Approved ({stats.approved})
              </Button>
              <Button
                variant={filterStatus === 'featured' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('featured')}
              >
                Featured ({stats.featured})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFeedbacks.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No feedbacks found for this filter
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFeedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{feedback.userName}</p>
                          <p className="text-xs text-gray-500">ID: {feedback.userId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {renderStars(feedback.rating)}
                          <span className="text-sm font-medium">{feedback.rating}.0</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-semibold text-sm mb-1">{feedback.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {feedback.comment}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge 
                            variant={feedback.isApproved ? 'default' : 'secondary'}
                            className={feedback.isApproved ? 'bg-green-600' : 'bg-yellow-600'}
                          >
                            {feedback.isApproved ? 'Approved' : 'Pending'}
                          </Badge>
                          {feedback.isFeatured && (
                            <Badge variant="outline" className="border-purple-600 text-purple-600">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {!feedback.isApproved && (
                              <DropdownMenuItem onClick={() => handleApprove(feedback.id)}>
                                <Check className="w-4 h-4 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            
                            {feedback.isApproved && (
                              <DropdownMenuItem onClick={() => handleReject(feedback.id)}>
                                <X className="w-4 h-4 mr-2 text-red-600" />
                                Unapprove
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem onClick={() => handleToggleFeatured(feedback.id)}>
                              <Award className="w-4 h-4 mr-2 text-purple-600" />
                              {feedback.isFeatured ? 'Unfeature' : 'Feature'}
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleDelete(feedback.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}