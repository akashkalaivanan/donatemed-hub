import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Heart, Users, Package, TrendingUp, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        navigate(`/${profile.role}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-primary/10">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-hero rounded-2xl shadow-xl">
            <Heart className="w-16 h-16 text-white" />
          </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
          MediDonate
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Connecting medicine donors with NGOs to save lives through efficient donation management
        </p>
        <Button 
          size="lg" 
          className="bg-gradient-hero hover:opacity-90 text-lg px-8 py-6 gap-2"
          onClick={() => navigate("/auth")}
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </Button>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-xl transition-shadow bg-gradient-card">
            <CardContent className="pt-6">
              <div className="p-3 bg-gradient-hero rounded-full w-fit mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Donors</h3>
              <p className="text-muted-foreground">
                Easily donate unused medicines with expiry tracking and status updates
              </p>
            </CardContent>
          </Card>
          <Card className="text-center hover:shadow-xl transition-shadow bg-gradient-card">
            <CardContent className="pt-6">
              <div className="p-3 bg-gradient-hero rounded-full w-fit mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Admin</h3>
              <p className="text-muted-foreground">
                Verify donations, manage inventory, and ensure quality control
              </p>
            </CardContent>
          </Card>
          <Card className="text-center hover:shadow-xl transition-shadow bg-gradient-card">
            <CardContent className="pt-6">
              <div className="p-3 bg-gradient-hero rounded-full w-fit mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">NGOs</h3>
              <p className="text-muted-foreground">
                Access verified medicines matched to your needs through smart mapping
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-hero text-white">
          <CardContent className="py-12">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold mb-2">100%</div>
                <div className="text-lg opacity-90">Transparent Process</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">Smart</div>
                <div className="text-lg opacity-90">AI Matching</div>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">Real-time</div>
                <div className="text-lg opacity-90">Updates</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Make a Difference?</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join our platform today and help bridge the gap between medicine donors and those in need
        </p>
        <Button 
          size="lg" 
          variant="outline"
          className="text-lg px-8 py-6 border-2 hover:bg-primary hover:text-primary-foreground"
          onClick={() => navigate("/auth")}
        >
          Sign Up Now
        </Button>
      </section>
    </div>
  );
};

export default Index;
