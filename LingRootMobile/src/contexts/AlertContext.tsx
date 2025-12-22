import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface AlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface AlertConfig {
    title: string;
    message?: string;
    buttons?: AlertButton[];
    icon?: string;
    iconColor?: string;
}

interface AlertContextType {
    showAlert: (title: string, message?: string, buttons?: AlertButton[], icon?: string, iconColor?: string) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export const useCustomAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        // Fallback to native Alert if context not available
        return {
            showAlert: (title: string, message?: string, buttons?: AlertButton[]) => {
                const { Alert } = require('react-native');
                Alert.alert(title, message, buttons?.map(b => ({ text: b.text, onPress: b.onPress, style: b.style })));
            },
            hideAlert: () => { },
        };
    }
    return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [visible, setVisible] = useState(false);
    const [config, setConfig] = useState<AlertConfig>({
        title: '',
        message: '',
        buttons: [{ text: 'OK', style: 'default' }],
    });

    const showAlert = useCallback((
        title: string,
        message?: string,
        buttons?: AlertButton[],
        icon?: string,
        iconColor?: string
    ) => {
        setConfig({
            title,
            message,
            buttons: buttons || [{ text: 'OK', style: 'default' }],
            icon,
            iconColor,
        });
        setVisible(true);
    }, []);

    const hideAlert = useCallback(() => {
        setVisible(false);
    }, []);

    const handleButtonPress = (button: AlertButton) => {
        hideAlert();
        // Execute onPress after hiding to prevent UI flicker
        setTimeout(() => {
            button.onPress?.();
        }, 100);
    };

    const getButtonStyle = (style?: 'default' | 'cancel' | 'destructive') => {
        switch (style) {
            case 'destructive':
                return { backgroundColor: '#FEE2E2', borderColor: '#FECACA' };
            case 'cancel':
                return { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0' };
            default:
                return { backgroundColor: '#14B8A6', borderColor: '#14B8A6' };
        }
    };

    const getButtonTextStyle = (style?: 'default' | 'cancel' | 'destructive') => {
        switch (style) {
            case 'destructive':
                return { color: '#DC2626' };
            case 'cancel':
                return { color: '#475569' };
            default:
                return { color: '#FFFFFF' };
        }
    };

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <Modal visible={visible} transparent animationType="fade" onRequestClose={hideAlert}>
                <TouchableWithoutFeedback onPress={hideAlert}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.container}>
                                {config.icon && (
                                    <View style={[styles.iconContainer, { backgroundColor: (config.iconColor || '#64748B') + '15' }]}>
                                        <Icon name={config.icon} size={32} color={config.iconColor || '#64748B'} />
                                    </View>
                                )}
                                <Text style={styles.title}>{config.title}</Text>
                                {config.message && <Text style={styles.message}>{config.message}</Text>}
                                <View style={styles.buttonRow}>
                                    {config.buttons?.map((button, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.button,
                                                getButtonStyle(button.style),
                                                config.buttons?.length === 1 && { flex: 1 },
                                            ]}
                                            onPress={() => handleButtonPress(button)}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[styles.buttonText, getButtonTextStyle(button.style)]}>
                                                {button.text}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </AlertContext.Provider>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 30,
        elevation: 20,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 8,
    },
    message: {
        fontSize: 15,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});

export default AlertProvider;
