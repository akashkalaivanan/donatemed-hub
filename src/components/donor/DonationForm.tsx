import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { z } from "zod";

const donationSchema = z.object({
  medicine_name: z.string()
    .min(1, "Medicine name is required")
    .max(255, "Medicine name must be less than 255 characters")
    .regex(/^[a-zA-Z0-9\s\-,.()']+$/, "Medicine name contains invalid characters"),
  quantity: z.number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0")
    .max(100000, "Quantity seems unrealistic"),
  expiry_date: z.string()
    .refine((date) => new Date(date) >= new Date(new Date().setHours(0, 0, 0, 0)), {
      message: "Expiry date must be in the future"
    }),
  description: z.string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
});

interface DonationFormProps {
  onSuccess: () => void;
}

export const DonationForm = ({ onSuccess }: DonationFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState({
    medicine_name: "",
    quantity: "",
    expiry_date: "",
    description: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error("Only JPG, PNG, and WEBP images are allowed");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (userId: string): Promise<string | null> => {
    if (!imageFile) return null;

    setUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('medicine-images')
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('medicine-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error("Failed to upload image");
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate input data
      const validationResult = donationSchema.safeParse({
        medicine_name: formData.medicine_name.trim(),
        quantity: parseInt(formData.quantity),
        expiry_date: formData.expiry_date,
        description: formData.description?.trim() || undefined
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        setLoading(false);
        return;
      }

      // Upload image if provided
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(user.id);
      }

      const { error } = await supabase.from("donations").insert({
        donor_id: user.id,
        medicine_name: validationResult.data.medicine_name,
        quantity: validationResult.data.quantity,
        expiry_date: validationResult.data.expiry_date,
        description: validationResult.data.description || null,
        image_url: imageUrl,
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
      setImageFile(null);
      setImagePreview("");
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

          <div className="space-y-2">
            <Label htmlFor="image">Medicine Image (Optional)</Label>
            <div className="space-y-3">
              <Input
                id="image"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={loading || uploading}
              />
              {imagePreview && (
                <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Medicine preview" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading || uploading} className="w-full bg-gradient-hero hover:opacity-90">
            {uploading ? "Uploading image..." : loading ? "Submitting..." : "Submit Donation"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
