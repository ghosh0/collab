'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Grid3X3, LayoutList, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import BoardCard from '@/components/board-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

interface BoardMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface BoardData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  members: BoardMember[];
}

// Map API board data to the shape the BoardCard component expects
function mapBoardToCard(board: BoardData, currentUserId: string) {
  const membership = board.members.find((m) => m.userId === currentUserId);
  let role: 'owner' | 'collaborator' | 'viewer' = 'viewer';
  if (membership) {
    if (membership.role === 'OWNER') role = 'owner';
    else if (membership.role === 'EDITOR') role = 'collaborator';
    else role = 'viewer';
  }

  const colorPalette = [
    '#6366f1', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
  ];

  return {
    id: board.id,
    name: board.title,
    updatedAt: board.updatedAt,
    collaborators: board.members.length,
    lastEdited: formatTimeAgo(board.updatedAt),
    role,
    members: board.members.map((m, i) => ({
      name: m.user.name,
      color: colorPalette[i % colorPalette.length],
    })),
  };
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user) {
      loadBoards();
    }
  }, [session]);

  const loadBoards = async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${session.user.id}/boards`);
      if (response.ok) {
        const data = await response.json();
        setBoards(data.map((m: any) => m.board));
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentUserId = session?.user?.id || '';

  const mappedBoards = boards.map((b) => mapBoardToCard(b, currentUserId));

  const filteredBoards = mappedBoards.filter((board) =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBoard = async () => {
    if (!session?.user) return;
    setCreating(true);
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBoardName.trim() || 'Untitled Board',
        }),
      });
      if (response.ok) {
        const data = await response.json();
        router.push(`/board/${data.board.id}`);
      }
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setCreating(false);
      setShowNewBoardDialog(false);
    }
  };

  return (
    <div className="flex-1">
      {/* Page header */}
      <div className="px-4 md:px-6 lg:px-8 py-6 border-b border-border bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">My boards</h1>
            <p className="text-muted-foreground mt-1">Manage and organize your collaborative whiteboards</p>
          </div>

          {/* Create board button */}
          <Button
            className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200"
            onClick={() => setShowNewBoardDialog(true)}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Plus className="w-5 h-5 mr-2" />
            )}
            New board
          </Button>
        </div>

        {/* Filters and search bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
          {/* Mobile search */}
          <div className="relative md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-muted/50 border-transparent focus:border-primary/30 rounded-lg w-full"
            />
          </div>

          {/* Results count */}
          <div className="sm:mr-auto">
            <span className="text-sm text-muted-foreground">
              {filteredBoards.length} board{filteredBoards.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-md ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-accent'}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-md ${viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-accent'}`}
              onClick={() => setViewMode('list')}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Board grid */}
      <div className="px-4 md:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No boards found</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-6">
              {searchQuery
                ? `No boards match "${searchQuery}". Try a different search term.`
                : "You don't have any boards yet. Create your first board to get started."}
            </p>
            {!searchQuery && (
              <Button
                className="h-11 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/20"
                onClick={() => setShowNewBoardDialog(true)}
              >
                <Plus className="w-5 h-5 mr-2" />
                Create your first board
              </Button>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                : 'flex flex-col gap-3'
            }
          >
            {filteredBoards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </div>

      {/* New board dialog */}
      <Dialog open={showNewBoardDialog} onOpenChange={setShowNewBoardDialog}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Create new board</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Give your board a name to get started
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name" className="text-sm font-medium text-foreground">
                Board name
              </Label>
              <Input
                id="board-name"
                placeholder="Untitled Board"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
                className="h-11 bg-card border-border rounded-xl px-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setShowNewBoardDialog(false);
                setNewBoardName('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              onClick={handleCreateBoard}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create board'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
