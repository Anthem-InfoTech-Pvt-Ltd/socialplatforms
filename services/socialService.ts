import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export const socialService = {
  async getAccounts(userId: string) {
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_connected', true)

    if (error) throw new Error(error.message)

    return (data ?? []).map(a => ({
      id: a.id,
      userId: a.user_id,
      platform: a.platform,
      accountName: a.account_name,
      accountId: a.account_id,
      accessToken: a.access_token,
      isConnected: a.is_connected,
      connectedAt: a.connected_at,
    }))
  },

  async connectAccount(
    userId: string,
    platform: 'facebook' | 'instagram' | 'linkedin',
    accountData: Partial<{ accountName: string; accountId: string }>
  ) {
    const { data, error } = await supabase
      .from('social_accounts')
      .insert({
        user_id: userId,
        platform,
        account_name: accountData.accountName ?? `${platform} Account`,
        account_id: accountData.accountId ?? `${platform}_${Date.now()}`,
        access_token: 'mock_token',
        is_connected: true
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return {
      id: data.id,
      userId: data.user_id,
      platform: data.platform,
      accountName: data.account_name,
      accountId: data.account_id,
      accessToken: data.access_token,
      isConnected: data.is_connected,
      connectedAt: data.connected_at,
    }
  },

  async disconnectAccount(accountId: string) {
    const { error } = await supabase
      .from('social_accounts')
      .update({ is_connected: false })
      .eq('id', accountId)

    if (error) throw new Error(error.message)
  },

  async saveAccount(userId: string, platform: string, tokenData: any) {
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert({
        user_id: userId,
        platform,
        account_name: tokenData.accountName,
        account_id: tokenData.accountId,
        access_token: tokenData.accessToken,
        refresh_token: tokenData.refreshToken,
        expires_at: tokenData.expiresAt,
        is_connected: true
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return data
  }
}