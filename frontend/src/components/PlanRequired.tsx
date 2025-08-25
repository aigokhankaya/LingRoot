import React from 'react';

interface PlanRequiredProps {
  message?: string;
  onClose?: () => void;
}

const PlanRequired: React.FC<PlanRequiredProps> = ({ message, onClose }) => {
  const handleOk = () => {
    // Close the modal first
    if (onClose) onClose();
    // Then redirect to dashboard with the package info tab
    window.location.href = '/dashboard#paket-bilgilerim';
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
            onClick={handleOk}
            className="px-6 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanRequired;
