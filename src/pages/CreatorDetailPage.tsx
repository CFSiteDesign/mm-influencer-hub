import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Copy, MapPin, Calendar } from 'lucide-react';

export default function CreatorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('creator_codes')
        .select('*, applicants(visiting_hostel, planned_hostels, arrival_date)')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Creator not found');
        navigate('/dashboard');
      } else {
        setCreator(data);
      }
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  if (loading || !creator) {
    return <div className="min-h-screen flex items-center justify-center bg-muted">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-muted p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2 sm:mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
              <div>
                <CardTitle className="text-xl sm:text-3xl font-bold">{creator.creator_name || '—'}</CardTitle>
                {creator.creator_id && (
                  <span className="text-sm font-mono text-muted-foreground">{creator.creator_id}</span>
                )}
              </div>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 text-lg px-4 py-1">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {creator.creator_email && creator.creator_email !== '—' && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a href={`mailto:${creator.creator_email}`} className="text-primary hover:underline text-sm sm:text-base break-all">{creator.creator_email}</a>
                </div>
              )}
              {creator.social_handle && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Social Handle</p>
                  <a href={`https://instagram.com/${creator.social_handle}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm sm:text-base">@{creator.social_handle}</a>
                </div>
              )}
              {creator.method && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Code Method</p>
                  <p className="text-foreground text-sm sm:text-base">{creator.method}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-foreground text-sm sm:text-base">{new Date(creator.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="bg-secondary rounded-lg p-4 sm:p-6 flex flex-col items-center justify-center space-y-2 border">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Creator Code</p>
              <div className="flex items-center gap-3">
                <span className="font-mono text-2xl sm:text-4xl font-bold tracking-tight text-foreground">{creator.code}</span>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(creator.code)}>
                  <Copy className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
