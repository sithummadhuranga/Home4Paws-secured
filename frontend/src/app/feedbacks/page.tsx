"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApprovedFeedbacks, getMyFeedbacks, createFeedback } from '@/services/feedbackService';
import { Feedback, CreateFeedbackDto } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, MessageSquare, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function FeedbacksPage() {
  const { user, isAuthenticated } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateFeedbackDto>({
    rating: 5,
    title: '',
    comment: '',
  });

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      setIsLoading(true);
      const [approvedData, myData] = await Promise.all([
        getApprovedFeedbacks(),
        isAuthenticated ? getMyFeedbacks() : Promise.resolve([]),
      ]);
      setFeedbacks(approvedData);
      setMyFeedbacks(myData);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
      toast.error('Failed to load feedbacks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to submit feedback');
      return;
    }

    if (!formData.title.trim() || !formData.comment.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await createFeedback(formData);
      toast.success('Feedback submitted successfully! It will be reviewed before being published.');
      setFormData({ rating: 5, title: '', comment: '' });
      setShowForm(false);
      loadFeedbacks();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
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
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-600" />
            <p className="text-gray-600 dark:text-gray-400">Loading feedbacks...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-black via-neutral-900 to-purple-900/10 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-400/20 mb-4">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400 mr-2" />
              <span className="text-xs font-medium text-purple-200">Customer Reviews</span>
            </div>
            <h1 className="text-4xl font-bold text-purple-200 mb-4">What Our Community Says</h1>
            <p className="text-purple-300 max-w-2xl mx-auto">
              Real feedback from real pet parents who trust Home4Paws
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="bg-neutral-900/60 border-purple-400/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-900/30 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-200">{feedbacks.length}</p>
                    <p className="text-sm text-purple-300">Total Reviews</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-purple-400/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-900/30 rounded-xl">
                    <Star className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-200">
                      {feedbacks.length > 0
                        ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
                        : '0.0'}
                    </p>
                    <p className="text-sm text-purple-300">Average Rating</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-neutral-900/60 border-purple-400/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-900/30 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-200">98%</p>
                    <p className="text-sm text-purple-300">Satisfaction Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Write Review Button */}
          {user && (
            <div className="mb-8">
              <Button
                onClick={() => setShowForm(!showForm)}
                className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Write a Review
              </Button>
            </div>
          )}

          {/* Review Form */}
          {showForm && user && (
            <Card className="mb-8 bg-neutral-900/60 border-purple-400/20">
              <CardHeader>
                <CardTitle className="text-purple-200">Share Your Experience</CardTitle>
                <CardDescription className="text-purple-300">
                  Your feedback helps us improve and helps other pet parents make informed decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Rating */}
                  <div>
                    <Label className="text-purple-200 mb-2 block">Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, rating: star })}
                          className="transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              star <= formData.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="title" className="text-purple-200">
                      Review Title
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Sum up your experience"
                      maxLength={200}
                      className="bg-neutral-800/50 border-purple-400/30 text-purple-200"
                      required
                    />
                  </div>

                  {/* Comment */}
                  <div>
                    <Label htmlFor="comment" className="text-purple-200">
                      Your Review
                    </Label>
                    <Textarea
                      id="comment"
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      placeholder="Tell us about your experience with Home4Paws..."
                      rows={5}
                      maxLength={1000}
                      className="bg-neutral-800/50 border-purple-400/30 text-purple-200"
                      required
                    />
                    <p className="text-sm text-purple-400 mt-1">
                      {formData.comment.length}/1000 characters
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      disabled={isSubmitting}
                      className="border-purple-400/30"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Review'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* My Reviews */}
          {myFeedbacks.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-purple-200 mb-6">My Reviews</h2>
              <div className="grid gap-6">
                {myFeedbacks.map((feedback) => (
                  <Card key={feedback.id} className="bg-neutral-900/60 border-purple-400/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        {renderStars(feedback.rating)}
                        <div className="flex gap-2">
                          {feedback.isApproved ? (
                            <Badge className="bg-green-600">Approved</Badge>
                          ) : (
                            <Badge variant="secondary">Pending Review</Badge>
                          )}
                          {feedback.isFeatured && (
                            <Badge className="bg-purple-600">Featured</Badge>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-purple-200 mb-2">{feedback.title}</h3>
                      <p className="text-purple-300 mb-4">{feedback.comment}</p>
                      <p className="text-sm text-purple-400">
                        Submitted on {new Date(feedback.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Reviews */}
          <div>
            <h2 className="text-2xl font-bold text-purple-200 mb-6">Community Reviews</h2>
            {feedbacks.length === 0 ? (
              <Card className="bg-neutral-900/60 border-purple-400/20">
                <CardContent className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-purple-200 mb-2">No reviews yet</h3>
                  <p className="text-purple-300">Be the first to share your experience!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {feedbacks.map((feedback) => (
                  <Card key={feedback.id} className="bg-neutral-900/60 border-purple-400/20">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="font-bold text-purple-200">{feedback.userName}</p>
                          <p className="text-sm text-purple-400">
                            {new Date(feedback.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {renderStars(feedback.rating)}
                      </div>
                      <h3 className="text-lg font-bold text-purple-200 mb-2">{feedback.title}</h3>
                      <p className="text-purple-300">{feedback.comment}</p>
                      {feedback.isFeatured && (
                        <Badge className="mt-4 bg-purple-600">Featured Review</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}