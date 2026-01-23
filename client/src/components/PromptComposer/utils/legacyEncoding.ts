import LZString from 'lz-string';

// Key encoding/decoding functions from original Webui-BetterPrompt
export function encodeKeyObject(obj: unknown): [string[], unknown] {
    const globalKeys: string[] = [];
    let modifiedObject = JSON.parse(JSON.stringify(obj)); // Deep copy the object

    function traverse(obj: unknown): unknown {
        if (Array.isArray(obj)) {
            return obj.map((item) => traverse(item));
        } else if (typeof obj === "object" && obj !== null) {
            const newObj: Record<number, unknown> = {};
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    let keyIndex = globalKeys.indexOf(key);
                    if (keyIndex === -1) {
                        globalKeys.push(key);
                        keyIndex = globalKeys.length - 1;
                    }
                    newObj[keyIndex] = traverse((obj as Record<string, unknown>)[key]);
                }
            }
            return newObj;
        } else {
            return obj;
        }
    }

    modifiedObject = traverse(modifiedObject);
    return [globalKeys, modifiedObject];
}

export function decodeKeyObject(encodedArray: [string[], unknown]): unknown {
    const globalKeys = encodedArray[0];
    let modifiedObject = JSON.parse(JSON.stringify(encodedArray[1])); // Deep copy the object

    function traverse(obj: unknown): unknown {
        if (Array.isArray(obj)) {
            return obj.map((item) => traverse(item));
        } else if (typeof obj === "object" && obj !== null) {
            const newObj: Record<string, unknown> = {};
            for (const keyIndex in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, keyIndex)) {
                    const key = globalKeys[parseInt(keyIndex)];
                    newObj[key] = traverse((obj as Record<string, unknown>)[keyIndex]);
                }
            }
            return newObj;
        } else {
            return obj;
        }
    }

    modifiedObject = traverse(modifiedObject);
    return modifiedObject;
}

// Legacy encoding: keyEncodeObject + LZString compression
export function encodeLegacy(nodes: unknown[]): string {
    const [keys, encodedObj] = encodeKeyObject(nodes);
    const jsonString = JSON.stringify([keys, encodedObj]);
    return LZString.compressToBase64(jsonString);
}

// Generate unique ID for legacy nodes
function generateLegacyId(): string {
    return Math.random().toString(36).substr(2, 9);
}

// Add unique IDs to decoded nodes recursively
function addIdsToNodes(nodes: unknown[]): unknown[] {
    return nodes.map(node => {
        const nodeWithId = {
            ...(node as Record<string, unknown>),
            id: generateLegacyId()
        };

        const nodeObj = node as Record<string, unknown>;
        // Handle group nodes recursively
        if (nodeObj.type === 'group' && nodeObj.value && Array.isArray(nodeObj.value)) {
            nodeWithId.value = addIdsToNodes(nodeObj.value);
        }

        // Convert legacy tag format: if value is array of strings, convert to Tag objects
        if (nodeObj.type === 'tags' && nodeObj.value && Array.isArray(nodeObj.value)) {
            nodeWithId.value = nodeObj.value.map((tagValue: unknown) => {
                // If it's already a Tag object (has value and weight), keep it
                if (typeof tagValue === 'object' && tagValue !== null && 'value' in tagValue && 'weight' in tagValue) {
                    return tagValue;
                }
                // If it's a string, convert to Tag object with default weight 1
                if (typeof tagValue === 'string') {
                    return { value: tagValue, weight: 1 };
                }
                // Fallback for unknown format
                return { value: String(tagValue), weight: 1 };
            });
        }

        return nodeWithId;
    });
}

// Legacy decoding: LZString decompression + keyDecodeObject + ID generation
export function decodeLegacy(encodedData: string): unknown[] | null {
    try {
        const decompressed = LZString.decompressFromBase64(encodedData);
        if (!decompressed) return null;

        const decodedArray = JSON.parse(decompressed);
        if (!Array.isArray(decodedArray) || decodedArray.length !== 2) return null;

        const decodedNodes = decodeKeyObject(decodedArray as [string[], unknown]);

        // Add unique IDs to all nodes recursively
        return addIdsToNodes(decodedNodes as unknown[]);
    } catch {
        return null;
    }
}
