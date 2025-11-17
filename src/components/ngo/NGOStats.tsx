import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Package, HandHeart, CheckCircle, TrendingUp } from "lucide-react";

interface Stats {
  availableMedicines: number;
  claimedMedicines: number;
  totalMappings: number;
}

export const NGOStats = ({ refresh }: { refresh: number }) => {
  const [stats, setStats] = useState<Stats>({
    availableMedicines: 0,
    claimedMedicines: 0,
    totalMappings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refresh]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: ngo } = await supabase
        .from("ngos")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!ngo) return;

      const [availableRes, claimedRes, mappingsRes] = await Promise.all([
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("claims").select("id", { count: "exact", head: true }).eq("ngo_id", ngo.id),
        supabase.from("mappings").select("id", { count: "exact", head: true }).eq("ngo_id", ngo.id),
      ]);

      setStats({
        availableMedicines: availableRes.count || 0,
        claimedMedicines: claimedRes.count || 0,
        totalMappings: mappingsRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Available Medicines",
      value: stats.availableMedicines,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Claimed by You",
      value: stats.claimedMedicines,
      icon: HandHeart,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "AI Matches",
      value: stats.totalMappings,
      icon: TrendingUp,
      color: "text-violet-600 dark:text-violet-400",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
