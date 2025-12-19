import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      // Fetch all roles for the user
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = rolesData?.map((r) => r.role) || [];

      // Determine highest role
      let highestRole: AppRole = "user";
      if (roles.includes("master_admin")) {
        highestRole = "master_admin";
      } else if (roles.includes("admin")) {
        highestRole = "admin";
      }

      setRole(highestRole);

      // Fetch company for non-master users
      if (highestRole !== "master_admin") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", user.id)
          .maybeSingle();

        setCompanyId(profile?.company_id || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    userId,
    role,
    isMasterAdmin: role === "master_admin",
    isAdmin: role === "admin" || role === "master_admin",
    isUser: role === "user",
    loading,
    companyId,
  };
}
