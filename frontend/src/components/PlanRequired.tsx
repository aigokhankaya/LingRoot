import React from 'react';

interface PlanRequiredProps {
  message?: string;
  onClose?: () => void;
}

const PlanRequired: React.FC<PlanRequiredProps> = ({ message, onClose }) => {
  const go = () => {
    window.location.assign('/dashboard#paket-bilgilerim');
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 text-center">
        <div className="text-2xl font-bold mb-2">Abonelik Gerekli</div>
        <p className="text-gray-700 mb-6">
          {message || 'Bu işlemi yapmak için aktif bir paket gerekir.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={go}
            className="px-4 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Paket Seç
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanRequired;
