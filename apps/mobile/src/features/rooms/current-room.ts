import {useQuery} from '@tanstack/react-query';
import {request} from '../../api';
import {useAuth} from '../account/session';
import type {Room} from './types';

export function useCurrentRoom() {
  const session = useAuth(state => state.session);
  return useQuery({queryKey: ['current-room', session?.user.id], enabled: !!session, refetchInterval: 15000,
    queryFn: async ({signal}) => (await request<Room | undefined>('/api/v1/rooms/current', {token: session?.token, signal})) ?? null,
    retry: 1});
}
