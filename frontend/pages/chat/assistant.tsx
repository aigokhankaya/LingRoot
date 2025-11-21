import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Bu sayfa welcome'dan gelen yönlendirmeleri yakalayıp yeni sohbet oluşturur
export default function AssistantPage() {
  const router = useRouter();

  useEffect(() => {
    // Yeni bir sohbet ID'si oluştur (client-side)
    const newChatId = 'new';
    router.replace(`/chat/${newChatId}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
}
