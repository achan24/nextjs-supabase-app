import ImageTest from '../components/ImageTest';
import VideoTestPage from './video-test';
import SimpleVideoTest from './simple-video-test';
import SimpleVideoEmbed from '../components/SimpleVideoEmbed';

export default function TestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Obsidian Clone Tests</h1>
        <div className="flex gap-4 mb-6">
          <a href="#image-test" className="text-blue-600 hover:text-blue-800 underline">Image Test</a>
          <a href="#video-test" className="text-blue-600 hover:text-blue-800 underline">Video Test</a>
          <a href="#simple-video-test" className="text-blue-600 hover:text-blue-800 underline">Simple Video Test</a>
          <a href="#direct-video-test" className="text-blue-600 hover:text-blue-800 underline">Direct Video Test</a>
        </div>
      </div>
      
      <div id="image-test" className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Image Embedding Test</h2>
        <ImageTest />
      </div>
      
      <div id="video-test" className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Video Embedding Test</h2>
        <VideoTestPage />
      </div>
      
      <div id="simple-video-test" className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Simple Video Test</h2>
        <SimpleVideoTest />
      </div>
      
      <div id="direct-video-test">
        <h2 className="text-xl font-semibold mb-4">Direct Video Test</h2>
        <div className="p-6 border border-gray-300 rounded-md">
          <SimpleVideoEmbed content={`# Direct Video Test

This test uses direct regex processing instead of remark plugins.

## YouTube Video
[Test Video](https://www.youtube.com/watch?v=YE7VzlLtp-4)

## Another Test
[Another Video](https://youtu.be/YE7VzlLtp-4)

## Regular Link
[Regular Link](https://example.com)
`} />
        </div>
      </div>
    </div>
  );
} 