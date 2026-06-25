'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SocialAccount } from '@/types';
import { socialService } from '@/services/socialService';

interface AccountsContextType {
  accounts: SocialAccount[];
  isLoading: boolean;
  error: string | null;
  loadAccounts: (userId: string) => Promise<void>;
  connectAccount: (
    userId: string,
    platform: 'facebook' | 'instagram' | 'linkedin',
    accountData: Partial<SocialAccount>
  ) => Promise<SocialAccount>;
  disconnectAccount: (accountId: string) => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

export function AccountsProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedAccounts = await socialService.getAccounts(userId);
      setAccounts(fetchedAccounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectAccount = useCallback(
    async (
      userId: string,
      platform: 'facebook' | 'instagram' | 'linkedin',
      accountData: Partial<SocialAccount>
    ) => {
      try {
        const newAccount = await socialService.connectAccount(
          userId,
          platform,
          accountData
        );
        setAccounts((prev) => [...prev, newAccount]);
        return newAccount;
      } catch (err) {
        throw err instanceof Error ? err : new Error('Failed to connect account');
      }
    },
    []
  );

  const disconnectAccount = useCallback(async (accountId: string) => {
    try {
      await socialService.disconnectAccount(accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to disconnect account');
    }
  }, []);

  const value: AccountsContextType = {
    accounts,
    isLoading,
    error,
    loadAccounts,
    connectAccount,
    disconnectAccount,
  };

  return (
    <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
}
