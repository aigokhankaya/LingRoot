import { useEffect, useState } from 'react';
import { fetchUsers, deleteUser } from '@/services/userService';
import { User } from '@/types/user';
import Button from '../common/Button';
import MembershipBadge from '../user/MembershipBadge';

export default function UserTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (userId: string) => {
    await deleteUser(userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  if (loading) return <div>Yükleniyor...</div>;

  return (
    <table className="min-w-full bg-white rounded shadow">
      <thead>
        <tr>
          <th className="p-2">E-posta</th>
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
            <td className="p-2">{user.email}</td>
            <td className="p-2">
              <MembershipBadge status={user.membershipStatus} />
            </td>
            <td className="p-2">{user.createdAt}</td>
            <td className="p-2">{user.lastLogin || '-'}</td>
            <td className="p-2">{user.isActive ? 'Aktif' : 'Pasif'}</td>
            <td className="p-2">{user.loginCount ?? '-'}</td>
            <td className="p-2">{user.contentCount ?? '-'}</td>
            <td className="p-2">
              <Button variant="destructive" onClick={() => handleDelete(user.id)}>
                Sil
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
} 