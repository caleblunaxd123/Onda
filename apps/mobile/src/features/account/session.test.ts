import {beforeEach, describe, expect, it, vi} from 'vitest';
import {useAuth, type Session} from './session';
const storage = vi.hoisted(() => ({setItemAsync: vi.fn().mockResolvedValue(undefined), deleteItemAsync: vi.fn().mockResolvedValue(undefined), getItemAsync: vi.fn().mockResolvedValue(null)}));
vi.mock('react-native', () => ({Platform: {OS: 'android'}}));
vi.mock('expo-secure-store', () => ({...storage, WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1}));

const session: Session = {token: 'own-test-token', expiresAt: '2030-01-01T00:00:00Z', user: {id: 'own-test-user', displayName: 'QA', email: 'qa@example.test', guest: false}};
describe('one-time recovery across login navigation', () => {
  beforeEach(() => {vi.clearAllMocks(); useAuth.setState({session: null, recoveryCode: null});});
  it('keeps a new recovery code only in memory while persisting the clean session', async () => {
    const response = {...session, recoveryCode: 'PRIVATE-RECOVERY-TEST'};
    await useAuth.getState().setSession(response);
    expect(useAuth.getState().recoveryCode).toBe(response.recoveryCode);
    expect(useAuth.getState().session).not.toHaveProperty('recoveryCode');
    expect(JSON.parse(storage.setItemAsync.mock.calls[0][1])).not.toHaveProperty('recoveryCode');
    useAuth.getState().clearRecoveryCode();
    expect(useAuth.getState().recoveryCode).toBeNull();
  });
  it('does not expose a previous account code after changing accounts or signing out', async () => {
    const response = {...session, recoveryCode: 'PRIVATE-RECOVERY-TEST'};
    await useAuth.getState().setSession(response);
    await useAuth.getState().setSession({...session, user: {...session.user, id: 'another-own-test-user'}});
    expect(useAuth.getState().recoveryCode).toBeNull();
    await useAuth.getState().setSession(response);
    await useAuth.getState().setSession(null);
    expect(useAuth.getState().recoveryCode).toBeNull();
    expect(storage.deleteItemAsync).toHaveBeenCalled();
  });
});
