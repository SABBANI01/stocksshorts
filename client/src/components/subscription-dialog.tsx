import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Crown, Lock, TrendingUp, BarChart3, Star, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerType?: 'warrant' | 'breakout' | 'general';
}

export function SubscriptionDialog({ isOpen, onClose, triggerType }: SubscriptionDialogProps) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const createPaymentMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      const response = await apiRequest("POST", "/api/payments/create-upi", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect to UPI payment
      window.location.href = data.paymentUrl;
    },
    onError: (error) => {
      toast({
        title: "Payment Failed",
        description: "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phoneNumber)) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid 10-digit Indian mobile number.",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate({ phoneNumber });
  };

  const getFeaturesByType = () => {
    switch (triggerType) {
      case 'warrant':
        return [
          "Exclusive warrant analysis with strike price insights",
          "Implied volatility tracking and alerts",
          "Institutional flow analysis for major warrants",
          "Risk-reward calculations for warrant strategies",
          "Time decay and Greeks analysis",
          "Premium warrant recommendations"
        ];
      case 'breakout':
        return [
          "Technical breakout pattern identification",
          "Volume confirmation and momentum analysis",
          "Fibonacci retracement and target levels",
          "Support and resistance mapping",
          "Entry and exit strategy recommendations",
          "Risk management guidelines"
        ];
      default:
        return [
          "Access to all warrant analysis and strategies",
          "Complete breakout pattern identification",
          "Institutional flow and volume analysis",
          "Technical analysis with clear targets",
          "Risk management and position sizing",
          "Early access to market insights"
        ];
    }
  };

  const getHeaderByType = () => {
    switch (triggerType) {
      case 'warrant':
        return {
          icon: <BarChart3 className="w-6 h-6 text-blue-600" />,
          title: "Unlock Warrant Analysis",
          description: "Get exclusive warrant insights and trading strategies"
        };
      case 'breakout':
        return {
          icon: <TrendingUp className="w-6 h-6 text-green-600" />,
          title: "Unlock Breakout Analysis",
          description: "Access detailed technical breakout patterns and targets"
        };
      default:
        return {
          icon: <Crown className="w-6 h-6 text-amber-600" />,
          title: "Upgrade to Premium",
          description: "Get access to exclusive market analysis and insights"
        };
    }
  };

  const header = getHeaderByType();
  const features = getFeaturesByType();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {header.icon}
            {header.title}
          </DialogTitle>
          <DialogDescription>
            {header.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Pricing */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-3xl font-bold">₹11</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
              <Star className="w-3 h-3 mr-1" />
              Best Value
            </Badge>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">What you get:</h4>
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Phone Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number</Label>
            <Input
              id="phone"
              placeholder="Enter 10-digit mobile number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              maxLength={10}
              className="text-center"
            />
            <p className="text-xs text-muted-foreground">
              We'll send payment confirmation to this number
            </p>
          </div>

          {/* Payment Method */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">UPI</span>
              </div>
              <span className="font-medium">UPI Payment</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Pay securely using any UPI app like GPay, PhonePe, Paytm
            </p>
          </div>

          {/* Subscribe Button */}
          <Button 
            onClick={handleSubscribe}
            disabled={createPaymentMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {createPaymentMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Subscribe for ₹11/month
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. No hidden charges. 7-day money-back guarantee.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}