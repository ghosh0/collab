'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoreVertical, Users, Clock, Crown, UserCheck, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import InviteModal from './invite-modal';

interface BoardCardProps {
  board: {
    id: string;
    name: string;
    thumbnail?: string;
    updatedAt: string;
    collaborators: number;
    lastEdited: string;
    role: 'owner' | 'collaborator' | 'viewer';
    members: Array<{ name: string; avatar?: string; color: string }>;
  };
}

export default function BoardCard({ board }: BoardCardProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const roleIcon = {
    owner: <Crown className="w-3.5 h-3.5 text-yellow-500" />,
    collaborator: <UserCheck className="w-3.5 h-3.5 text-blue-500" />,
    viewer: <Eye className="w-3.5 h-3.5 text-muted-foreground" />,
  };

  const roleText = {
    owner: 'Owner',
    collaborator: 'Collaborator',
    viewer: 'Viewer',
  };

  const actionText = board.role === 'owner' ? 'Delete board' : 'Leave board';
  const actionDescription =
    board.role === 'owner'
      ? 'This will permanently delete this board and all its data. This action cannot be undone.'
      : 'You will lose access to this board. You can be re-invited by an owner.';

  return (
    <>
      <Card className="group relative bg-card border-border rounded-xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300">
        <Link href={`/board/${board.id}`}>
          {/* Thumbnail preview */}
          <div className="relative h-40 bg-gradient-to-br from-muted/50 to-muted/100 overflow-hidden">
            {board.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={board.thumbnail}
                alt={board.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-background rounded-lg shadow-sm flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-muted-foreground/30"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                    />
                  </svg>
                </div>
              </div>
            )}
            {/* Role badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-medium text-foreground shadow-sm">
              {roleIcon[board.role]}
              <span>{roleText[board.role]}</span>
            </div>
          </div>
        </Link>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/board/${board.id}`} className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {board.name}
              </CardTitle>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg hover:bg-accent flex-shrink-0"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border">
                {board.role === 'owner' && (
                  <DropdownMenuItem
                    className="rounded-lg cursor-pointer hover:bg-accent gap-2"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <Users className="w-4 h-4" />
                    <span>Invite member</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer hover:bg-destructive/10 text-destructive focus:text-destructive gap-2"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <span>{board.role === 'owner' ? 'Delete board' : 'Leave board'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Members avatars */}
          <div className="flex items-center gap-1.5 mb-3">
            {board.members.slice(0, 4).map((member, index) => (
              <Avatar
                key={index}
                className="w-7 h-7 border-2 border-card"
                style={{ marginLeft: index > 0 ? '-8px' : 0 }}
              >
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="text-xs font-medium" style={{ backgroundColor: member.color }}>
                  {member.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            ))}
            {board.collaborators > 4 && (
              <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium text-muted-foreground ml-[-8px]">
                +{board.collaborators - 4}
              </div>
            )}
          </div>

          {/* Last edited */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{board.lastEdited}</span>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <InviteModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        boardName={board.name}
        boardId={board.id}
      />

      {/* Delete/Leave Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{board.role === 'owner' ? 'Delete board?' : 'Leave board?'}</DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">{actionDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              className="rounded-lg"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/boards/${board.id}`, {
                    method: 'DELETE',
                  });
                  if (response.ok) {
                    window.location.reload();
                  }
                } catch (error) {
                  console.error('Failed to delete board:', error);
                }
                setShowDeleteDialog(false);
              }}
            >
              {board.role === 'owner' ? 'Delete' : 'Leave'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
