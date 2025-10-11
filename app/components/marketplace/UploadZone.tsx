import { useState, useRef, useCallback } from "react";
import { Upload, X, File, Image as ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadZoneProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  multiple?: boolean;
  disabled?: boolean;
  showPreview?: boolean;
  label?: string;
  description?: string;
}

export function UploadZone({
  onUpload,
  accept = "image/*,video/*,.zip,.rar",
  maxSize = 100, // 100MB default
  maxFiles = 10,
  multiple = true,
  disabled = false,
  showPreview = true,
  label = "Upload Files",
  description = "Drag and drop files here, or click to browse",
}: UploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File size exceeds ${maxSize}MB`;
    }

    // Check file type
    if (accept !== "*") {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const fileType = file.type;
      const fileExt = "." + file.name.split(".").pop();

      const isAccepted = acceptedTypes.some((type) => {
        if (type.endsWith("/*")) {
          return fileType.startsWith(type.replace("/*", ""));
        }
        return type === fileType || type === fileExt;
      });

      if (!isAccepted) {
        return "File type not accepted";
      }
    }

    return null;
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;

      const newFiles: UploadedFile[] = [];
      const filesToUpload: File[] = [];

      for (let i = 0; i < fileList.length; i++) {
        if (files.length + newFiles.length >= maxFiles) {
          alert(`Maximum ${maxFiles} files allowed`);
          break;
        }

        const file = fileList[i];
        const error = validateFile(file);

        if (error) {
          alert(`${file.name}: ${error}`);
          continue;
        }

        const preview = await createFilePreview(file);
        const uploadedFile: UploadedFile = {
          id: Math.random().toString(36).substr(2, 9),
          file,
          preview,
          progress: 0,
          status: "pending",
        };

        newFiles.push(uploadedFile);
        filesToUpload.push(file);
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);

        // Start upload
        setUploading(true);
        try {
          await onUpload(filesToUpload);
          // Mark all as success
          setFiles((prev) =>
            prev.map((f) =>
              newFiles.find((nf) => nf.id === f.id)
                ? { ...f, status: "success", progress: 100 }
                : f
            )
          );
        } catch (error) {
          // Mark all as error
          setFiles((prev) =>
            prev.map((f) =>
              newFiles.find((nf) => nf.id === f.id)
                ? {
                    ...f,
                    status: "error",
                    error: "Upload failed",
                  }
                : f
            )
          );
        } finally {
          setUploading(false);
        }
      }
    },
    [files.length, maxFiles, onUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!disabled) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8" />;
    }
    return <File className="h-8 w-8" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-primary/5"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />

        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">{label}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <p className="text-xs text-muted-foreground">
          Max file size: {maxSize}MB • Max files: {maxFiles}
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Uploaded Files ({files.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                {/* Preview/Icon */}
                {showPreview && uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-12 flex items-center justify-center bg-muted rounded">
                    {getFileIcon(uploadedFile.file)}
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadedFile.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>

                  {/* Progress Bar */}
                  {uploadedFile.status === "uploading" && (
                    <Progress value={uploadedFile.progress} className="mt-2" />
                  )}

                  {/* Error Message */}
                  {uploadedFile.status === "error" && (
                    <p className="text-xs text-red-600 mt-1">
                      {uploadedFile.error}
                    </p>
                  )}
                </div>

                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {uploadedFile.status === "uploading" && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                  {uploadedFile.status === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                  {uploadedFile.status === "error" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadedFile.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(uploadedFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}