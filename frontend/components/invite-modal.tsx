'use client';

import { useState, useEffect, useRef } from 'react';
import { Mail, Users, Send, X, Loader2, UserMinus, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { authClient } from '@/lib/auth-client';

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardName: string;
  boardId: string;
}

export default function InviteModal({
  open,
  onOpenChange,
  boardName,
  boardId,
}: InviteModalProps) {
  const [inviteRole, setInviteRole] = useState<'collaborator' | 'viewer'>('collaborator');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [boardData, setBoardData] = useState<any>(null);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);

  const { data: session } = authClient.useSession();
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const loadBoardData = async () => {
    if (!boardId) return;
    setLoadingBoard(true);
    try {
      const response = await fetch(`/api/boards/${boardId}`);
      if (response.ok) {
        const data = await response.json();
        setBoardData(data);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadBoardData();
    } else {
      setBoardData(null);
      setSelectedUsers([]);
      setSearchQuery('');
      setSuggestions([]);
    }
  }, [open, boardId]);

  // Debounced search for users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          // Filter out users already selected or already members
          const membersUserIds = boardData?.members.map((m: any) => m.userId) || [];
          const selectedUserIds = selectedUsers.map((u: any) => u.id);
          const filtered = data.filter(
            (u: any) => !membersUserIds.includes(u.id) && !selectedUserIds.includes(u.id)
          );
          setSuggestions(filtered);
        }
      } catch (err) {
        console.error('Failed to search users:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, boardData, selectedUsers]);

  // Close suggestions dropdown when clicking outside of it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectUser = (user: any) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleRemoveSelectedUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const handleSendInvites = async () => {
    setSendingInvites(true);
    for (const user of selectedUsers) {
      try {
        await fetch(`/api/boards/${boardId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            role: inviteRole === 'collaborator' ? 'EDITOR' : 'VIEWER',
          }),
        });
      } catch (error) {
        console.error(`Failed to invite ${user.email}:`, error);
      }
    }
    setSendingInvites(false);
    setSelectedUsers([]);
    onOpenChange(false);
  };

  const handleUpdateRole = async (userId: string, newRole: 'EDITOR' | 'VIEWER') => {
    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (response.ok) {
        loadBoardData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to update role');
      }
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/members?userId=${userId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        loadBoardData();
      } else {
        const err = await response.json();
        alert(err.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const isOwner = boardData && session && boardData.ownerId === session.user.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg rounded-xl max-h-[85vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          // Prevent accidental closes when interacting with the Radix Select dropdown portal
          const target = e.target as HTMLElement;
          if (
            target?.closest('[data-radix-select-viewport]') ||
            target?.closest('[role="listbox"]') ||
            target?.closest('.SelectContent')
          ) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Invite to {boardName}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Invite registered users and manage access levels.
          </DialogDescription>
        </DialogHeader>

        {/* Email Search and Autocomplete */}
        <div className="space-y-4 mt-2 relative">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>Search user by email or name</span>
            </Label>
            <div className="relative">
              <Input
                placeholder="Type name or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="h-10 bg-card border-border rounded-lg"
              />
              {loadingSuggestions && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-[100] w-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5"
                >
                  {suggestions.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarImage src={user.image} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No registered user found notice */}
              {showSuggestions && searchQuery.trim().length > 0 && !loadingSuggestions && suggestions.length === 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-[100] w-full mt-1.5 bg-popover border border-border rounded-xl shadow-xl p-4 text-center text-sm text-muted-foreground"
                >
                  No registered user found with that email or name.
                </div>
              )}
            </div>
          </div>

          {/* Selected Users list */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Selected Recipients</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="inline-flex items-center gap-1.5 bg-accent text-accent-foreground px-2.5 py-1 rounded-lg text-sm"
                  >
                    <span>{user.name}</span>
                    <button
                      className="hover:bg-accent-foreground/10 rounded-full p-0.5"
                      onClick={() => handleRemoveSelectedUser(user.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access level (role) for invitation */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Access level</Label>
            <Select value={inviteRole} onValueChange={(value: 'collaborator' | 'viewer') => setInviteRole(value)}>
              <SelectTrigger className="h-10 rounded-lg border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                <SelectItem value="collaborator" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span>Collaborator</span>
                    <span className="text-muted-foreground text-xs ml-2">Can edit</span>
                  </div>
                </SelectItem>
                <SelectItem value="viewer" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>Viewer</span>
                    <span className="text-muted-foreground text-xs ml-2">View only</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Invite submit button */}
          <Button
            className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90"
            disabled={selectedUsers.length === 0 || sendingInvites}
            onClick={handleSendInvites}
          >
            {sendingInvites ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send invitations ({selectedUsers.length})
          </Button>
        </div>

        {/* Board Members list management */}
        <div className="border-t border-border mt-6 pt-6">
          <Label className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>Board Members ({boardData?.members.length || 0})</span>
          </Label>

          {loadingBoard ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {boardData?.members.map((member: any) => {
                const isMemberOwner = member.role === 'OWNER';
                return (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarImage src={member.user.image} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {member.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate mt-1">{member.user.email}</p>
                      </div>
                    </div>

                    {/* Member role & control actions */}
                    <div className="flex items-center gap-2">
                      {isMemberOwner ? (
                        <div className="inline-flex items-center gap-1 text-xs text-yellow-500 font-semibold px-2 py-1 rounded bg-yellow-500/10">
                          Owner
                        </div>
                      ) : isOwner ? (
                        <>
                          <Select
                            value={member.role === 'EDITOR' ? 'collaborator' : 'viewer'}
                            onValueChange={(val) =>
                              handleUpdateRole(member.userId, val === 'collaborator' ? 'EDITOR' : 'VIEWER')
                            }
                          >
                            <SelectTrigger className="h-8 w-32 border-border bg-card text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border">
                              <SelectItem value="collaborator" className="text-xs">
                                Collaborator
                              </SelectItem>
                              <SelectItem value="viewer" className="text-xs">
                                Viewer
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded font-medium">
                          {member.role === 'EDITOR' ? 'Collaborator' : 'Viewer'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
