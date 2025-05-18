import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase bağlantısı
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Props {
  userId: string;
}

export default function InterestDropdown({ userId }: Props) {
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserInterests = async () => {
      const { data, error } = await supabase
        .from('user_interests')
        .select('interest_keyword')
        .eq('user_id', userId);

      if (!error && data) {
        const keywords = data.map((item) => item.interest_keyword);
        console.log('Fetched interests:', keywords);
        setInterests(keywords);
      }

      setIsLoading(false);
    };

    fetchUserInterests();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    console.log("Seçilen ilgi alanı:", selected);
    // İleride: buraya öneri kartı tetikleyici kod eklenecek
  };

  if (isLoading) {
    return <div className="text-center text-gray-500">Yükleniyor...</div>;
  }

  return (
    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-blue-700 text-center">
      <select
        defaultValue=""
        onChange={handleChange}
        className="w-full p-3 border border-gray-300 rounded-md bg-white text-black"
        style={{ appearance: 'auto' }}
      >
        <option disabled value="">Bir ilgi alanı seçin...</option>
        {interests.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>
    </div>
  );
}
