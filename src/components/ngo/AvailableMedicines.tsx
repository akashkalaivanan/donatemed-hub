import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Package, Calendar, Hash, HandHeart } from "lucide-react";

interface Medicine {
  id: string;
  medicine_name: string;
  quantity: number;
  expiry_date: string;
  description: string;
  profiles: {
    name: string;
  };
  mappings?: {
    similarity_score: number;
  }[];
}

export const AvailableMedicines = ({ refresh, onClaim }: { refresh: number; onClaim?: () => void }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableMedicines();
  }, [refresh]);

  const fetchAvailableMedicines = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          profiles!donor_id(name),
          mappings(similarity_score)
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMedicines(data || []);
    } catch (error) {
      console.error("Error fetching medicines:", error);
      toast.error("Failed to load medicines");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (donationId: string) => {
    setClaiming(donationId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get NGO ID
      const { data: ngo } = await supabase
        .from("ngos")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!ngo) throw new Error("NGO profile not found");

      // Create claim
      const { error: claimError } = await supabase
        .from("claims")
        .insert({
          donation_id: donationId,
          ngo_id: ngo.id,
          claimed_by: user.id,
        });

      if (claimError) throw claimError;

      // Update donation status
      const { error: updateError } = await supabase
        .from("donations")
        .update({ status: "claimed" })
        .eq("id", donationId);

      if (updateError) throw updateError;

      toast.success("Medicine claimed successfully!");
      fetchAvailableMedicines();
      onClaim?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to claim medicine");
    } finally {
      setClaiming(null);
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
          <p className="text-lg text-muted-foreground">No medicines available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {medicines.map((medicine) => (
        <Card key={medicine.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg font-semibold">{medicine.medicine_name}</CardTitle>
              {medicine.mappings && medicine.mappings.length > 0 && (
                <Badge variant="outline" className="bg-accent/20">
                  Suggested
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>From: {medicine.profiles.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span>Quantity: {medicine.quantity}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Expires: {new Date(medicine.expiry_date).toLocaleDateString()}</span>
            </div>
            {medicine.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{medicine.description}</p>
            )}
            <Button
              onClick={() => handleClaim(medicine.id)}
              disabled={claiming === medicine.id}
              className="w-full mt-2 bg-gradient-hero hover:opacity-90"
            >
              <HandHeart className="w-4 h-4 mr-2" />
              {claiming === medicine.id ? "Claiming..." : "Claim Medicine"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
