import { ZoomIn, ZoomOut, Maximize, Grid3X3, Upload, Eye } from "lucide-react";
import KeyIndicator from "../../KeyIndicator";
import type { ZoomToolbarProps } from "../../../types/components";

const ZoomToolbar = ({
    zoom,
    showGrid,
    setShowGrid,
    fitToScreen,
    handleZoomOut,
    handleZoomIn,
    handleResetZoom,
    handleFitToScreen,
    openFileDialog,
    setUiVisible,
}: ZoomToolbarProps) => {
    return (
        <div className="p-2 rounded-2xl border border-studio-border bg-studio-bg/30 p-1 shadow-2xl backdrop-blur">
            <div className="flex gap-1">
                <button onClick={handleZoomOut} className="studio-btn-ghost p-3 rounded-md" title="Zoom Out" type="button">
                    <ZoomOut size={16} />
                </button>
                <button
                    onClick={handleResetZoom}
                    className="studio-btn-ghost px-3 py-3 rounded-md text-xs font-mono min-w-[60px]"
                    title="Reset Zoom"
                    type="button"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <button onClick={handleZoomIn} className="studio-btn-ghost p-3 rounded-md" title="Zoom In" type="button">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px bg-studio-border mx-1" />
                <button
                    onClick={handleFitToScreen}
                    className={fitToScreen ? "studio-btn-ghost p-3 rounded-md text-studio-accent relative" : "studio-btn-ghost p-3 rounded-md relative"}
                    title="Fit to Screen (R)"
                    type="button"
                >
                    <Maximize size={16} />
                    <KeyIndicator keys="R" />
                </button>
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={showGrid ? "studio-btn-ghost p-3 rounded-md text-studio-accent" : "studio-btn-ghost p-3 rounded-md"}
                    title="Toggle Grid"
                    type="button"
                >
                    <Grid3X3 size={16} />
                </button>
                <div className="w-px bg-studio-border mx-1" />
                <button onClick={openFileDialog} className="studio-btn-ghost p-3 rounded-md" title="Upload Image" type="button">
                    <Upload size={16} />
                </button>
                <div className="w-px bg-studio-border mx-1" />
                <button
                    onMouseEnter={() => setUiVisible(false)}
                    onMouseLeave={() => setUiVisible(true)}
                    className="studio-btn-ghost p-3 rounded-md"
                    type="button"
                >
                    <Eye size={16} />
                </button>
            </div>
        </div>
    );
};

export default ZoomToolbar;
