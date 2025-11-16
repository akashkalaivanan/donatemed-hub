import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PendingDonations } from "@/components/admin/PendingDonations";
import { InventoryView } from "@/components/admin/InventoryView";
import { UserManagement } from "@/components/admin/UserManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";

const Admin = () => {
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

    if (profile?.role !== "admin") {
      navigate(`/${profile?.role || "auth"}`);
    }
  };

  const handleUpdate = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <DashboardLayout title="Admin Dashboard" role="admin">
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-4">
          <PendingDonations onUpdate={handleUpdate} />
        </TabsContent>
        <TabsContent value="inventory" className="space-y-4">
          <InventoryView refresh={refresh} />
        </TabsContent>
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Admin;
