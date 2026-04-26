export {
  changeOwnPassword,
  getAccessToken,
  getCurrentAdminId,
  getCurrentAdminRole,
  isAuthenticated,
  isSuperAdmin,
  login,
  logout,
} from './api/sessionApi';
export type { ChangeOwnPasswordResult, LoginResult } from './api/sessionApi';
