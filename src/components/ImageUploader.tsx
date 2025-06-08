
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, XCircle } from 'lucide-react';
import { uploadProductImage } from '@/services/api';
import { toast } from '@/components/ui/sonner';

interface ImageUploaderProps {
  productId: string;
  onImageUploaded: (imageUrl: string) => void;
}

const ImageUploader = ({ productId, onImageUploaded }: ImageUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Preview the selected image
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setSelectedFile(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile || !productId) return;
    
    setIsUploading(true);
    try {
      // Removed the third argument that was causing the error
      const imageUrl = await uploadProductImage(selectedFile, productId);
      
      if (imageUrl) {
        toast.success('Image successfully uploaded');
        onImageUploaded(imageUrl);
        // Reset the component
        setPreviewImage(null);
        setSelectedFile(null);
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error uploading image');
    } finally {
      setIsUploading(false);
    }
  };
  
  const cancelUpload = () => {
    setPreviewImage(null);
    setSelectedFile(null);
  };
  
  return (
    <div className="w-full">
      {!previewImage ? (
        <div className="border-2 border-dashed border-satstreet-light rounded-lg p-4 text-center">
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <label 
            htmlFor="image-upload" 
            className="cursor-pointer flex flex-col items-center justify-center py-6"
          >
            <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-1">
              Click to upload product image
            </p>
            <p className="text-xs text-muted-foreground">
              (PNG, JPG, up to 10MB)
            </p>
          </label>
        </div>
      ) : (
        <div className="relative">
          <img 
            src={previewImage} 
            alt="Preview" 
            className="w-full h-auto rounded-lg border border-satstreet-light"
          />
          <button 
            onClick={cancelUpload}
            className="absolute top-2 right-2 text-red-500 bg-satstreet-dark/80 rounded-full p-1"
          >
            <XCircle size={20} />
          </button>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-bitcoin hover:bg-bitcoin-dark"
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
