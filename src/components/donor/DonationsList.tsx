import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Package, Calendar, Hash } from "lucide-react";

interface Donation {
  id: string;
  medicine_name: string;
  quantity: number;
  expiry_date: string;
  description: string;
  status: string;
  created_at: string;
}

export const DonationsList = ({ refresh }: { refresh: number }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, [refresh]);

  const fetchDonations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success text-success-foreground";
      case "pending": return "bg-warning text-warning-foreground";
      case "rejected": return "bg-destructive text-destructive-foreground";
      case "claimed": return "bg-accent text-accent-foreground";
      default: return "bg-muted text-muted-foreground";
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
          <p className="text-lg text-muted-foreground">No donations yet</p>
          <p className="text-sm text-muted-foreground">Add your first donation above</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {donations.map((donation) => (
        <Card key={donation.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg font-semibold">{donation.medicine_name}</CardTitle>
              <Badge className={getStatusColor(donation.status)}>
                {donation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
