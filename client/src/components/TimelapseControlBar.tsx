import { useState, useEffect, useRef } from 'react';
import { Play, ChevronRight, Check, Loader2 } from 'lucide-react';
import { cn, API_BASE_URL } from '../lib/utils';


interface TimelapseControlBarProps {
    workspaceId: string;
    onPreview: (videoUrl: string) => void;
    collapsed?: boolean;
}

export const TimelapseControlBar = ({ workspaceId, onPreview, collapsed }: TimelapseControlBarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [settings, setSettings] = useState({
        fps: 40,
        quality: "high",
        show_timestamp: false,
        zoom_into_partials: true,
        last_frame_duration: 2.0,
        frame_duration: 100, // ms
        show_mask: true,
        mask_duration: 150,
        use_range: false,
        range_str: "-10..",
        translate_speed: 3.0,
    });

    const pollIntervalRef = useRef<number | null>(null);

    const handleCreate = async () => {
        setIsGenerating(true);
        setProgress(0);
        setStatusMessage("Initializing...");

        try {
            // Start the timelapse job
            const response = await fetch(`${API_BASE_URL}/api/viteapi/timelapse/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    workspace: workspaceId,
                    ...settings,
                    range: settings.use_range ? settings.range_str : undefined
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to start timelapse');
            }

            const data = await response.json();
            const jobId = data.job_id;

            // Start polling
            pollIntervalRef.current = window.setInterval(async () => {
                try {
                    const statusRes = await fetch(`${API_BASE_URL}/api/viteapi/timelapse/status/${jobId}`);
                    if (!statusRes.ok) return;

                    const status = await statusRes.json();
                    setProgress(status.progress);
                    setStatusMessage(status.message);

                    if (status.status === 'completed') {
                        clearInterval(pollIntervalRef.current!);
                        setIsGenerating(false);

                        // Construct video path
                        // Use the consistent file serving endpoint
                        const videoUrl = `${API_BASE_URL}/api/viteapi/timelapse/file/${workspaceId}/${status.filename}`;
                        onPreview(videoUrl);
                    } else if (status.status === 'failed') {
                        clearInterval(pollIntervalRef.current!);
                        setIsGenerating(false);
                        alert(`Timelapse failed: ${status.error}`);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);

        } catch (error) {
            console.error("Error starting timelapse:", error);
            setIsGenerating(false);
            alert("Failed to start timelapse generation.");
        }
    };

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    if (collapsed) return null;

    return (
        <div className="flex flex-col gap-1 px-1">
            <div className={cn(
                "flex items-center gap-1 rounded bg-studio-surface border border-studio-border p-1 text-xs",
                isOpen ? "border-studio-accent" : ""
            )}>
                {/* Expand/Collapse Settings */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "p-1 hover:bg-studio-panel rounded text-studio-textSecondary transition-transform duration-200",
                        isOpen ? "rotate-90" : ""
                    )}
                    title="Timelapse Settings"
                    disabled={isGenerating}
                >
                    <ChevronRight size={14} />
                </button>

                {/* Main Action Area */}
                <div className="flex-1 flex items-center justify-between gap-2 min-w-0">
                    {isGenerating ? (
                        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center justify-between text-[10px] text-studio-textSecondary">
                                <span className="truncate">{statusMessage}</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1 bg-studio-panel rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-studio-accent transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center gap-2">
                            <span className="text-studio-textSecondary font-medium">Timelapse</span>
                            <div className="h-px flex-1 bg-studio-border" />
                        </div>
                    )}

                    {/* Create Button */}
                    <button
                        onClick={handleCreate}
                        disabled={isGenerating}
                        className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded text-studio-bg font-medium transition-all duration-200",
                            isGenerating
                                ? "bg-studio-textSecondary cursor-not-allowed opacity-50"
                                : "bg-studio-accent hover:bg-studio-accent-hover shadow-sm hover:shadow"
                        )}
                        title="Create Timelapse"
                    >
                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} fill="currentColor" />}
                        <span className="hidden sm:inline">{isGenerating ? 'Working' : 'Create'}</span>
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {isOpen && (
                <div className="p-2 rounded bg-studio-panel border border-studio-border space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-studio-textSecondary uppercase tracking-wider block">FPS</label>
                            <input
                                type="number"
                                value={settings.fps}
                                onChange={(e) => setSettings({ ...settings, fps: Number(e.target.value) })}
                                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:border-studio-accent outline-none"
                                min={1} max={60}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-studio-textSecondary uppercase tracking-wider block">Frame Duration (ms)</label>
                            <input
                                type="number"
                                value={settings.frame_duration}
                                onChange={(e) => setSettings({ ...settings, frame_duration: Number(e.target.value) })}
                                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:border-studio-accent outline-none"
                                min={10} step={10}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-studio-textSecondary uppercase tracking-wider block">Pan Speed</label>
                            <input
                                type="number"
                                value={settings.translate_speed}
                                onChange={(e) => setSettings({ ...settings, translate_speed: Number(e.target.value) })}
                                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:border-studio-accent outline-none"
                                min={0.1} step={0.1}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-studio-textSecondary uppercase tracking-wider block">Last Frame (s)</label>
                            <input
                                type="number"
                                value={settings.last_frame_duration}
                                onChange={(e) => setSettings({ ...settings, last_frame_duration: Number(e.target.value) })}
                                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:border-studio-accent outline-none"
                                min={0}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-studio-textSecondary uppercase tracking-wider block">Quality</label>
                            <select
                                value={settings.quality}
                                onChange={(e) => setSettings({ ...settings, quality: e.target.value })}
                                className="w-full bg-studio-surface border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:border-studio-accent outline-none"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="ultra">Ultra</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-studio-border/50">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={cn(
                                "w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                                settings.show_timestamp ? "bg-studio-accent border-studio-accent" : "border-studio-textSecondary group-hover:border-studio-text"
                            )}>
                                {settings.show_timestamp && <Check size={10} className="text-studio-bg" strokeWidth={3} />}
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.show_timestamp}
                                onChange={(e) => setSettings({ ...settings, show_timestamp: e.target.checked })}
                                className="hidden"
                            />
                            <span className="text-xs text-studio-textSecondary group-hover:text-studio-text transition-colors">Show Timestamp</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={cn(
                                "w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                                settings.zoom_into_partials ? "bg-studio-accent border-studio-accent" : "border-studio-textSecondary group-hover:border-studio-text"
                            )}>
                                {settings.zoom_into_partials && <Check size={10} className="text-studio-bg" strokeWidth={3} />}
                            </div>
                            <input
                                type="checkbox"
                                checked={settings.zoom_into_partials}
                                onChange={(e) => setSettings({ ...settings, zoom_into_partials: e.target.checked })}
                                className="hidden"
                            />
                            <span className="text-xs text-studio-textSecondary group-hover:text-studio-text transition-colors">Zoom into Partials</span>
                        </label>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={cn(
                                    "w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                                    settings.show_mask ? "bg-studio-accent border-studio-accent" : "border-studio-textSecondary group-hover:border-studio-text"
                                )}>
                                    {settings.show_mask && <Check size={10} className="text-studio-bg" strokeWidth={3} />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.show_mask}
                                    onChange={(e) => setSettings({ ...settings, show_mask: e.target.checked })}
                                    className="hidden"
                                />
                                <span className="text-xs text-studio-textSecondary group-hover:text-studio-text transition-colors">Show Mask</span>
                            </label>

                            {settings.show_mask && (
                                <div className="flex items-center gap-1 animate-in slide-in-from-left-2 fade-in duration-200">
                                    <input
                                        type="number"
                                        value={settings.mask_duration}
                                        onChange={(e) => setSettings({ ...settings, mask_duration: Number(e.target.value) })}
                                        className="w-12 bg-studio-surface border border-studio-border rounded px-1 py-0.5 text-xs text-studio-text focus:border-studio-accent outline-none"
                                        min={10} step={10}
                                    />
                                    <span className="text-[10px] text-studio-textSecondary">ms</span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={cn(
                                    "w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                                    settings.use_range ? "bg-studio-accent border-studio-accent" : "border-studio-textSecondary group-hover:border-studio-text"
                                )}>
                                    {settings.use_range && <Check size={10} className="text-studio-bg" strokeWidth={3} />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.use_range}
                                    onChange={(e) => setSettings({ ...settings, use_range: e.target.checked })}
                                    className="hidden"
                                />
                                <span className="text-xs text-studio-textSecondary group-hover:text-studio-text transition-colors">Limit Range</span>
                            </label>

                            {settings.use_range && (
                                <div className="flex items-center gap-1 animate-in slide-in-from-left-2 fade-in duration-200 flex-1">
                                    <input
                                        type="text"
                                        value={settings.range_str}
                                        onChange={(e) => setSettings({ ...settings, range_str: e.target.value })}
                                        className="w-full bg-studio-surface border border-studio-border rounded px-2 py-0.5 text-xs text-studio-text focus:border-studio-accent outline-none"
                                        placeholder="e.g. -10.."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <ExistingTimelapsesList workspaceId={workspaceId} onPreview={onPreview} isOpen={isOpen} />
                </div>
            )}
        </div>
    );
};

const ExistingTimelapsesList = ({ workspaceId, onPreview, isOpen }: { workspaceId: string, onPreview: (url: string) => void, isOpen: boolean }) => {
    const [timelapses, setTimelapses] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTimelapses();
        }
    }, [isOpen, workspaceId]);

    const fetchTimelapses = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/viteapi/timelapse/list/${workspaceId}`);
            if (res.ok) {
                const data = await res.json();
                setTimelapses(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="pt-2 border-t border-studio-border/50 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-studio-textSecondary uppercase tracking-wider">Previous Timelapses</span>
                <button onClick={fetchTimelapses} className="p-1 hover:bg-studio-surface rounded text-studio-textSecondary" title="Refresh">
                    <Loader2 size={10} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {timelapses.length === 0 && !loading && (
                    <div className="text-xs text-studio-text-muted italic">No timelapses found</div>
                )}
                {timelapses.map((t) => (
                    <div key={t.name} className="flex items-center justify-between gap-2 p-1 hover:bg-studio-surface rounded group">
                        <span className="text-xs text-studio-text truncate flex-1" title={t.name}>
                            {t.name.replace('timelapse_', '').replace('.mp4', '').replace('_', ' ')}
                        </span>
                        <button
                            onClick={() => onPreview(`${API_BASE_URL}/api/viteapi/timelapse/file/${workspaceId}/${t.name}`)}
                            className="p-1 hover:bg-studio-accent hover:text-studio-bg rounded text-studio-textSecondary transition-colors"
                            title="Play"
                        >
                            <Play size={10} fill="currentColor" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
