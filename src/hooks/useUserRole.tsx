import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "master_admin" | "admin" | "user";

interface UseUserRoleReturn {
  userId: string | null;
  role: AppRole | null;
  isMasterAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  companyId: string | null;
}

export function useUserRole(): UseUserRoleReturn {
  const { userId, role, isMasterAdmin, isAdmin, isUser, loading, companyId } = useAuth();

  return {
    userId,
    role,
    isMasterAdmin,
    isAdmin,
    isUser,
    loading,
    companyId,
  };
}
