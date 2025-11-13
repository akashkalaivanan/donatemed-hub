import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { Package } from "lucide-react";

interface InventoryItem {
  id: string;
  medicine_name: string;
  quantity: number;
  status: string;
  expiry_date: string;
  profiles: {
    name: string;
  };
}

export const InventoryView = ({ refresh }: { refresh: number }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, [refresh]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          profiles!donor_id(name)
        `)
        .in("status", ["approved", "claimed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === "claimed" 
      ? "bg-accent text-accent-foreground" 
      : "bg-success text-success-foreground";
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {inventory.map((item) => (
        <Card key={item.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                {item.medicine_name}
              </CardTitle>
              <Badge className={getStatusColor(item.status)}>
                {item.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Donor:</span> {item.profiles.name}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Quantity:</span> {item.quantity}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Expires:</span> {new Date(item.expiry_date).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
