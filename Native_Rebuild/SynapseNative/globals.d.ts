import * as React from 'react';

declare module 'react-native' {
    interface ViewProps {
        className?: string;
    }
    interface TextProps {
        className?: string;
    }
    interface ScrollViewProps {
        className?: string;
    }
    interface TouchableOpacityProps {
        className?: string;
    }
    interface SafeAreaViewProps {
        className?: string;
    }
}

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}
