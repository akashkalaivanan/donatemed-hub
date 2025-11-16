import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Package, Calendar, Hash, User } from "lucide-react";

interface Donation {
  id: string;
  medicine_name: string;
  quantity: number;
  expiry_date: string;
  description: string;
  donor_id: string;
  profiles: {
    name: string;
  };
}

export const PendingDonations = ({ onUpdate }: { onUpdate: () => void }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingDonations();
  }, []);

  const fetchPendingDonations = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          profiles!donor_id(name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      toast.error("Failed to load donations");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (donationId: string) => {
    setProcessing(donationId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const { error } = await supabase
        .from("donations")
        .update({ status: "approved" })
        .eq("id", donationId);

      if (error) throw error;

      // Trigger mapping algorithm with auth
      const { error: fnError } = await supabase.functions.invoke("map-donation", {
        body: { donationId },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (fnError) {
        console.error("Mapping error:", fnError);
        toast.error("Donation approved but mapping failed");
      } else {
        toast.success("Donation approved and mapped!");
      }
      
      fetchPendingDonations();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve donation");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (donationId: string) => {
    setProcessing(donationId);
    try {
      const { error } = await supabase
        .from("donations")
        .update({ status: "rejected" })
        .eq("id", donationId);

      if (error) throw error;

      toast.success("Donation rejected");
      fetchPendingDonations();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject donation");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (donations.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No pending donations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {donations.map((donation) => (
        <Card key={donation.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{donation.medicine_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{donation.profiles.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span>Quantity: {donation.quantity}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Expires: {new Date(donation.expiry_date).toLocaleDateString()}</span>
            </div>
            {donation.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{donation.description}</p>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => handleApprove(donation.id)}
                disabled={processing === donation.id}
                className="flex-1 bg-success hover:bg-success/90"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleReject(donation.id)}
                disabled={processing === donation.id}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
