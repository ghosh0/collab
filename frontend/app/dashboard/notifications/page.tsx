'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, ShieldAlert, Loader2, Info, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { authClient } from '@/lib/auth-client';

interface NotificationData {
  id: string;
  userId: string;
  type: 'INVITATION' | 'ROLE_CHANGE' | 'REMOVAL';
  boardId: string;
  boardTitle: string;
  senderName: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER' | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { data: session } = authClient.useSession();

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadNotifications();
    }
  }, [session]);

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
      });
      if (response.ok) {
        // Mark all local notifications as read
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const handleAcceptInvite = async (notificationId: string) => {
    setActioningId(notificationId);
    try {
      const response = await fetch(`/api/notifications/${notificationId}/accept`, {
        method: 'POST',
      });
      if (response.ok) {
        // Reload list to get updated status
        await loadNotifications();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectInvite = async (notificationId: string) => {
    setActioningId(notificationId);
    try {
      const response = await fetch(`/api/notifications/${notificationId}/reject`, {
        method: 'POST',
      });
      if (response.ok) {
        // Reload list to get updated status
        await loadNotifications();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to reject invitation');
      }
    } catch (error) {
      console.error('Failed to reject invitation:', error);
    } finally {
      setActioningId(null);
    }
  };

  function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const unreadNotifications = notifications.filter((n) => !n.read);

  return (
    <div className="flex-1">
      {/* Page Header */}
      <div className="px-4 md:px-6 lg:px-8 py-6 border-b border-border bg-background flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            <span>Notifications</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with board invites, access level modifications, and team alerts.
          </p>
        </div>

        {unreadNotifications.length > 0 && (
          <Button
            variant="outline"
            className="rounded-xl border-border hover:bg-accent font-medium text-sm flex items-center gap-2 h-10 px-4"
            onClick={handleMarkAllRead}
          >
            <CheckCheck className="w-4 h-4 text-primary" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="px-4 md:px-6 lg:px-8 py-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-2xl shadow-sm p-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">All caught up!</h3>
            <p className="text-muted-foreground max-w-sm">
              You don't have any notifications at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isUnread = !notification.read;
              const isInvitation = notification.type === 'INVITATION';
              const isRoleChange = notification.type === 'ROLE_CHANGE';
              const isRemoval = notification.type === 'REMOVAL';

              return (
                <Card
                  key={notification.id}
                  className={`border transition-all rounded-2xl overflow-hidden hover:shadow-md ${
                    isUnread
                      ? 'border-primary/20 bg-primary/5 shadow-sm'
                      : 'border-border bg-card'
                  }`}
                >
                  <CardContent className="p-5 flex items-start gap-4">
                    {/* Icon indicator */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isInvitation
                          ? 'bg-blue-500/10 text-blue-500'
                          : isRoleChange
                          ? 'bg-purple-500/10 text-purple-500'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {isInvitation ? (
                        <Bell className="w-5 h-5" />
                      ) : isRoleChange ? (
                        <Info className="w-5 h-5" />
                      ) : (
                        <ShieldAlert className="w-5 h-5" />
                      )}
                    </div>

                    {/* Notification content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          {isInvitation && (
                            <div>
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">{notification.senderName}</span>{' '}
                                invited you to join the board{' '}
                                <span className="font-semibold text-primary">
                                  {notification.boardTitle}
                                </span>{' '}
                                as a{' '}
                                <span className="font-medium underline decoration-blue-500 decoration-2">
                                  {notification.role === 'EDITOR' ? 'Collaborator' : 'Viewer'}
                                </span>.
                              </p>
                            </div>
                          )}

                          {isRoleChange && (
                            <div>
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">{notification.senderName}</span>{' '}
                                modified your access to{' '}
                                <span className="font-medium underline decoration-purple-500 decoration-2">
                                  {notification.role === 'EDITOR' ? 'Collaborator' : 'Viewer'}
                                </span>{' '}
                                on board{' '}
                                <span className="font-semibold">{notification.boardTitle}</span>.
                              </p>
                            </div>
                          )}

                          {isRemoval && (
                            <div>
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">{notification.senderName}</span>{' '}
                                removed you from the board{' '}
                                <span className="font-semibold">{notification.boardTitle}</span>.
                              </p>
                            </div>
                          )}
                        </div>

                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>

                      {/* Interactive Buttons for Invitation */}
                      {isInvitation && notification.status === 'PENDING' && (
                        <div className="flex items-center gap-3 mt-4">
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg flex items-center gap-2 h-9 px-4"
                            onClick={() => handleAcceptInvite(notification.id)}
                            disabled={actioningId === notification.id}
                          >
                            {actioningId === notification.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Accept</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 font-semibold rounded-lg flex items-center gap-2 h-9 px-4"
                            onClick={() => handleRejectInvite(notification.id)}
                            disabled={actioningId === notification.id}
                          >
                            <X className="w-4 h-4" />
                            <span>Decline</span>
                          </Button>
                        </div>
                      )}

                      {/* Completed Invitation Status indicators */}
                      {isInvitation && notification.status !== 'PENDING' && (
                        <div className="mt-3">
                          {notification.status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                              <Check className="w-3.5 h-3.5" />
                              Accepted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">
                              <X className="w-3.5 h-3.5" />
                              Declined
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
