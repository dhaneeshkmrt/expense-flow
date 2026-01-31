
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { defaultSettings } from '@/lib/data';
import type { Settings, User } from '@/lib/types';
import { logChange } from '@/lib/logger';

export function useSettings(tenantId: string | null, user: User | null) {
  const [settings, setSettings] = useState<Settings>({ ...defaultSettings, tenantId: '' });
  const [loadingSettings, setLoadingSettings] = useState(true);

  const seedDefaultSettings = useCallback(async (tenantIdToSeed: string) => {
    const settingsRef = doc(db, 'settings', tenantIdToSeed);
    const newSettings = { ...defaultSettings, tenantId: tenantIdToSeed };
    await setDoc(settingsRef, newSettings);
    return newSettings;
  }, []);

  const fetchSettings = useCallback(async (tenantIdToFetch: string) => {
    setLoadingSettings(true);
    try {
        const settingsRef = doc(db, 'settings', tenantIdToFetch);
        const docSnap = await getDoc(settingsRef);

        if (!docSnap.exists()) {
            const newSettings = await seedDefaultSettings(tenantIdToFetch);
            setSettings(newSettings);
        } else {
            const data = docSnap.data() as Omit<Settings, 'tenantId'>;
            setSettings({ ...defaultSettings, ...data, tenantId: tenantIdToFetch });
        }
    } catch (error) {
        console.error("Error fetching settings: ", error);
    } finally {
        setLoadingSettings(false);
    }
  }, [seedDefaultSettings]);

  useEffect(() => {
    if (tenantId) {
      fetchSettings(tenantId);
    } else {
      setSettings({ ...defaultSettings, tenantId: ''});
      setLoadingSettings(false);
    }
  }, [tenantId, fetchSettings]);

  const updateSettings = async (newSettings: Partial<Omit<Settings, 'tenantId'>>) => {
      if (!tenantId || !user) return;
      const oldSettings = { ...settings };
      try {
          const settingsRef = doc(db, 'settings', tenantId);
          await setDoc(settingsRef, newSettings, { merge: true });
          const updatedSettings = { ...settings, ...newSettings};
          setSettings(updatedSettings);

          await logChange(
            tenantId,
            user.name,
            'UPDATE',
            'settings',
            tenantId,
            'Updated tenant settings',
            oldSettings,
            updatedSettings
          );
      } catch (error) {
          console.error("Error updating settings: ", error);
      }
  };

  return { settings, loadingSettings, updateSettings, seedDefaultSettings };
}
