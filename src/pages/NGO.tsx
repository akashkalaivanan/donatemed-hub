import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { NGOStats } from "@/components/ngo/NGOStats";
import { AvailableMedicines } from "@/components/ngo/AvailableMedicines";
import { ClaimedMedicines } from "@/components/ngo/ClaimedMedicines";
import { NGOProfileSettings } from "@/components/ngo/NGOProfileSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const handleUpdate = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <DashboardLayout title="NGO Dashboard" role="ngo">
      <div className="space-y-6">
        <NGOStats refresh={refresh} />
        
        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="available">Available Medicines</TabsTrigger>
            <TabsTrigger value="claimed">My Claims</TabsTrigger>
            <TabsTrigger value="settings">Requirements</TabsTrigger>
          </TabsList>
          <TabsContent value="available" className="space-y-4">
            <AvailableMedicines refresh={refresh} onClaim={handleUpdate} />
          </TabsContent>
          <TabsContent value="claimed" className="space-y-4">
            <ClaimedMedicines refresh={refresh} />
          </TabsContent>
          <TabsContent value="settings" className="space-y-4">
            <NGOProfileSettings />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default NGO;
