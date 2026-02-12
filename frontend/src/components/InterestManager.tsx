import React, { useState, useEffect } from 'react';
import { getUserInterests, updateUserInterests } from '../lib/api';
import { Plus, Trash2, Pencil, Save, X } from 'lucide-react';
import { useTranslation } from '../lib/i18n';

interface InterestManagerProps {
  onUpdate?: () => void;
  showTitle?: boolean;
  className?: string;
  isEditing?: boolean;
}

const InterestManager: React.FC<InterestManagerProps> = ({
  onUpdate,
  showTitle = true,
  className = '',
  isEditing: initialIsEditing = false
}) => {
  const { t } = useTranslation();
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [newInterest, setNewInterest] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // İlgi alanlarını yükle
  const loadInterests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getUserInterests();

      // API yanıtını güvenli bir şekilde işle
      let interestsList: string[] = [];

      try {
        if (Array.isArray(response)) {
          // API doğrudan array olarak dönüyorsa
          interestsList = response.map((item: { interest_keyword: string }) => item.interest_keyword);
        } else if (response && response.data && Array.isArray(response.data)) {
          // API data özelliği içinde dönüyorsa
          interestsList = response.data.map((item: { interest_keyword: string }) => item.interest_keyword);
        } else if (response && typeof response === 'object') {
          // API farklı bir formatta dönüyorsa, ilgili alanları bulmaya çalış
          console.log("API yanıtı farklı formatta:", response);
          const possibleDataFields = ['data', 'interests', 'items', 'results'];

          for (const field of possibleDataFields) {
            if (response[field] && Array.isArray(response[field])) {
              if (response[field].length > 0 && response[field][0].interest_keyword) {
                interestsList = response[field].map((item: { interest_keyword: string }) => item.interest_keyword);
                break;
              }
            }
          }
        }
      } catch (jsonError) {
        console.error("API yanıtı işlenirken hata:", jsonError);
        throw new Error(t('interest_manager_error_data_processing'));
      }

      setInterests(interestsList);
    } catch (err: any) {
      console.error('İlgi alanlarını yükleme hatası:', err);

      // Kullanıcı dostu hata mesajı
      if (err.message && err.message.includes("Unexpected token")) {
        setError(t('interest_manager_error_unexpected_response'));
      } else {
        setError(err.message || t('interest_manager_error_load'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInterests();
  }, []);

  // İlgi alanı ekle
  const addInterest = () => {
    if (!newInterest.trim()) return;

    // Zaten var mı kontrol et
    if (interests.includes(newInterest.trim())) {
      setError(t('interest_manager_error_already_exists'));
      return;
    }

    setInterests([...interests, newInterest.trim()]);
    setNewInterest('');
    setError(null);
  };

  // İlgi alanı kaldır
  const removeInterest = (index: number) => {
    const updatedInterests = [...interests];
    updatedInterests.splice(index, 1);
    setInterests(updatedInterests);
  };

  // Değişiklikleri kaydet
  const saveChanges = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("Kaydedilecek ilgi alanları:", interests);

      // Doğrudan boş dizileri engelle
      if (!interests || interests.length === 0) {
        setError(t('interest_manager_error_min_one'));
        setIsLoading(false);
        return;
      }

      const result = await updateUserInterests(interests);
      console.log("Kayıt yanıtı:", result);

      setSuccess(t('interest_manager_success_updated'));
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err: any) {
      console.error('İlgi alanları güncelleme hatası:', err);

      // Yetkilendirme hatası kontrolü
      if (err.message && err.message.includes("Unauthorized")) {
        setError(t('interest_manager_error_unauthorized'));
      } else if (err.message && err.message.includes("NetworkError")) {
        setError(t('interest_manager_error_network'));
      } else {
        setError(err.message || t('interest_manager_error_save'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Düzenleme modunu iptal et
  const cancelEditing = () => {
    setIsEditing(false);
    loadInterests(); // Orijinal değerlere geri dönmek için yeniden yükle
    setNewInterest('');
    setError(null);
  };

  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      {showTitle && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">{t('interest_manager_title')}</h3>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="text-primary hover:text-primary/80 flex items-center"
              disabled={isLoading}
            >
              <Pencil className="mr-1" size={14} />
              <span>{t('common_button_edit')}</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={saveChanges}
                className="text-green-600 hover:text-green-800 flex items-center"
                disabled={isLoading}
              >
                <Save className="mr-1" size={14} />
                <span>{t('common_button_save')}</span>
              </button>
              <button
                onClick={cancelEditing}
                className="text-red-600 hover:text-red-800 flex items-center"
                disabled={isLoading}
              >
                <X className="mr-1" size={14} />
                <span>{t('common_button_cancel')}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-4">
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>{t('interest_manager_loading')}</p>
        </div>
      ) : (
        <>
          {/* İlgi alanları listesi */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {interests.length === 0 ? (
                <p className="text-gray-500 text-sm py-2">{t('interest_manager_no_interests')}</p>
              ) : (
                interests.map((interest, index) => (
                  <div
                    key={index}
                    className="bg-primary/5 text-primary px-3 py-1 rounded-full flex items-center"
                  >
                    <span>{interest}</span>
                    {isEditing && (
                      <button
                        onClick={() => removeInterest(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                        aria-label={t('interest_manager_button_remove')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Yeni ilgi alanı ekleme */}
          {isEditing && (
            <div className="mt-4">
              <div className="flex">
                <input
                  type="text"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder={t('interest_manager_placeholder')}
                  className="flex-1 border border-gray-300 rounded-l p-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button
                  onClick={addInterest}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-r flex items-center"
                >
                  <Plus className="mr-1" size={14} />
                  <span>{t('interest_manager_button_add')}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default InterestManager;