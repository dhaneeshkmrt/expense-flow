'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultSettings } from '@/lib/data';
import type { Settings, User } from '@/lib/types';
import { logChange } from '@/lib/logger';

export function useSettings(tenantId: string | null, user: User | null) {
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, tenantId: '', userId: '' });
  const [loadingSettings, setLoadingSettings] = useState(true);

  const seedDefaultSettings = useCallback(async (tenantIdToSeed: string, userIdToSeed: string) => {
    const docId = `${tenantIdToSeed}_${userIdToSeed}`;
    const settingsRef = doc(db, 'settings', docId);
    const newSettings = { ...defaultSettings, tenantId: tenantIdToSeed, userId: userIdToSeed };
    await setDoc(settingsRef, newSettings);
    return newSettings;
  }, []);

  const fetchSettings = useCallback(async (tenantIdToFetch: string, userIdToFetch: string) => {
    setLoadingSettings(true);
    try {
        const docId = `${tenantIdToFetch}_${userIdToFetch}`;
        const settingsRef = doc(db, 'settings', docId);
        const docSnap = await getDoc(settingsRef);

        if (!docSnap.exists()) {
            const newSettings = await seedDefaultSettings(tenantIdToFetch, userIdToFetch);
            setSettings(newSettings);
        } else {
            const data = docSnap.data() as Omit<Settings, 'tenantId' | 'userId'>;
            setSettings({ ...defaultSettings, ...data, tenantId: tenantIdToFetch, userId: userIdToFetch });
        }
    } catch (error) {
        console.error("Error fetching user settings: ", error);
    } finally {
        setLoadingSettings(false);
    }
  }, [seedDefaultSettings]);

  useEffect(() => {
    if (tenantId && user?.name) {
      fetchSettings(tenantId, user.name);
    } else if (!tenantId) {
      setSettings({ ...defaultSettings, tenantId: '', userId: ''});
      setLoadingSettings(false);
    }
  }, [tenantId, user?.name, fetchSettings]);

  const updateSettings = async (newSettings: Partial<Omit<Settings, 'tenantId' | 'userId'>>) => {
      if (!tenantId || !user) return;
      const oldSettings = { ...settings };
      const docId = `${tenantId}_${user.name}`;
      try {
          const settingsRef = doc(db, 'settings', docId);
          await setDoc(settingsRef, newSettings, { merge: true });
          const updatedSettings = { ...settings, ...newSettings};
          setSettings(updatedSettings);

          await logChange(
            tenantId,
            user.name,
            'UPDATE',
            'settings',
            docId,
            'Updated personal settings',
            oldSettings,
            updatedSettings
          );
      } catch (error) {
          console.error("Error updating settings: ", error);
      }
  };

  return { settings, loadingSettings, updateSettings, seedDefaultSettings };
}
