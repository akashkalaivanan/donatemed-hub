import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Package, Calendar, Hash, User } from "lucide-react";
import { toast } from "sonner";

interface ClaimedMedicine {
  id: string;
  claimed_at: string;
  donations: {
    id: string;
    medicine_name: string;
    quantity: number;
    expiry_date: string;
    description: string;
    profiles: {
      name: string;
    };
  };
}

export const ClaimedMedicines = ({ refresh }: { refresh: number }) => {
  const [medicines, setMedicines] = useState<ClaimedMedicine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaimedMedicines();
  }, [refresh]);

  const fetchClaimedMedicines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ngo } = await supabase
        .from("ngos")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!ngo) return;

      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          donations(
            *,
            profiles!donor_id(name)
          )
        `)
        .eq("ngo_id", ngo.id)
        .order("claimed_at", { ascending: false });

      if (error) throw error;
      setMedicines(data || []);
    } catch (error) {
      console.error("Error fetching claimed medicines:", error);
      toast.error("Failed to load claimed medicines");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (medicines.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No claimed medicines yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {medicines.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg font-semibold">{item.donations.medicine_name}</CardTitle>
              <Badge className="bg-emerald-600 dark:bg-emerald-400">Claimed</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Donor: {item.donations.profiles.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span>Quantity: {item.donations.quantity}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Expires: {new Date(item.donations.expiry_date).toLocaleDateString()}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Claimed: {new Date(item.claimed_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
