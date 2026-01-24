import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../theme/colors';

/**
 * BlurHeader - Frosted glass style background for transparent headers
 * Uses semi-transparent gradient instead of native blur for better compatibility
 */
const BlurHeader: React.FC = () => {
    return (
        <View style={styles.container}>
            {/* Frosted glass effect with gradient */}
            <LinearGradient
                colors={[
                    'rgba(248, 250, 252, 0.95)', // Almost white top
                    'rgba(248, 250, 252, 0.88)', // Slightly more transparent bottom
                ]}
                style={StyleSheet.absoluteFill}
            />
            {/* Subtle teal tint overlay */}
            <View style={styles.tintOverlay} />
            {/* Bottom border line */}
            <View style={styles.borderLine} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
        // Glassmorphism shadow for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
    },
    tintOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(39, 190, 170, 0.06)', // Subtle brand teal tint
    },
    borderLine: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 0.5,
        backgroundColor: 'rgba(39, 190, 170, 0.15)',
    },
});

export default BlurHeader;
