import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Music, Play, Square, Info } from "lucide-react";
import { 
  isMedianApp, 
  startBackgroundAudio, 
  stopBackgroundAudio 
} from "@/lib/median-background-audio";

export default function MedianBackgroundAudioDemo() {
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const handleStartAudio = () => {
    try {
      // Start background audio service
      const success = startBackgroundAudio();
      
      if (success) {
        // Create and play a simple audio for testing
        const audio = new Audio();
        audio.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjiS1/Pec0UIKYfR9N+WSgsUXrTq7K5YFQxMmtvNKTZRJGgWiSx6Kh9WMmcnQExGREUsTCU/EycnVk1HTiNlE1wqXBdLMEwhqw2Atqux0eL11qOO0+PWtIvf796TpuLXw4rI6wVDRUjeFzbrCHj6aaGzR6tOQ+g86/Jh3oa3G/iGX4fV79ORn/inUWnfRCcZNIfVLKzjMGvFBIOxVZNdQlRqEDjU7Rdu9nnGH14NvT2BR23AJWMdGwznfJ7GmETZx9mnlUdpTsANHTvlRKSPVsRCD6xpzKJlJZ9x4kAxBl6miWo3ZKyZ7kyB2JidpoDQPow80R1Kd+OjA5qbQhKrhPOUgKD3i0eVH9WQqdfgm0HV1+oA7u/PAoTawvLFyMzW56VjG6sQ9Hw0h9mfKZWfJPm6EIWmGHHLjvYIDYKO7Vb8wgzTiPL9lICqK6QDm5NyC5OX5pGLVyZm0G1oxW7aY1dUGBLU/6AjWZLPQkt2qQ6Qrqxuc1mURfXF0f9dgQeeYYEqePqzn7kN5+EYaHdKrQcANYLNfNYU+FnwLBduz2Uc4U1PLgHwMxcfvdGieIIu/78cGZbhfJi3/7znAAABBYmCb1pmd5uzqnxbKSxgsFvipGAYBEKM0/y3bygFMIDM9MOIRwUYZ7bl3pZKCwxOruC+r1sVCEKPzvLWizgGHJLk+MGNMAUkd8vx15BAChlcsuuqpU4HDFup4cGqWgwGaKzh0gAAAA==";
        audio.loop = true;
        audio.play();
        setAudioElement(audio);
        setIsAudioActive(true);
        
        toast({
          title: "Background Audio Started",
          description: "Audio will continue playing when app is backgrounded",
        });
      } else {
        toast({
          title: "Not in Median App",
          description: "Background audio only works in the Median mobile app",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting audio:", error);
      toast({
        title: "Error",
        description: "Failed to start background audio",
        variant: "destructive",
      });
    }
  };

  const handleStopAudio = () => {
    try {
      // Stop the test audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setAudioElement(null);
      }
      
      // Stop background audio service
      stopBackgroundAudio();
      setIsAudioActive(false);
      
      toast({
        title: "Background Audio Stopped",
        description: "Audio service has been released",
      });
    } catch (error) {
      console.error("Error stopping audio:", error);
      toast({
        title: "Error", 
        description: "Failed to stop background audio",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-6 w-6" />
            Median Background Audio Demo
          </CardTitle>
          <CardDescription>
            Test background audio functionality for iOS devices in the Median app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Status */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Environment Status</h3>
            <div className="flex items-center gap-2">
              <Badge variant={isMedianApp() ? "default" : "outline"}>
                {isMedianApp() ? "Running in Median App" : "Not in Median App"}
              </Badge>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Background Audio for iOS
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  This feature allows audio to continue playing when the app is minimized,
                  backgrounded, or when the device screen is locked. This is essential for
                  voice recording during patient encounters.
                </p>
              </div>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Audio Test Controls</h3>
            <div className="flex gap-2">
              {!isAudioActive ? (
                <Button
                  onClick={handleStartAudio}
                  className="flex items-center gap-2"
                  variant="default"
                >
                  <Play className="h-4 w-4" />
                  Start Background Audio
                </Button>
              ) : (
                <Button
                  onClick={handleStopAudio}
                  className="flex items-center gap-2"
                  variant="destructive"
                >
                  <Square className="h-4 w-4" />
                  Stop Background Audio
                </Button>
              )}
            </div>
            {isAudioActive && (
              <p className="text-sm text-muted-foreground">
                Audio is playing. Try minimizing the app or locking your screen - 
                the audio should continue playing.
              </p>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Testing Instructions</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Click "Start Background Audio" to begin the test</li>
              <li>Minimize the app or lock your iOS device screen</li>
              <li>The audio should continue playing in the background</li>
              <li>Return to the app and click "Stop Background Audio" when done</li>
            </ol>
          </div>

          {/* Technical Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Technical Details</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Uses Median JavaScript Bridge: <code>median.backgroundAudio.start()</code></p>
              <p>• iOS only - Android handles background audio natively</p>
              <p>• Integrated with voice recording for continuous transcription</p>
              <p>• No effect when running in web browser</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}