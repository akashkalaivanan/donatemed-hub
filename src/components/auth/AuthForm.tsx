import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase, UserRole } from "@/lib/supabase";
import { toast } from "sonner";
import { Heart, Ban } from "lucide-react";

export const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("donor");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isBlocked = searchParams.get('blocked') === 'true';

  useEffect(() => {
    if (isBlocked) {
      toast.error("Your account has been blocked", {
        description: "Please contact support for more information.",
        duration: 5000,
      });
    }
  }, [isBlocked]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, status, blocked_reason')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            // Check if user is blocked
            if (profile.status === 'blocked') {
              await supabase.auth.signOut();
              toast.error("Account Blocked", {
                description: profile.blocked_reason || "Your account has been blocked. Contact support.",
                duration: 6000,
              });
              return;
            }

            navigate(`/${profile.role}`);
            toast.success("Welcome back!");
          }
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role,
              ...(role === 'ngo' && { organization_name: organizationName }),
            },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) throw error;

        if (data.user) {
          navigate(`/${role}`);
          toast.success("Account created successfully!");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-primary/10 p-4">
      <div className="w-full max-w-md space-y-4">
        {isBlocked && (
          <Alert variant="destructive">
            <Ban className="h-4 w-4" />
            <AlertTitle>Account Blocked</AlertTitle>
            <AlertDescription>
              Your account has been blocked by an administrator. Please contact support for more information.
            </AlertDescription>
          </Alert>
        )}
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-gradient-hero rounded-full">
                <Heart className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">MediDonate</CardTitle>
            <CardDescription className="text-base">
              {isLogin ? "Sign in to your account" : "Create your account"}
            </CardDescription>
          </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="donor">Donor</SelectItem>
                      <SelectItem value="ngo">NGO</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {role === 'ngo' && (
                  <div className="space-y-2">
                    <Label htmlFor="organizationName">Organization Name</Label>
                    <Input
                      id="organizationName"
                      type="text"
                      placeholder="Your NGO Name"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Please wait..." : (isLogin ? "Sign In" : "Sign Up")}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};
