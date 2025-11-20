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
  image_url?: string;
  profiles: {
    name: string;
  };
  mappings?: {
    similarity_score: number;
  }[];
}

interface MatchInfo {
  isMatch: boolean;
  score: number;
}

export const AvailableMedicines = ({ refresh, onClaim }: { refresh: number; onClaim?: () => void }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [ngoRequirements, setNgoRequirements] = useState<string>("");
  const [matchScores, setMatchScores] = useState<Record<string, MatchInfo>>({});

  useEffect(() => {
    fetchNGORequirements();
    fetchAvailableMedicines();
  }, [refresh]);

  const fetchNGORequirements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ngo } = await supabase
        .from("ngos")
        .select("requirements")
        .eq("user_id", user.id)
        .single();

      if (ngo?.requirements) {
        setNgoRequirements(ngo.requirements);
      }
    } catch (error) {
      console.error("Error fetching NGO requirements:", error);
    }
  };

  const calculateMatch = (description: string): MatchInfo => {
    if (!ngoRequirements || !description) {
      return { isMatch: false, score: 0 };
    }

    // Parse requirements if it's JSON array
    let requirementsText = ngoRequirements;
    try {
      const parsed = JSON.parse(ngoRequirements);
      if (Array.isArray(parsed)) {
        requirementsText = parsed.map((r: any) => r.text).join(' ').toLowerCase();
      }
    } catch {
      // Keep as is if not JSON (old format)
    }

    const descLower = description.toLowerCase();
    const reqWords = requirementsText.split(/\s+/).filter(w => w.length > 3);
    const descWords = descLower.split(/\s+/).filter(w => w.length > 3);
    
    let matchCount = 0;
    reqWords.forEach(reqWord => {
      if (descWords.some(descWord => descWord.includes(reqWord) || reqWord.includes(descWord))) {
        matchCount++;
      }
    });

    const score = reqWords.length > 0 ? (matchCount / reqWords.length) * 100 : 0;
    return {
      isMatch: score >= 30,
      score: Math.round(score)
    };
  };

  const fetchAvailableMedicines = async () => {
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
        .from("donations")
        .select(`
          *,
          profiles!donor_id(name),
          mappings!inner(
            similarity_score,
            ngo_id
          )
        `)
        .eq("status", "approved")
        .eq("mappings.ngo_id", ngo.id)
        .order("mappings.similarity_score", { ascending: false });

      if (error) throw error;
      
      const medicinesData = data || [];
      setMedicines(medicinesData);

      // Calculate match scores
      const scores: Record<string, MatchInfo> = {};
      medicinesData.forEach((med) => {
        if (med.description) {
          scores[med.id] = calculateMatch(med.description);
        }
      });
      setMatchScores(scores);
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

      // Get NGO ID or create if doesn't exist
      let { data: ngo } = await supabase
        .from("ngos")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!ngo) {
        // Auto-create NGO profile if missing
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, organization_name")
          .eq("id", user.id)
          .single();

        const { data: newNgo, error: createError } = await supabase
          .from("ngos")
          .insert({
            user_id: user.id,
            organization_name: profile?.organization_name || profile?.name || "NGO Organization",
            contact_email: user.email
          })
          .select("id")
          .single();

        if (createError) throw createError;
        ngo = newNgo;
      }

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
      {medicines.map((medicine) => {
        const matchInfo = matchScores[medicine.id];
        return (
          <Card key={medicine.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  {medicine.medicine_name}
                </CardTitle>
                <div className="flex flex-col gap-1">
                  {medicine.mappings && medicine.mappings.length > 0 && (
                    <>
                      <Badge variant="outline" className="bg-primary/10 border-primary text-xs">
                        🎯 AI Matched
                      </Badge>
                      <Badge variant="default" className="bg-primary text-xs">
                        {Math.round((medicine.mappings[0].similarity_score || 0) * 100)}% Match
                      </Badge>
                    </>
                  )}
                  {!medicine.mappings?.length && matchInfo?.isMatch && (
                    <Badge variant="secondary" className="text-xs">
                      {matchInfo.score}% Match
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {medicine.image_url && (
                <div className="w-full h-40 rounded-lg overflow-hidden border">
                  <img 
                    src={medicine.image_url} 
                    alt={medicine.medicine_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
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
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Description:</span> {medicine.description}
                </p>
              </div>
            )}
            {medicine.mappings && medicine.mappings.length > 0 && (
              <div className="pt-2 border-t bg-primary/5 -mx-6 px-6 py-3 rounded-b-lg mt-3">
                <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
                  <HandHeart className="w-3 h-3" />
                  Why this matches your requirements:
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Our AI algorithm analyzed this donation and found it highly relevant to your organization's medicine requirements ({Math.round((medicine.mappings[0].similarity_score || 0) * 100)}% match). This suggests it aligns well with your stated needs.
                </p>
              </div>
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
        );
      })}
    </div>
  );
};
