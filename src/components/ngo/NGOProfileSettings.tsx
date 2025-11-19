import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Save, Plus, Pencil, Trash2, X } from "lucide-react";

interface Requirement {
  id: string;
  text: string;
}

export const NGOProfileSettings = () => {
  const [loading, setLoading] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [ngoId, setNgoId] = useState<string | null>(null);
  const [newRequirement, setNewRequirement] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

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
        try {
          const parsed = ngo.requirements ? JSON.parse(ngo.requirements) : [];
          setRequirements(Array.isArray(parsed) ? parsed : []);
        } catch {
          // If it's old format (plain text), convert to array
          if (ngo.requirements) {
            setRequirements([{ id: crypto.randomUUID(), text: ngo.requirements }]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching NGO profile:", error);
    }
  };

  const handleAddRequirement = async () => {
    if (!newRequirement.trim()) {
      toast.error("Please enter a requirement");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!ngoId) {
        throw new Error("NGO profile not found");
      }

      const newReq: Requirement = {
        id: crypto.randomUUID(),
        text: newRequirement.trim()
      };

      const updatedRequirements = [...requirements, newReq];

      const { error } = await supabase
        .from("ngos")
        .update({ requirements: JSON.stringify(updatedRequirements) })
        .eq("id", ngoId);

      if (error) throw error;

      setRequirements(updatedRequirements);
      setNewRequirement("");
      toast.success("Requirement added successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add requirement");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRequirement = async () => {
    if (!editText.trim()) {
      toast.error("Please enter a requirement");
      return;
    }

    setLoading(true);
    try {
      const updatedRequirements = requirements.map(req =>
        req.id === editingId ? { ...req, text: editText.trim() } : req
      );

      const { error } = await supabase
        .from("ngos")
        .update({ requirements: JSON.stringify(updatedRequirements) })
        .eq("id", ngoId!);

      if (error) throw error;

      setRequirements(updatedRequirements);
      setEditingId(null);
      setEditText("");
      toast.success("Requirement updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update requirement");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    setLoading(true);
    try {
      const updatedRequirements = requirements.filter(req => req.id !== id);

      const { error } = await supabase
        .from("ngos")
        .update({ requirements: JSON.stringify(updatedRequirements) })
        .eq("id", ngoId!);

      if (error) throw error;

      setRequirements(updatedRequirements);
      toast.success("Requirement deleted successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete requirement");
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
          Add specific medicine requirements for your organization. Each requirement helps match donations better.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Requirement */}
        <div className="space-y-2">
          <Label htmlFor="newRequirement">Add New Requirement</Label>
          <div className="flex gap-2">
            <Input
              id="newRequirement"
              placeholder="e.g., Antibiotics for respiratory infections"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddRequirement()}
            />
            <Button onClick={handleAddRequirement} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-3">
          <Label>Current Requirements ({requirements.length})</Label>
          {requirements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              No requirements added yet. Add your first requirement above.
            </p>
          ) : (
            <div className="space-y-2">
              {requirements.map((req) => (
                <div key={req.id} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                  {editingId === req.id ? (
                    <>
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleEditRequirement} disabled={loading}>
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setEditingId(null);
                          setEditText("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-sm py-2">{req.text}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(req.id);
                          setEditText(req.text);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRequirement(req.id)}
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
