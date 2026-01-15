import LZString from 'lz-string';

// Key encoding/decoding functions from original Webui-BetterPrompt
export function encodeKeyObject(obj: any): [string[], any] {
    let globalKeys: string[] = [];
    let modifiedObject = JSON.parse(JSON.stringify(obj)); // Deep copy the object

    function traverse(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map((item) => traverse(item));
        } else if (typeof obj === "object" && obj !== null) {
            let newObj: any = {};
            for (let key in obj) {
                if (obj.hasOwnProperty(key)) {
                    let keyIndex = globalKeys.indexOf(key);
                    if (keyIndex === -1) {
                        globalKeys.push(key);
                        keyIndex = globalKeys.length - 1;
                    }
                    newObj[keyIndex] = traverse(obj[key]);
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

export function decodeKeyObject(encodedArray: [string[], any]): any {
    let globalKeys = encodedArray[0];
    let modifiedObject = JSON.parse(JSON.stringify(encodedArray[1])); // Deep copy the object

    function traverse(obj: any): any {
        if (Array.isArray(obj)) {
            return obj.map((item) => traverse(item));
        } else if (typeof obj === "object" && obj !== null) {
            let newObj: any = {};
            for (let keyIndex in obj) {
                if (obj.hasOwnProperty(keyIndex)) {
                    let key = globalKeys[parseInt(keyIndex)];
                    newObj[key] = traverse(obj[keyIndex]);
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
export function encodeLegacy(nodes: any[]): string {
    const [keys, encodedObj] = encodeKeyObject(nodes);
    const jsonString = JSON.stringify([keys, encodedObj]);
    return LZString.compressToBase64(jsonString);
}

// Generate unique ID for legacy nodes
function generateLegacyId(): string {
    return Math.random().toString(36).substr(2, 9);
}

// Add unique IDs to decoded nodes recursively
function addIdsToNodes(nodes: any[]): any[] {
    return nodes.map(node => {
        const nodeWithId = {
            ...node,
            id: generateLegacyId()
        };

        // Handle group nodes recursively
        if (node.type === 'group' && node.value && Array.isArray(node.value)) {
            nodeWithId.value = addIdsToNodes(node.value);
        }

        // Convert legacy tag format: if value is array of strings, convert to Tag objects
        if (node.type === 'tags' && node.value && Array.isArray(node.value)) {
            nodeWithId.value = node.value.map((tagValue: any) => {
                // If it's already a Tag object (has value and weight), keep it
                if (typeof tagValue === 'object' && tagValue.value !== undefined && tagValue.weight !== undefined) {
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
export function decodeLegacy(encodedData: string): any[] | null {
    try {
        const decompressed = LZString.decompressFromBase64(encodedData);
        if (!decompressed) return null;

        const decodedArray = JSON.parse(decompressed);
        if (!Array.isArray(decodedArray) || decodedArray.length !== 2) return null;

        const decodedNodes = decodeKeyObject(decodedArray as [string[], any]);

        // Add unique IDs to all nodes recursively
        return addIdsToNodes(decodedNodes);
    } catch (e) {
        return null;
    }
}
