'use client';

import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Phone, MapPin, History, Trash2, Info, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { BorrowingRelationship } from '@/lib/types';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';

const relationships: BorrowingRelationship[] = [
  'Close Relative', 
  'Relative', 
  'Close Friend', 
  'Friend', 
  'Colleague', 
  'Neighbour', 
  'Other'
];

export default function ContactsPage() {
  const { borrowingContacts, addBorrowingContact, deleteBorrowingContact, borrowings } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<BorrowingRelationship>('Friend');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!name || !relationship) return;
    try {
      await addBorrowingContact({
        name,
        relationship,
        phone,
        address,
        notes
      });
      toast({ title: 'Contact Created', description: `${name} has been added.` });
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setName('');
    setRelationship('Friend');
    setPhone('');
    setAddress('');
    setNotes('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBorrowingContact(id);
      toast({ title: 'Contact Deleted' });
    } catch (e: any) {
      toast({ title: 'Delete Failed', description: e.message, variant: 'destructive' });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 800) return 'text-green-500';
    if (score >= 700) return 'text-blue-500';
    if (score >= 600) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Contacts & Credit Scores</h1>
          <p className="text-muted-foreground">Manage people you deal with and monitor their return efficiency.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {borrowingContacts.map(contact => {
          const contactBorrowings = borrowings.filter(b => b.contactId === contact.id);
          const hasHistory = contactBorrowings.length > 0;
          
          return (
            <Card key={contact.id} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className={cn("text-2xl font-black", getScoreColor(contact.creditScore))}>
                    {contact.creditScore}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Trust Score</div>
                </div>
                {!hasHistory && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete <strong>{contact.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(contact.id)} className="bg-destructive hover:bg-destructive/90">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                    {contact.relationship}
                  </Badge>
                </div>
                <CardTitle>{contact.name}</CardTitle>
                <CardDescription className="flex flex-col gap-1 mt-2">
                  {contact.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {contact.phone}</div>}
                  {contact.address && <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {contact.address}</div>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.notes && (
                  <div className="text-sm bg-muted/30 p-2 rounded border border-border/50 italic text-muted-foreground flex gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0 mt-0.5" />
                    {contact.notes}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Deals</div>
                    <div className="font-semibold">{contactBorrowings.length}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Active Lent</div>
                    <div className="font-semibold text-primary">
                      {contactBorrowings.filter(b => b.type === 'Lent' && !b.isClosed).length}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                   <Badge variant="outline" className={cn(contact.creditScore > 700 ? "border-green-500/50 text-green-500" : "border-red-500/50 text-red-500")}>
                     {contact.creditScore > 750 ? "Highly Reliable" : contact.creditScore > 600 ? "Average Risk" : "High Risk / NPA Alert"}
                   </Badge>
                   <Button variant="ghost" size="sm" className="text-xs">
                     View History <History className="ml-1 h-3 w-3" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {borrowingContacts.length === 0 && (
          <Card className="col-span-full py-12 text-center text-muted-foreground border-dashed">
            <Info className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-foreground">No contacts yet</h3>
            <p className="max-w-xs mx-auto mb-6">Create a profile for a friend or relative before lending or borrowing money.</p>
            <Button onClick={() => setOpen(true)} variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Your First Contact
            </Button>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>Create a profile for a friend, relative, or entity before recording transactions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Smith" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Relationship</label>
              <Select value={relationship} onValueChange={(v: BorrowingRelationship) => setRelationship(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship..." />
                </SelectTrigger>
                <SelectContent>
                  {relationships.map(rel => (
                    <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone (Optional)</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address (Optional)</label>
              <Textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter physical address..." className="min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Internal Notes (Optional)</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Specific details or deal conditions..." className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!name || !relationship}>Create Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
