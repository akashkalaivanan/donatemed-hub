import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, User, Building2, Ban, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserProfile {
  id: string;
  name: string;
  role: 'donor' | 'ngo' | 'admin';
  organization_name?: string;
  created_at: string;
  status: 'active' | 'blocked' | 'suspended';
  blocked_reason?: string;
  blocked_at?: string;
}

export const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    setPromoting(userId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("promote_user_to_admin", {
        _user_id: userId,
        _requesting_admin_id: user.id,
      });

      if (error) throw error;

      if (data) {
        toast({
          title: "Success",
          description: "User promoted to admin successfully",
        });
        fetchUsers();
      } else {
        toast({
          title: "Info",
          description: "User is already an admin",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPromoting(null);
    }
  };

  const handleBlockUser = (user: UserProfile) => {
    setSelectedUser(user);
    setBlockReason("");
    setShowBlockDialog(true);
  };

  const confirmBlockUser = async () => {
    if (!selectedUser || !blockReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for blocking",
        variant: "destructive",
      });
      return;
    }

    setBlocking(selectedUser.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          status: 'blocked',
          blocked_reason: blockReason.trim(),
          blocked_at: new Date().toISOString(),
          blocked_by: user.id,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${selectedUser.name} has been blocked`,
      });
      
      setShowBlockDialog(false);
      setSelectedUser(null);
      setBlockReason("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBlocking(null);
    }
  };

  const handleUnblockUser = async (user: UserProfile) => {
    setBlocking(user.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          status: 'active',
          blocked_reason: null,
          blocked_at: null,
          blocked_by: null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${user.name} has been unblocked`,
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBlocking(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'ngo':
        return <Building2 className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive' as const;
      case 'ngo':
        return 'default' as const;
      default:
        return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user roles, permissions, and block users who violate policies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                    {getRoleIcon(user.role)}
                    {user.role.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={user.status === 'active' ? 'default' : 'destructive'}
                    className="gap-1"
                  >
                    {user.status === 'active' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <Ban className="h-3 w-3" />
                    )}
                    {user.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{user.organization_name || '-'}</TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {user.role !== 'admin' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePromoteToAdmin(user.id)}
                        disabled={promoting === user.id}
                      >
                        {promoting === user.id ? "Promoting..." : "Promote to Admin"}
                      </Button>
                      {user.role === 'donor' && (
                        user.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBlockUser(user)}
                            disabled={blocking === user.id}
                          >
                            <Ban className="h-4 w-4 mr-2" />
                            {blocking === user.id ? "Blocking..." : "Block"}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleUnblockUser(user)}
                            disabled={blocking === user.id}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {blocking === user.id ? "Unblocking..." : "Unblock"}
                          </Button>
                        )
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block User</DialogTitle>
          <DialogDescription>
            Block {selectedUser?.name} from donating medicines. Please provide a reason for blocking this user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="blockReason">Reason for Blocking</Label>
            <Textarea
              id="blockReason"
              placeholder="e.g., Provided incorrect medicine details, suspicious activity, etc."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={confirmBlockUser}
            disabled={!blockReason.trim() || blocking === selectedUser?.id}
          >
            {blocking === selectedUser?.id ? "Blocking..." : "Block User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
};
