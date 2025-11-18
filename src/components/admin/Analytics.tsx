import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface AnalyticsData {
  donationsByMonth: Array<{ month: string; count: number }>;
  approvalRates: Array<{ name: string; value: number; color: string }>;
  claimsByNGO: Array<{ ngo: string; claims: number }>;
  donationTrends: Array<{ month: string; approved: number; rejected: number; pending: number }>;
}

export const Analytics = ({ refresh }: { refresh: number }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [refresh]);

  const fetchAnalytics = async () => {
    try {
      // Fetch donations grouped by month
      const { data: donations } = await supabase
        .from("donations")
        .select("created_at, status");

      // Fetch claims with NGO info
      const { data: claims } = await supabase
        .from("claims")
        .select(`
          id,
          ngo_id,
          ngos (organization_name)
        `);

      if (donations) {
        // Process donations by month
        const monthlyData: { [key: string]: number } = {};
        const statusData: { [key: string]: number } = { approved: 0, rejected: 0, pending: 0, claimed: 0 };
        const trendData: { [key: string]: { approved: number; rejected: number; pending: number } } = {};

        donations.forEach((donation) => {
          const date = new Date(donation.created_at!);
          const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          
          monthlyData[monthYear] = (monthlyData[monthYear] || 0) + 1;
          statusData[donation.status || 'pending'] = (statusData[donation.status || 'pending'] || 0) + 1;

          if (!trendData[monthYear]) {
            trendData[monthYear] = { approved: 0, rejected: 0, pending: 0 };
          }
          if (donation.status === 'approved' || donation.status === 'rejected' || donation.status === 'pending') {
            trendData[monthYear][donation.status]++;
          }
        });

        const donationsByMonth = Object.entries(monthlyData)
          .map(([month, count]) => ({ month, count }))
          .slice(-6);

        const approvalRates = [
          { name: 'Approved', value: statusData.approved, color: 'hsl(var(--success))' },
          { name: 'Pending', value: statusData.pending, color: 'hsl(var(--warning))' },
          { name: 'Rejected', value: statusData.rejected, color: 'hsl(var(--destructive))' },
          { name: 'Claimed', value: statusData.claimed, color: 'hsl(var(--primary))' },
        ];

        const donationTrends = Object.entries(trendData)
          .map(([month, data]) => ({ month, ...data }))
          .slice(-6);

        // Process claims by NGO
        const ngoClaimData: { [key: string]: number } = {};
        claims?.forEach((claim: any) => {
          const ngoName = claim.ngos?.organization_name || 'Unknown NGO';
          ngoClaimData[ngoName] = (ngoClaimData[ngoName] || 0) + 1;
        });

        const claimsByNGO = Object.entries(ngoClaimData)
          .map(([ngo, claims]) => ({ ngo, claims }))
          .sort((a, b) => b.claims - a.claims)
          .slice(0, 5);

        setData({
          donationsByMonth,
          approvalRates,
          claimsByNGO,
          donationTrends,
        });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const totalDonations = data.approvalRates.reduce((sum, item) => sum + item.value, 0);
  const approvalRate = totalDonations > 0 
    ? ((data.approvalRates.find(d => d.name === 'Approved')?.value || 0) / totalDonations * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvalRate}%</div>
            <p className="text-xs text-muted-foreground">
              {data.approvalRates.find(d => d.name === 'Approved')?.value || 0} of {totalDonations} donations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.claimsByNGO.reduce((sum, ngo) => sum + ngo.claims, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              By {data.claimsByNGO.length} NGOs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <TrendingDown className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.approvalRates.find(d => d.name === 'Pending')?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Donation Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Status Distribution</CardTitle>
            <CardDescription>Breakdown by approval status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.approvalRates}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.approvalRates.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donations Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Donations Over Time</CardTitle>
            <CardDescription>Monthly donation volume</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.donationsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donation Trends by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Donation Trends by Status</CardTitle>
            <CardDescription>Monthly breakdown of donation statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.donationTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="approved" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="pending" stroke="hsl(var(--warning))" strokeWidth={2} />
                <Line type="monotone" dataKey="rejected" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top NGOs by Claims */}
        <Card>
          <CardHeader>
            <CardTitle>Top NGOs by Claims</CardTitle>
            <CardDescription>Most active organizations</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.claimsByNGO} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="ngo" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="claims" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
