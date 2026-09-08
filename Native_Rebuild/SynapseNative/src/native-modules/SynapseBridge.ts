import { NativeModules } from 'react-native';

interface SynapseBridgeInterface {
    performNeuralSync(token: string): Promise<boolean>;
    getHardwareStats(): Promise<{
        manufacturer: string;
        model: string;
        version: number;
    }>;
}

const { SynapseBridge } = NativeModules;

export default {
    performNeuralSync: (token: string): Promise<boolean> => {
        return SynapseBridge.performNeuralSync(token);
    },
    getHardwareStats: (): Promise<{
        manufacturer: string;
        model: string;
        version: number;
    }> => {
        return SynapseBridge.getHardwareStats();
    }
} as SynapseBridgeInterface;
