import { ZoomIn, ZoomOut, Maximize, Grid3X3, Upload } from "lucide-react";

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
}) => {
    return (
        <div className="studio-panel p-2">
            <div className="flex gap-1">
                <button onClick={handleZoomOut} className="studio-btn-ghost p-2" title="Zoom Out">
                    <ZoomOut size={16} />
                </button>
                <button
                    onClick={handleResetZoom}
                    className="studio-btn-ghost px-3 py-2 text-xs font-mono min-w-[60px]"
                    title="Reset Zoom"
                >
                    {Math.round(zoom * 100)}%
                </button>
                <button onClick={handleZoomIn} className="studio-btn-ghost p-2" title="Zoom In">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px h-6 bg-studio-border mx-1" />
                <button
                    onClick={handleFitToScreen}
                    className={fitToScreen ? "studio-btn-ghost p-2 text-studio-accent" : "studio-btn-ghost p-2"}
                    title="Fit to Screen"
                >
                    <Maximize size={16} />
                </button>
                <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={showGrid ? "studio-btn-ghost p-2 text-studio-accent" : "studio-btn-ghost p-2"}
                    title="Toggle Grid"
                >
                    <Grid3X3 size={16} />
                </button>
                <div className="w-px h-6 bg-studio-border mx-1" />
                <button onClick={openFileDialog} className="studio-btn-ghost p-2" title="Upload Image">
                    <Upload size={16} />
                </button>
            </div>
        </div>
    );
};

export default ZoomToolbar;