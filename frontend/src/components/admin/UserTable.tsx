import { useEffect, useState } from 'react';
import { fetchUsers, deleteUser, updateUser, getAdminUserUsage } from '@/services/userService';
import { User } from '@/types/user';
import Button from '../common/Button';
import MembershipBadge from '../user/MembershipBadge';
import { computeCostAwareEstimates, type UsageSummary, formatEstimate, CHARS_PER_VIDEO_MINUTE, CHARS_PER_A4_PAGE, type VoiceCategory } from '@/lib/usageEstimates';
import { api } from '@/lib/api';

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [perCategory, setPerCategory] = useState<any | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers().then((data) => {
      setUsers(data);
      setFilteredUsers(data);
    }).finally(() => setLoading(false));
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/api/admin/plans');
      if (response.data.success) {
        setPlans(response.data.data);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter(u => 
      u.email.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const openAssignPlanModal = (user: User) => {
    setSelectedUser(user);
    setSelectedPlanId('');
    setShowAssignPlanModal(true);
  };

  const handleAssignPlan = async () => {
    if (!selectedUser || !selectedPlanId) return;
    try {
      const response = await api.post(`/api/admin/users/${selectedUser.id}/assign-plan`, {
        planId: selectedPlanId
      });
      if (response.data.success) {
        alert('Paket başarıyla atandı!');
        setShowAssignPlanModal(false);
        fetchUsers().then((data) => {
          setUsers(data);
          setFilteredUsers(data);
        });
      }
    } catch (error: any) {
      alert('Paket atanamadı: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleRoleChange = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await updateUser(user.id, { role: newRole });
    setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
  };

  const openUserModal = async (user: User) => {
    setSelectedUser(user);
    setShowModal(true);
    setLoadingUsage(true);
    try {
      const res = await getAdminUserUsage(user.id);
      if (res?.success) {
        const data = (res as any).data || null;
        setUsageSummary(data);
        if (data) setPerCategory(computeCostAwareEstimates(data));
        else setPerCategory(null);
      } else {
        setUsageSummary(null);
        setPerCategory(null);
      }
    } catch {
      setUsageSummary(null);
      setPerCategory(null);
    } finally {
      setLoadingUsage(false);
    }
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <>
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr>
            <th className="p-2">E-posta</th>
            <th className="p-2">Rol</th>
            <th className="p-2">Üyelik</th>
            <th className="p-2">Kayıt Tarihi</th>
            <th className="p-2">Son Aktif</th>
            <th className="p-2">Durum</th>
            <th className="p-2">Giriş Sayısı</th>
            <th className="p-2">Toplam İçerik</th>
            <th className="p-2">İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="p-2 cursor-pointer underline" onClick={() => { openUserModal(user); }}>{user.email}</td>
              <td className="p-2">{user.role}</td>
              <td className="p-2">
                <MembershipBadge status={user.membershipStatus} labelOverride={user.planName} />
              </td>
              <td className="p-2">{user.createdAt}</td>
              <td className="p-2">{user.lastLogin || '-'}</td>
              <td className="p-2">{user.isActive ? 'Aktif' : 'Pasif'}</td>
              <td className="p-2">{user.loginCount ?? '-'}</td>
              <td className="p-2">{user.contentCount ?? '-'}</td>
              <td className="p-2 space-x-2">
                <Button variant="secondary" onClick={() => openAssignPlanModal(user)} title="Paket Ata">
                  Paket Ata
                </Button>
                <Button variant="secondary" onClick={() => handleRoleChange(user)}>
                  {user.role === 'admin' ? 'Adminlikten Çıkar' : 'Admin Yap'}
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(user.id)}>
                  Sil
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow max-w-lg w-full relative">
            <button className="absolute top-2 right-2 text-gray-400" onClick={() => setShowModal(false)}>Kapat</button>
            <h2 className="text-xl font-bold mb-2">Kullanıcı Detayı</h2>
            <div><b>E-posta:</b> {selectedUser.email}</div>
            <div><b>Rol:</b> {selectedUser.role}</div>
            <div><b>Üyelik:</b> {selectedUser.planName || selectedUser.membershipStatus}</div>
            <div><b>Kayıt Tarihi:</b> {selectedUser.createdAt}</div>
            <div><b>Son Aktif:</b> {selectedUser.lastLogin || '-'}</div>
            {/* Buraya içerik geçmişi ve diğer detaylar eklenebilir */}
            <div className="mt-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Kalan kullanım</div>
              {loadingUsage && <div className="text-xs text-gray-500">Yükleniyor...</div>}
              {!loadingUsage && (!usageSummary || usageSummary.hasPlan === false) && (
                <div className="text-xs text-gray-500">Aktif paket yok</div>
              )}
              {!loadingUsage && usageSummary && perCategory && (
                <div className="grid grid-cols-1 gap-1">
                  {(['standard','neural2','wavenet','studio','chirp3d'] as VoiceCategory[]).map((cat) => (
                    <div key={cat} className="text-xs py-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 capitalize">{cat}</span>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">{formatEstimate(perCategory[cat].remainingChars, 'karakter')}</div>
                          <div className="font-medium text-gray-900">{formatEstimate(
                            perCategory[cat].remainingCharsByUsd === null ? null : Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_VIDEO_MINUTE),
                            'dk'
                          )}</div>
                          <div className="font-medium text-gray-900">{formatEstimate(
                            perCategory[cat].remainingCharsByUsd === null ? null : Math.floor((perCategory[cat].remainingCharsByUsd || 0) / CHARS_PER_A4_PAGE),
                            'sayfa'
                          )}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showAssignPlanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Paket Ata</h2>
            <p className="text-gray-600 mb-4">
              Kullanıcı: <span className="font-semibold">{selectedUser.email}</span>
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paket Seçin
              </label>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Seçiniz...</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {plan.price} ₺
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={handleAssignPlan} disabled={!selectedPlanId}>
                Paketi Ata
              </Button>
              <Button variant="secondary" onClick={() => setShowAssignPlanModal(false)}>
                İptal
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 