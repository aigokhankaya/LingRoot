import React, { useState, useEffect } from 'react';

interface PlanRequiredProps {
  message?: string;
  onClose?: () => void;
  isOpen?: boolean;
}

const PlanRequired: React.FC<PlanRequiredProps> = ({ message, onClose, isOpen = true }) => {
  const [showModal, setShowModal] = useState(isOpen);
  const handleOk = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent form submission if button is inside a form
    try { e?.preventDefault(); e?.stopPropagation(); } catch {}
    // Open in the SAME TAB to avoid popup blockers in mobile/webviews
    try {
      window.location.assign('/dashboard?tab=paket-bilgilerim');
    } finally {
      // Close modal as a safety (may not run if navigation succeeds quickly)
      onClose?.();
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log(' [PlanRequired] Modal opened, checking subscription status...');
      const checkSubscription = async () => {
        try {
          console.log(' [PlanRequired] Fetching usage summary...');
          const response = await fetch('/api/subscription/usage-summary', {
            credentials: 'include'
          });
          const data = await response.json();
          console.log(' [PlanRequired] Usage summary response:', data);
          
          if (data?.data?.hasPlan === false) {
            console.log(' [PlanRequired] No active plan found, showing modal');
            setShowModal(true);
          } else if (data?.data?.hasPlan === true) {
            console.log(' [PlanRequired] Active plan found:', data.data);
            // User has a plan, no need to show modal
            onClose?.();
          }
        } catch (error) {
          console.error(' [PlanRequired] Error checking subscription:', error);
          // Show modal by default if there's an error
          setShowModal(true);
        }
      };
      
      checkSubscription();
    }
  }, [isOpen, onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 ${showModal ? 'block' : 'hidden'}`}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 text-center">
        <div className="text-2xl font-bold mb-2">Abonelik Gerekli</div>
        <p className="text-gray-700 mb-6">
          {message || 'Bu işlemi yapmak için aktif bir paket gerekir.'}
        </p>
        <div className="flex gap-3 justify-center">
          {/* Pure anchor to avoid popup blockers and JS interception */}
          <a
            href="/dashboard?tab=paket-bilgilerim"
            target="_self"
            rel="noopener noreferrer"
            className="px-6 py-2 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 inline-block text-center"
          >
            Tamam
          </a>
        </div>
      </div>
    </div>
  );
};

export default PlanRequired;
