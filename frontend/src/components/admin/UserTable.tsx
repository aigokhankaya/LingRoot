import { useEffect, useState } from 'react';
import { fetchUsers, deleteUser, updateUser } from '@/services/userService';
import { User } from '@/types/user';
import Button from '../common/Button';
import MembershipBadge from '../user/MembershipBadge';

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleRoleChange = async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    await updateUser(user.id, { role: newRole });
    setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
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
              <td className="p-2 cursor-pointer underline" onClick={() => { setSelectedUser(user); setShowModal(true); }}>{user.email}</td>
              <td className="p-2">{user.role}</td>
              <td className="p-2">
                <MembershipBadge status={user.membershipStatus} />
              </td>
              <td className="p-2">{user.createdAt}</td>
              <td className="p-2">{user.lastLogin || '-'}</td>
              <td className="p-2">{user.isActive ? 'Aktif' : 'Pasif'}</td>
              <td className="p-2">{user.loginCount ?? '-'}</td>
              <td className="p-2">{user.contentCount ?? '-'}</td>
              <td className="p-2 space-x-2">
                <Button variant="destructive" onClick={() => handleDelete(user.id)}>
                  Sil
                </Button>
                <Button variant="secondary" onClick={() => handleRoleChange(user)}>
                  {user.role === 'admin' ? 'Adminlikten Çıkar' : 'Admin Yap'}
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
            <div><b>Üyelik:</b> {selectedUser.membershipStatus}</div>
            <div><b>Kayıt Tarihi:</b> {selectedUser.createdAt}</div>
            <div><b>Son Aktif:</b> {selectedUser.lastLogin || '-'}</div>
            {/* Buraya içerik geçmişi ve diğer detaylar eklenebilir */}
          </div>
        </div>
      )}
    </>
  );
} 