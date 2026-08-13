'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/store/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Pencil } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (user) setName(user.name ?? '');
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setError('');
    setSuccess('');
    setIsSaving(true);
    try {
      // TODO: wire this to your actual update-profile API/AuthContext method
      // e.g. await updateProfile({ name });
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <AppShell>
        <div />
      </AppShell>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <AppShell>
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-muted-foreground">Your account information</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-start gap-2.5 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            <p className="text-sm text-green-500">{success}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
            <img
              src={user.avatar?.trim() || '/image/user.png'}
              alt={user.name}
              className="w-16 h-16 rounded-full bg-muted object-cover border border-border"
              onError={(e) => { e.currentTarget.src = '/image/user.png'; }}
            />
            <div>
              <h2 className="font-semibold text-foreground text-lg">{user.name}</h2>
              <p className="text-sm text-muted-foreground capitalize">
                {user.role?.replace('_', ' ') ?? 'user'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground outline-none focus:border-primary"
                />
              ) : (
                <p className="text-sm text-foreground">{user.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email</label>
              <p className="text-sm text-foreground">{user.email}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
              <p className="text-sm text-foreground capitalize">{user.role?.replace('_', ' ') ?? 'user'}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-border">
            {isEditing ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  onClick={() => { setIsEditing(false); setName(user.name ?? ''); setError(''); }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10 gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}