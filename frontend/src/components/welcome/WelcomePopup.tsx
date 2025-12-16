'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Mail, CheckCircle } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface WelcomePopupProps {
    isOpen: boolean;
    onClose: () => void;
    userEmail?: string;
}

export const WelcomePopup: React.FC<WelcomePopupProps> = ({ isOpen, onClose, userEmail }) => {
    const { t } = useTranslation();

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-10 h-10 text-primary" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-2xl font-bold">
                        {t('welcome_popup_title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <p className="text-center text-gray-700">
                        {t('welcome_popup_congrats')}
                    </p>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2 text-blue-900">
                            <Mail className="w-5 h-5" />
                            <h3 className="font-semibold">{t('welcome_popup_activation_title')}</h3>
                        </div>
                        <p className="text-sm text-blue-800">
                            {t('welcome_popup_activation_desc')}
                        </p>
                        {userEmail && (
                            <p className="text-sm font-medium text-blue-900 bg-blue-100 rounded px-3 py-2">
                                {userEmail}
                            </p>
                        )}
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-xs text-yellow-800">
                            {t('welcome_popup_activation_note')}
                        </p>
                    </div>
                </div>

                <div className="flex justify-center pt-2">
                    <Button
                        onClick={onClose}
                        className="w-full sm:w-auto px-8"
                        size="lg"
                    >
                        {t('welcome_popup_start_button')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
