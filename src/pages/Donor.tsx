import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DonorStats } from "@/components/donor/DonorStats";
import { DonationForm } from "@/components/donor/DonationForm";
import { DonationsList } from "@/components/donor/DonationsList";
import { supabase } from "@/lib/supabase";

const Donor = () => {
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
      .select("role, status")
      .eq("id", session.user.id)
      .single();

    // Check if user is blocked
    if (profile?.status === 'blocked') {
      await supabase.auth.signOut();
      navigate("/auth?blocked=true");
      return;
    }

    if (profile?.role !== "donor") {
      navigate(`/${profile?.role || "auth"}`);
    }
  };

  const handleDonationSuccess = () => {
    setRefresh(prev => prev + 1);
  };

  return (
    <DashboardLayout title="Donor Dashboard" role="donor">
      <div className="space-y-8">
        <DonorStats refresh={refresh} />
        <DonationForm onSuccess={handleDonationSuccess} />
        <div>
          <h3 className="text-xl font-semibold mb-4">Your Donation History</h3>
          <DonationsList refresh={refresh} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Donor;
