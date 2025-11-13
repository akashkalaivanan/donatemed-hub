import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AvailableMedicines } from "@/components/ngo/AvailableMedicines";
import { supabase } from "@/lib/supabase";

const NGO = () => {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role !== "ngo") {
      navigate(`/${profile?.role || "auth"}`);
    }
  };

  return (
    <DashboardLayout title="Available Medicines" role="ngo">
      <AvailableMedicines refresh={refresh} />
    </DashboardLayout>
  );
};

export default NGO;
