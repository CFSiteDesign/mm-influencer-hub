import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminPreviewPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState('Signing in as admin...');

  useEffect(() => {
    if (loading) return;
    if (user) {
      navigate('/dashboard', { replace: true });
      return;
    }
    (async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'Admin.codes@madmonkeyhostels.com',
        password: 'Xk9#mQ2vL!pR7nW4',
      });
      if (error) {
        setStatus(`Sign-in failed: ${error.message}`);
        return;
      }
      navigate('/dashboard', { replace: true });
    })();
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
      {status}
    </div>
  );
}
