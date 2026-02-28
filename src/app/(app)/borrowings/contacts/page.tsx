'use client';

import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, UserPlus, Phone, Mail, Award, History, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function ContactsPage() {
  const { borrowingContacts, addBorrowingContact, borrowings } = useApp();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!name) return;
    try {
      await addBorrowingContact(name, email, phone);
      toast({ title: 'Contact Created', description: `${name} has been added.` });
      setOpen(false);
      setName(''); setEmail(''); setPhone('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
          const totalLent = contactBorrowings.filter(b => b.type === 'Lent').reduce((s, b) => s + b.amount, 0);
          
          return (
            <Card key={contact.id} className="relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <div className="text-right">
                  <div className={cn("text-2xl font-black", getScoreColor(contact.creditScore))}>
                    {contact.creditScore}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-muted-foreground">Trust Score</div>
                </div>
              </div>
              <CardHeader>
                <CardTitle>{contact.name}</CardTitle>
                <CardDescription className="flex flex-col gap-1 mt-2">
                  {contact.phone && <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {contact.phone}</div>}
                  {contact.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {contact.email}</div>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
          <Card className="col-span-full py-12 text-center text-muted-foreground">
            No contacts created yet. Click "New Contact" to start.
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New contact</DialogTitle>
            <DialogDescription>Create a profile for a friend or entity before lending money.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Smith" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (Optional)</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone (Optional)</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 234 567 890" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!name}>Create Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { cn } from '@/lib/utils';
