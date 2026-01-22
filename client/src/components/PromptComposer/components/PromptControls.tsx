import { useState } from 'react';
import { cn } from '../../../lib/utils';

interface PromptControlsProps {
    onExportToJson: () => void;
    onImportFromJson: () => void;
    onLoadFromFile: () => void;
    onClearNodes: () => void;
    className?: string;
}

function PromptControls({
    className,
    onExportToJson,
    onImportFromJson,
    onLoadFromFile,
    onClearNodes
}: PromptControlsProps) {
    const [clearPromptActive, setClearPromptActive] = useState(false);

    return (
        <div className={cn("flex items-center gap-1", className)}>
            {clearPromptActive ? (
                <>
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors bg-red-500 text-white hover:bg-red-600"
                        onClick={() => {
                            onClearNodes();
                            setClearPromptActive(false);
                        }}
                        title="Confirm clear"
                    >
                        Yes
                    </button>
                    <button
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                        onClick={() => setClearPromptActive(false)}
                        title="Cancel clear"
                    >
                        No
                    </button>
                </>
            ) : (
                <button
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                    onClick={() => setClearPromptActive(true)}
                    title="Clear prompt"
                >
                    Clear
                </button>
            )}
            <button
                className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                onClick={onExportToJson}
                title="Export to JSON"
            >
                Export to clipboard
            </button>
            <button
                className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                onClick={onImportFromJson}
                title="Import from JSON"
            >
                Import
            </button>
            <button
                className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors text-studio-textSecondary hover:text-studio-text hover:bg-studio-surface"
                onClick={onLoadFromFile}
                title="Load from file"
            >
                Load
            </button>
        </div>
    );
}

export default PromptControls;