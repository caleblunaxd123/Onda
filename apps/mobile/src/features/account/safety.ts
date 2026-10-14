import {useEffect} from 'react';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {create} from 'zustand';
import {request} from '../../api';
import {useAuth} from './session';

export type BlockedAccount = {id: string; name: string; at: string};
const cache = create<{account?: string; items: BlockedAccount[]}>(() => ({items: []}));
export function blockedAccountIds() {
  const state = cache.getState();
  return state.account === useAuth.getState().session?.user.id ? state.items.map(x => x.id) : [];
}
export function useBlocks() {
  const session = useAuth(s => s.session);
  const client = useQueryClient();
  const key = ['safety-blocks', session?.user.id];
  const query = useQuery({queryKey: key, enabled: !!session, retry: 1, refetchInterval: 60000,
    queryFn: ({signal}) => request<{items: BlockedAccount[]}>('/api/v1/safety/blocks/', {token: session?.token, signal})});
  useEffect(() => {
    if (session && query.data) cache.setState({account: session.user.id, items: query.data.items});
  }, [session, query.data]);
  const setBlocked = async (person: Pick<BlockedAccount, 'id' | 'name'>, blocked: boolean) => {
    if (!session) throw new Error('Inicia sesión para guardar tus bloqueos.');
    await request<void>('/api/v1/safety/blocks/' + person.id, {method: blocked ? 'PUT' : 'DELETE', token: session.token});
    // Do not let a late response from a previous account change this account's view.
    if (useAuth.getState().session?.user.id !== session.user.id) return;
    await client.cancelQueries({queryKey: key});
    client.setQueryData<{items: BlockedAccount[]}>(key, old => {
      const items = (old?.items ?? []).filter(x => x.id !== person.id);
      if (blocked) items.unshift({...person, at: new Date().toISOString()});
      cache.setState({account: session.user.id, items});
      return {items};
    });
    void client.invalidateQueries({queryKey: ['rooms']});
    void client.invalidateQueries({queryKey: key});
  };
  return {...query, items: query.data?.items ?? [], setBlocked};
}
export function SafetySync() {useBlocks(); return null;}
