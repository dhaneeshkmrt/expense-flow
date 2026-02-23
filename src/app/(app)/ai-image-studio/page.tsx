'use client';

import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateImage } from '@/ai/flows/generate-image-flow';
import { Loader2, UploadCloud, Download, Sparkles, Image as ImageIcon, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function AiImageStudioPage() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState<string>('');
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBaseImage(e.target?.result as string);
        setGeneratedImage(null); // Clear previous generation
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateClick = async () => {
    if (!prompt) {
      toast({
        title: 'Prompt is required',
        description: 'Please enter a prompt to generate or edit an image.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);

    try {
      const result = await generateImage({
        prompt,
        imageDataUri: baseImage || undefined,
      });

      if (result.generatedImageUri) {
        setGeneratedImage(result.generatedImageUri);
        toast({
          title: 'Image Generated!',
          description: 'Your new image is ready.',
        });
      } else {
        throw new Error('The AI did not return an image.');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Generation Failed',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadClick = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `ai-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleUseAsBase = () => {
    if (!generatedImage) return;
    setBaseImage(generatedImage);
    setGeneratedImage(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">AI Image Studio</h1>
        <p className="text-muted-foreground">Create new images or edit existing ones using AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Inputs */}
        <Card>
          <CardHeader>
            <CardTitle>Image Generation</CardTitle>
            <CardDescription>
              Provide a prompt to generate an image. You can also upload a base image to edit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="base-image-upload" className="text-sm font-medium">Base Image (Optional)</label>
              <div 
                className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer hover:border-primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-1 text-center">
                  {baseImage ? (
                     <div className="relative w-full h-40">
                      <Image src={baseImage} alt="Base preview" layout="fill" objectFit="contain" />
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
              <Input 
                id="base-image-upload" 
                ref={fileInputRef}
                type="file"
                accept="image/*" 
                className="hidden"
                onChange={handleFileChange}
              />
               {baseImage && (
                  <Button variant="outline" size="sm" onClick={() => setBaseImage(null)}>
                    Remove Image
                  </Button>
                )}
            </div>

            <div className="space-y-2">
              <label htmlFor="prompt" className="text-sm font-medium">Prompt</label>
              <Textarea
                id="prompt"
                placeholder={baseImage ? 'e.g., "make the sky purple"' : 'e.g., "a futuristic cityscape at sunset"'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
              />
            </div>
            
            <Button onClick={handleGenerateClick} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {baseImage ? 'Edit Image' : 'Generate Image'}
            </Button>
          </CardContent>
        </Card>

        {/* Right Column: Output */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Image</CardTitle>
            <CardDescription>Your new image will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center">
                {isLoading && (
                   <div className="flex flex-col items-center gap-2 text-muted-foreground">
                     <Loader2 className="h-8 w-8 animate-spin" />
                     <p>Generating...</p>
                   </div>
                )}
                {!isLoading && generatedImage && (
                    <Image src={generatedImage} alt="Generated image" width={512} height={512} className="rounded-md object-contain" />
                )}
                {!isLoading && !generatedImage && (
                   <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                    <p>Your result will be here</p>
                  </div>
                )}
             </div>
             {generatedImage && (
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={handleDownloadClick} className="flex-1">
                        <Download className="mr-2 h-4 w-4"/>
                        Download
                    </Button>
                    <Button onClick={handleUseAsBase} variant="outline" className="flex-1">
                        <ArrowRight className="mr-2 h-4 w-4"/>
                        Use as New Base
                    </Button>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
