import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'synapse_neural_cache_';

interface CachePacket<T> {
    data: T;
    timestamp: number;
    version: string;
}

export const saveToCache = async <T>(key: string, data: T): Promise<void> => {
    try {
        if (!data) return;

        const cachePacket: CachePacket<T> = {
            data: data,
            timestamp: Date.now(),
            version: '1.0'
        };
        await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cachePacket));
    } catch (error) {
        console.warn("Neural Cache Write Failure:", error);
    }
};

export const loadFromCache = async <T>(key: string): Promise<T | null> => {
    try {
        const rawPacket = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
        if (!rawPacket) return null;

        const packet: CachePacket<T> = JSON.parse(rawPacket);
        if (!packet || !packet.data) return null;

        return packet.data;
    } catch (error) {
        console.warn("Neural Cache Read Failure:", error);
        return null;
    }
};

export const clearCacheKey = async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
};

export const clearAllNeuralCache = async (): Promise<void> => {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const synapseKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
        await AsyncStorage.multiRemove(synapseKeys);
    } catch (error) {
        console.warn("Neural Cache Clear Failure:", error);
    }
};
