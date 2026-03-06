import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TreePine, LogIn, Leaf, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      toast.error('Invalid email or password. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-900 via-green-800 to-earth-900 items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20"><Leaf className="w-32 h-32 text-green-300 rotate-12" /></div>
          <div className="absolute bottom-40 right-16"><Leaf className="w-24 h-24 text-green-300 -rotate-45" /></div>
          <div className="absolute top-1/2 left-1/3"><Leaf className="w-16 h-16 text-green-300 rotate-90" /></div>
        </div>
        <div className="relative text-center space-y-6 max-w-md">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 rounded-3xl backdrop-blur-sm">
            <TreePine className="w-14 h-14 text-green-300" />
          </div>
          <h1 className="text-4xl font-bold font-display text-white">GreenScape CRM</h1>
          <p className="text-lg text-green-200/80">
            Professional landscape and nursery management. Schedule crews, track inventory, create quotes, and grow your business.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-8 text-left">
            {[
              'Job Scheduling', 'Crew Management', 'Inventory Tracking', 'Invoicing',
              'Quote Builder', 'Lead Pipeline', 'Equipment Tracker', 'Reports',
            ].map(feature => (
              <div key={feature} className="flex items-center gap-2 text-green-200/70 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-earth-950">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center lg:hidden">
                <TreePine className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold font-display text-earth-50 lg:hidden">GreenScape CRM</span>
            </div>
            <h2 className="text-2xl font-bold font-display text-earth-50">Welcome back</h2>
            <p className="text-sm text-earth-400 mt-1">Sign in to manage your landscape operations</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3 top-[38px] text-earth-400 hover:text-earth-200 cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-earth-300 cursor-pointer">
                <input type="checkbox" className="rounded border-earth-600 bg-earth-800 text-green-600" />
                Remember me
              </label>
              <button type="button" className="text-sm text-green-400 hover:text-green-300 cursor-pointer">
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="w-full" size="lg" icon={<LogIn className="w-4 h-4" />} loading={isLoading}>
              Sign In
            </Button>
          </form>

          <p className="text-center text-xs text-earth-500">
            GreenScape CRM v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
