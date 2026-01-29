import { cn } from "../../../lib/utils";
import { Upload } from "lucide-react";

const EmptyState = ({
    canvasRef,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    openFileDialog,
}: {
    canvasRef: React.RefObject<HTMLDivElement>;
    isDragOver: boolean;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    openFileDialog: () => void;
}) => {
    return (
        <div className="flex-1 overflow-hidden min-h-0" style={{ minHeight: "400px" }}>
            <div
                ref={canvasRef}
                className={cn(
                    "w-full h-full flex items-center justify-center p-8 overflow-hidden relative transition-colors duration-200",
                    isDragOver && "bg-studio-accent/10 border-2 border-dashed border-studio-accent"
                )}
                style={{
                    minHeight: "400px",
                    cursor: isDragOver ? "copy" : "default",
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="text-center text-studio-text-muted">
                    <div
                        className={cn(
                            "w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center mb-4 mx-auto transition-colors duration-200 cursor-pointer",
                            isDragOver
                                ? "border-studio-accent bg-studio-accent/10"
                                : "border-studio-border hover:border-studio-accent/50"
                        )}
                        onClick={openFileDialog}
                        title="Click to upload image or drag & drop here"
                    >
                        <Upload size={32} className="mb-2" />
                        <p className="text-sm font-medium">
                            {isDragOver ? "Drop image here" : "Click to upload"}
                        </p>
                        <p className="text-xs mt-1">or drag & drop image here</p>
                    </div>
                    <>
                        <h3 className="text-lg font-medium mb-2">Ready to Inpaint</h3>
                        <p className="text-sm">Upload an image and start drawing your mask</p>
                    </>
                </div>
            </div>
        </div>
    );
};

export default EmptyState;