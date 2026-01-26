import api from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { toast } from 'sonner';

const Approvals = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/holidays/pending');
      setPendingRequests(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action, notes = '') => {
    try {
      const endpoint = action === 'approve'
        ? `/holidays/${id}/approve`
        : `/holidays/${id}/reject`;

      await api.post(endpoint, {}, { params: { notes } });

      toast.success(`Request ${action}d successfully`);
      fetchPendingRequests();
    } catch (error) {
      console.error(error);
      toast.error(`Failed to ${action} request`);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leave Approvals</h1>

      {pendingRequests.length === 0 ? (
        <Card className="p-8 text-center text-secondary">
          No pending requests at the moment.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingRequests.map(request => (
            <Card key={request.id}>
              <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
                <div className="flex items-center gap-4">
                  {request.user_avatar ? (
                    <img src={request.user_avatar} alt="" className="w-10 h-10 rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-color)' }}>
                      {request.user_name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold">{request.user_name}</h3>
                    <p className="text-sm text-secondary">{request.title}</p>
                    <p className="text-xs text-secondary mt-1">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                      <span className="ml-2 font-medium">({request.duration_days} days)</span>
                    </p>
                    {/* Overlap Warning */}
                    {request.has_overlap && (
                      <div className="mt-2 text-xs flex items-center gap-1 text-warning" style={{ color: 'var(--warning-color)' }}>
                        ⚠ Warning: Overlaps with {request.overlapping_users.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="secondary"
                    className="flex-1 md:flex-none border-danger text-danger hover:bg-danger/10"
                    style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                    onClick={() => handleAction(request.id, 'reject')}
                  >
                    Reject
                  </Button>
                  <Button
                    className="flex-1 md:flex-none"
                    onClick={() => handleAction(request.id, 'approve')}
                  >
                    Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Approvals;
