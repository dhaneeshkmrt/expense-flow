
'use client';

import { useState, useCallback } from 'react';
import { useApp } from '@/lib/provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Download, Upload, AlertTriangle, ShieldCheck } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const dynamic = 'force-dynamic';

const AccessDenied = () => (
    <div className="flex flex-col gap-6 items-center justify-center h-full">
        <AlertTriangle className="w-16 h-16 text-destructive"/>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this page. Please contact your administrator.</p>
    </div>
);

export default function BackupPage() {
  const { backupAllData, restoreAllData, isAdminUser } = useApp();
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      await backupAllData();
      toast({
        title: 'Backup Successful',
        description: 'Your data has been downloaded.',
      });
    } catch (error: any) {
      toast({
        title: 'Backup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setRestoreFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    } else {
        setRestoreFile(null);
        setRestoreFileContent(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreFileContent) return;
    setShowRestoreConfirm(false);
    setIsRestoring(true);

    try {
      const data = JSON.parse(restoreFileContent);
      await restoreAllData(data);
      toast({
        title: 'Restore Successful',
        description: 'Your data has been restored from the backup.',
      });
      setRestoreFile(null);
      setRestoreFileContent(null);
    } catch (error: any) {
      toast({
        title: 'Restore Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };
  
  if (!isAdminUser) {
    return <AccessDenied />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download />
              Backup Database
            </CardTitle>
            <CardDescription>
              Download a complete backup of all tenants, categories, transactions, and settings. Keep this file in a safe place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={isBackingUp}>
              {isBackingUp && <Loader2 className="mr-2 animate-spin" />}
              Download Backup File
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Upload />
              Restore Database
            </CardTitle>
            <CardDescription>
                Restore the entire database from a backup file. This is a destructive action and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                    Restoring from a backup will completely delete all current data in the database.
                </AlertDescription>
            </Alert>
            <div className="space-y-2">
                <Input id="restore-file" type="file" accept=".json" onChange={handleFileChange} disabled={isRestoring} />
                 {restoreFile && (
                    <p className="text-sm text-muted-foreground">Selected file: {restoreFile.name}</p>
                 )}
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowRestoreConfirm(true)}
              disabled={!restoreFileContent || isRestoring}
            >
              {isRestoring && <Loader2 className="mr-2 animate-spin" />}
              Restore From Backup
            </Button>
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will permanently ERASE all data in the database and replace it with the data from the backup file. This cannot be undone. Are you sure you want to proceed?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={handleRestore}
                    >
                       Yes, Restore Database
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
