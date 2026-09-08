import React from 'react';
import { ViewStyle } from 'react-native';
import { MotiView } from 'moti';

interface SynapseLogoProps {
    size?: number;
}

const SynapseLogo: React.FC<SynapseLogoProps> = ({ size = 60 }) => (
    <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' } as ViewStyle}
        transition={{ type: 'timing', duration: 500 }}
    >
        <MotiView
            animate={{ rotate: '360deg' }}
            transition={{ duration: 8000, loop: true, type: 'timing', easing: (t: number) => t }}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderWidth: 2,
                borderColor: 'rgba(16, 185, 129, 0.2)',
                transform: [{ rotate: '45deg' }],
                borderRadius: size * 0.1
            } as ViewStyle}
        />
        <MotiView
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.8, 0.3], rotate: '45deg' }}
            transition={{ duration: 2000, loop: true, type: 'timing' }}
            style={{
                width: size / 2,
                height: size / 2,
                backgroundColor: '#10b981',
                borderRadius: size * 0.05,
                shadowColor: '#10b981',
                shadowOffset: { width: 0, height: 0 },
                shadowRadius: 10,
                shadowOpacity: 0.8,
                elevation: 10
            } as ViewStyle}
        />
        {[0, 1, 2, 3].map((i) => (
            <MotiView
                key={i}
                animate={{
                    translateY: [-10, 10, -10],
                    translateX: i % 2 === 0 ? [-5, 5, -5] : [5, -5, 5],
                    opacity: [0, 1, 0]
                }}
                transition={{ duration: 3000, delay: i * 500, loop: true, type: 'timing' }}
                style={{
                    position: 'absolute',
                    width: 4,
                    height: 4,
                    backgroundColor: '#34d399',
                    borderRadius: 2,
                    top: i < 2 ? '0%' : '100%',
                    left: i % 2 === 0 ? '0%' : '100%'
                } as ViewStyle}
            />
        ))}
    </MotiView>
);

export default SynapseLogo;
