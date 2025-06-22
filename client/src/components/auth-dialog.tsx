import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Mail, Chrome } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthDialog({ isOpen, onClose }: AuthDialogProps) {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email?: string; phoneNumber?: string; name?: string; googleId?: string }) => {
      return await apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "You've been signed in successfully!",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    },
  });

  const handleEmailLogin = () => {
    if (!email || !name) {
      toast({
        title: "Error",
        description: "Please enter both email and name",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ email, name });
  };

  const handlePhoneLogin = () => {
    if (!phoneNumber || !name) {
      toast({
        title: "Error",
        description: "Please enter both phone number and name",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ phoneNumber, name });
  };

  const handleGoogleLogin = () => {
    // Simulate Google login - in production, integrate with Google OAuth
    const googleId = `google_${Date.now()}`;
    const googleName = name || "Google User";
    const googleEmail = email || `user${Date.now()}@gmail.com`;
    
    loginMutation.mutate({ 
      googleId, 
      name: googleName, 
      email: googleEmail 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to Stock News India</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleEmailLogin} 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              <Mail className="w-4 h-4 mr-2" />
              Sign in with Email
            </Button>
          </TabsContent>
          
          <TabsContent value="phone" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name-phone">Name</Label>
              <Input
                id="name-phone"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <Button 
              onClick={handlePhoneLogin} 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              <Phone className="w-4 h-4 mr-2" />
              Sign in with Phone
            </Button>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button 
          onClick={handleGoogleLogin} 
          variant="outline" 
          className="w-full"
          disabled={loginMutation.isPending}
        >
          <Chrome className="w-4 h-4 mr-2" />
          Continue with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}