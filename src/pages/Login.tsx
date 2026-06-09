import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const finishLogin = () => {
    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });
    navigate("/attention-hub");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalError) throw aalError;

      if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        const totp = factors?.totp?.find((f) => f.status === "verified");
        if (!totp) {
          toast({
            title: "2FA required",
            description: "No verified authenticator found. Contact support or disable 2FA from a signed-in session.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        setFactorId(totp.id);
        setMfaStep(true);
        setLoading(false);
        return;
      }
    } catch (e) {
      toast({
        title: "Could not verify 2FA status",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    finishLogin();
    setLoading(false);
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || mfaCode.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: mfaCode });
      if (error) throw error;
      finishLogin();
    } catch (e) {
      toast({
        title: "Invalid code",
        description: e instanceof Error ? e.message : "Check your authenticator app and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{mfaStep ? "Two-factor code" : "Welcome Back"}</CardTitle>
          <CardDescription>
            {mfaStep ? "Enter the 6-digit code from your authenticator app" : "Sign in to your account to continue"}
          </CardDescription>
        </CardHeader>
        {mfaStep ? (
          <form onSubmit={handleVerifyMfa}>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={mfaCode} onChange={setMfaCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading || mfaCode.length !== 6}>
                {loading ? "Verifying…" : "Verify and continue"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setMfaStep(false); setMfaCode(""); }}>
                Back to sign in
              </Button>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
