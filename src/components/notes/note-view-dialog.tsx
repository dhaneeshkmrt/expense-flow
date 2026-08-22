'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Note } from '@/lib/types';
import { useApp } from '@/lib/provider';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Play,
  Pause,
  Check,
  Bell,
  CheckSquare,
  ShoppingCart,
  BookOpen,
  Copy,
  Clock,
  Search,
  StickyNote,
  FileText,
  List,
  Volume2,
} from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeClass: string }> = {
  general: { label: 'General', icon: BookOpen, badgeClass: 'bg-muted text-muted-foreground' },
  reminder: { label: 'Reminder', icon: Bell, badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  todo: { label: 'To-Do', icon: CheckSquare, badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  shopping: { label: 'Shopping', icon: ShoppingCart, badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
};

const VARIETY_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  quick: { label: 'Quick Note', icon: StickyNote },
  detailed: { label: 'Detailed Note', icon: FileText },
  list: { label: 'List Note', icon: List },
  voice: { label: 'Voice Note', icon: Volume2 },
};

const COLOR_BORDER_ACCENT: Record<string, string> = {
  default: 'border-l-primary',
  yellow: 'border-l-yellow-400',
  red: 'border-l-red-400',
  green: 'border-l-green-400',
  blue: 'border-l-blue-400',
  purple: 'border-l-purple-400',
};

interface NoteViewDialogProps {
  note: Note | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  onEdit?: (id: string) => void;
}

export function NoteViewDialog({ note, open, setOpen, onEdit }: NoteViewDialogProps) {
  const { deleteNote, pinNote, archiveNote, toggleNoteItem, dismissNoteReminder, editNote } = useApp();
  const { toast } = useToast();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset audio & search when dialog closes or note changes
  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsPlaying(false);
      setItemSearchQuery('');
      setFilterMode('all');
    }
  }, [open, note?.id]);

  const typeConfig = note ? (TYPE_CONFIG[note.type] || TYPE_CONFIG.general) : TYPE_CONFIG.general;
  const TypeIcon = typeConfig.icon;
  const varietyConfig = note ? (VARIETY_CONFIG[note.variety] || VARIETY_CONFIG.quick) : VARIETY_CONFIG.quick;
  const VarietyIcon = varietyConfig.icon;

  const doneCount = note?.items?.filter((i) => i.isDone).length ?? 0;
  const totalCount = note?.items?.length ?? 0;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const reminderDateTime = note?.reminderDate
    ? new Date(`${note.reminderDate}T${note.reminderTime || '00:00'}`)
    : null;
  const isOverdue = reminderDateTime ? isPast(reminderDateTime) && !isToday(reminderDateTime) : false;
  const isTodayDue = reminderDateTime ? isToday(reminderDateTime) : false;

  const filteredItems = useMemo(() => {
    if (!note?.items) return [];
    return note.items.filter((item) => {
      if (filterMode === 'pending' && item.isDone) return false;
      if (filterMode === 'completed' && !item.isDone) return false;
      if (itemSearchQuery.trim()) {
        return item.text.toLowerCase().includes(itemSearchQuery.toLowerCase());
      }
      return true;
    });
  }, [note?.items, filterMode, itemSearchQuery]);

  const togglePlay = useCallback(() => {
    if (!note?.audioDataUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(note.audioDataUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [note?.audioDataUrl, isPlaying]);

  const handleCopyText = async () => {
    if (!note) return;
    let textToCopy = `${note.title}\n\n`;
    if (note.content) {
      textToCopy += note.content;
    } else if (note.items) {
      textToCopy += note.items.map((i) => `${i.isDone ? '[x]' : '[ ]'} ${i.text}`).join('\n');
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: 'Copied to clipboard', description: 'Note text has been copied.' });
    } catch {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const handleToggleItem = async (itemId: string) => {
    if (!note) return;
    try {
      await toggleNoteItem(note.id, itemId);
    } catch {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const handlePin = async () => {
    if (!note) return;
    await pinNote(note.id, !note.isPinned);
    toast({ title: note.isPinned ? 'Note unpinned' : 'Note pinned to top' });
  };

  const handleArchive = async () => {
    if (!note) return;
    await archiveNote(note.id);
    toast({ title: note.isArchived ? 'Note restored' : 'Note archived' });
  };

  const handleDelete = async () => {
    if (!note) return;
    try {
      await deleteNote(note.id);
      setOpen(false);
      toast({ title: 'Note deleted' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const handleReopenReminder = async () => {
    if (!note) return;
    await editNote(note.id, { reminderDismissed: false });
    toast({ title: 'Reminder re-activated' });
  };

  if (!note) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div
            className={cn(
              'border-b p-5 border-l-4 bg-muted/20',
              COLOR_BORDER_ACCENT[note.color] || COLOR_BORDER_ACCENT.default
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1 pr-6">
                <DialogTitle className="text-xl font-bold tracking-tight break-words">
                  {note.title}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <Badge variant="secondary" className={cn('gap-1 py-0.5', typeConfig.badgeClass)}>
                    <TypeIcon className="h-3 w-3" />
                    {typeConfig.label}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-muted-foreground py-0.5">
                    <VarietyIcon className="h-3 w-3" />
                    {varietyConfig.label}
                  </Badge>
                  {note.isPinned && (
                    <Badge variant="secondary" className="gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 py-0.5">
                      <Pin className="h-3 w-3 fill-current" /> Pinned
                    </Badge>
                  )}
                  {note.isArchived && (
                    <Badge variant="outline" className="text-muted-foreground py-0.5">
                      Archived
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* Reminder Alert Banner */}
            {note.type === 'reminder' && note.reminderDate && (
              <div className={cn(
                'flex items-center justify-between gap-3 p-3 rounded-lg border text-sm',
                note.reminderDismissed
                  ? 'bg-muted/40 border-muted text-muted-foreground'
                  : isOverdue
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  : isTodayDue
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-primary/5 border-primary/20 text-foreground'
              )}>
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-semibold">
                      {reminderDateTime ? format(reminderDateTime, 'EEEE, dd MMMM yyyy') : note.reminderDate}
                    </span>
                    {note.reminderTime && <span> at {note.reminderTime}</span>}
                    {note.reminderDismissed && <span className="ml-2 text-xs opacity-75">(Dismissed)</span>}
                    {isOverdue && !note.reminderDismissed && <span className="ml-2 text-xs font-bold text-red-600 dark:text-red-400">(Overdue)</span>}
                    {isTodayDue && !note.reminderDismissed && <span className="ml-2 text-xs font-bold text-amber-600 dark:text-amber-400">(Today)</span>}
                  </div>
                </div>

                {note.reminderDismissed ? (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={handleReopenReminder}>
                    Re-activate
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => dismissNoteReminder(note.id)}>
                    <Check className="h-3 w-3 mr-1" /> Dismiss
                  </Button>
                )}
              </div>
            )}

            {/* Quick / Detailed Note Content */}
            {(note.variety === 'quick' || note.variety === 'detailed') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Note Details
                  </span>
                  {note.content && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleCopyText}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  )}
                </div>
                <div className="rounded-lg border bg-card p-4 min-h-[120px]">
                  {note.content ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap select-text break-words">
                      {note.content}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No text content added.</p>
                  )}
                </div>
              </div>
            )}

            {/* List Note Content */}
            {note.variety === 'list' && (
              <div className="space-y-3">
                {/* List Summary & Progress */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Checklist Items ({doneCount}/{totalCount} Completed · {progress}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={filterMode === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setFilterMode('all')}
                    >
                      All ({totalCount})
                    </Button>
                    <Button
                      variant={filterMode === 'pending' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setFilterMode('pending')}
                    >
                      Pending ({totalCount - doneCount})
                    </Button>
                    <Button
                      variant={filterMode === 'completed' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => setFilterMode('completed')}
                    >
                      Done ({doneCount})
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={handleCopyText}>
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                {totalCount > 0 && (
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {/* Item Search filter if more than 5 items */}
                {totalCount > 5 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search list items..."
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                )}

                {/* List items */}
                <div className="rounded-lg border bg-card divide-y max-h-[340px] overflow-y-auto">
                  {filteredItems.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {itemSearchQuery ? 'No items match your search.' : 'No items in this filter.'}
                    </div>
                  ) : (
                    filteredItems.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleToggleItem(item.id)}
                        className="flex items-start gap-3 p-3 w-full text-left hover:bg-muted/40 transition-colors group"
                      >
                        <div
                          className={cn(
                            'h-5 w-5 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-all',
                            item.isDone
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/40 group-hover:border-primary'
                          )}
                        >
                          {item.isDone && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={cn(
                              'text-sm leading-snug break-words',
                              item.isDone && 'line-through text-muted-foreground'
                            )}
                          >
                            {item.text}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground/60 shrink-0 font-mono">
                          #{idx + 1}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Voice Note Content */}
            {note.variety === 'voice' && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Audio Recording
                </span>
                <div className="flex items-center gap-4 rounded-xl border bg-muted/40 p-4">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="h-12 w-12 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {isPlaying ? 'Playing Audio Note...' : 'Voice Note Ready'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tap the button to {isPlaying ? 'pause' : 'play'} audio playback
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata Timestamps */}
            <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-2 border-t">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {format(new Date(note.updatedAt), 'dd MMM yyyy, h:mm a')}
              </span>
              <span>Created by {note.userId || 'You'}</span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t p-4 bg-muted/10 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handlePin}
              >
                {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                {note.isPinned ? 'Unpin' : 'Pin'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleArchive}
              >
                {note.isArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                {note.isArchived ? 'Restore' : 'Archive'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setOpen(false);
                  if (onEdit) onEdit(note.id);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Note
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete &ldquo;{note.title}&rdquo;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
