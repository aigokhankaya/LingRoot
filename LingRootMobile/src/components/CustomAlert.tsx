import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export interface CustomAlertButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
    visible: boolean;
    title: string;
    message?: string;
    buttons?: CustomAlertButton[];
    onDismiss?: () => void;
    icon?: string;
    iconColor?: string;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
    visible,
    title,
    message,
    buttons = [{ text: 'OK', style: 'default' }],
    onDismiss,
    icon,
    iconColor = '#64748B',
}) => {
    const handleButtonPress = (button: CustomAlertButton) => {
        button.onPress?.();
        onDismiss?.();
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
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
            <TouchableWithoutFeedback onPress={onDismiss}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>
                            {/* Icon */}
                            {icon && (
                                <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                                    <Icon name={icon} size={32} color={iconColor} />
                                </View>
                            )}

                            {/* Title */}
                            <Text style={styles.title}>{title}</Text>

                            {/* Message */}
                            {message && <Text style={styles.message}>{message}</Text>}

                            {/* Buttons */}
                            <View style={styles.buttonRow}>
                                {buttons.map((button, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            getButtonStyle(button.style),
                                            buttons.length === 1 && { flex: 1 },
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

export default CustomAlert;
