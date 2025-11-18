import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const NGOProfileSettings = () => {
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState("");
  const [ngoId, setNgoId] = useState<string | null>(null);

  useEffect(() => {
    fetchNGOProfile();
  }, []);

  const fetchNGOProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ngo } = await supabase
        .from("ngos")
        .select("id, requirements")
        .eq("user_id", user.id)
        .single();

      if (ngo) {
        setNgoId(ngo.id);
        setRequirements(ngo.requirements || "");
      }
    } catch (error) {
      console.error("Error fetching NGO profile:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!ngoId) {
        throw new Error("NGO profile not found");
      }

      const { error } = await supabase
        .from("ngos")
        .update({ requirements: requirements.trim() || null })
        .eq("id", ngoId);

      if (error) throw error;

      toast.success("Requirements updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update requirements");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Save className="w-5 h-5" />
          Medicine Requirements
        </CardTitle>
        <CardDescription>
          Describe what types of medicines your organization needs. This helps match donations with your requirements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="requirements">Requirements Description</Label>
          <Textarea
            id="requirements"
            placeholder="e.g., We need antibiotics, pain relievers, and diabetes medication for our community health center..."
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            rows={6}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Be specific about medicine types, conditions treated, or patient demographics to get better matches.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Requirements"}
        </Button>
      </CardContent>
    </Card>
  );
};
