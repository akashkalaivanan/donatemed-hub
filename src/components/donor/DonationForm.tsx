import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface DonationFormProps {
  onSuccess: () => void;
}

export const DonationForm = ({ onSuccess }: DonationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medicine_name: "",
    quantity: "",
    expiry_date: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("donations").insert({
        donor_id: user.id,
        medicine_name: formData.medicine_name,
        quantity: parseInt(formData.quantity),
        expiry_date: formData.expiry_date,
        description: formData.description,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Donation submitted successfully!");
      setFormData({
        medicine_name: "",
        quantity: "",
        expiry_date: "",
        description: "",
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit donation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Add New Donation
        </CardTitle>
        <CardDescription>Fill in the details of the medicine you want to donate</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="medicine_name">Medicine Name *</Label>
            <Input
              id="medicine_name"
              placeholder="e.g., Paracetamol, Amoxicillin"
              value={formData.medicine_name}
              onChange={(e) => setFormData({ ...formData, medicine_name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                placeholder="100"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry_date">Expiry Date *</Label>
              <Input
                id="expiry_date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Additional information about the medicine..."
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-hero hover:opacity-90">
            {loading ? "Submitting..." : "Submit Donation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
