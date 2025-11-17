import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Package, Clock, CheckCircle, HandHeart } from "lucide-react";

interface Stats {
  totalDonations: number;
  pendingDonations: number;
  approvedDonations: number;
  claimedDonations: number;
}

export const DonorStats = ({ refresh }: { refresh: number }) => {
  const [stats, setStats] = useState<Stats>({
    totalDonations: 0,
    pendingDonations: 0,
    approvedDonations: 0,
    claimedDonations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refresh]);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [totalRes, pendingRes, approvedRes, claimedRes] = await Promise.all([
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", user.id),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", user.id).eq("status", "pending"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", user.id).eq("status", "approved"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", user.id).eq("status", "claimed"),
      ]);

      setStats({
        totalDonations: totalRes.count || 0,
        pendingDonations: pendingRes.count || 0,
        approvedDonations: approvedRes.count || 0,
        claimedDonations: claimedRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Donations",
      value: stats.totalDonations,
      icon: Package,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Pending Review",
      value: stats.pendingDonations,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      title: "Approved",
      value: stats.approvedDonations,
      icon: CheckCircle,
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      title: "Claimed by NGOs",
      value: stats.claimedDonations,
      icon: HandHeart,
      color: "text-violet-600 dark:text-violet-400",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
