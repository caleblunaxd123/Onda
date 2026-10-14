import {useQuery} from '@tanstack/react-query';
import {request} from '../../api';
import {useAuth} from './session';
export function useModerationAccess() {
  const session = useAuth(s => s.session);
  return useQuery({queryKey: ['moderation-access', session?.user.id], enabled: !!session && !session.user.guest, retry: false,
    queryFn: ({signal}) => request<{allowed: boolean}>('/api/v1/moderation/access', {token: session?.token, signal})});
}
