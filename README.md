# Stitchy

Stitchy is an Electron-based desktop application that helps you create animated GIFs from 3-frame stereoscopic images. It's particularly useful for converting 3D camera photos into animated GIFs.

## Features

-   🖼️ Automatic frame detection from 3-frame stereoscopic images
-   ✂️ Advanced cropping tools for precise frame adjustments
-   🎞️ Customizable animation speed (0.5x, 1x, 2x)
-   💾 Multiple save options (Quick Save & Save As)
-   🎯 Frame-by-frame editing capabilities
-   🔄 Ping-pong animation effect (forward and backward loop)

## Installation

### Prerequisites

-   Node.js (v14 or higher)
-   npm (comes with Node.js)

### Setup

1. Clone the repository: `bash
git clone https://github.com/yourusername/stitchy.git
cd stitchy    `

2. Install dependencies: `bash
npm install    `

3. Start the development server: `bash
npm start    `

### Building the Application

To create a distributable version:

1. For all platforms: `bash
npm run make    `

2. Platform-specific builds: ```bash

    # For Windows

    npm run make -- --platform win32

    # For macOS

    npm run make -- --platform darwin

    # For Linux

    npm run make -- --platform linux ```

The built applications will be available in the `out` directory.

## Usage

### 1. Loading an Image

-   Drag and drop your 3-frame image onto the upload area
-   Or click "Select File" to choose an image from your computer
-   Supported formats: JPEG, PNG

### 2. Frame Editing

After loading an image, you'll see three detected frames. For each frame:

1. Click the "Crop" button under any frame to enter edit mode
2. Use the blue cropping tool to adjust the frame boundaries:
    - Drag the corners/edges to resize
    - Drag inside the crop area to move it
    - The dimensions are shown in the top-right corner
3. Use the control buttons:
    - **Apply**: Save your crop adjustments
    - **Reset Crop**: Return to the initial crop position
    - **Cancel**: Exit without saving changes

### 3. Creating the GIF

1. Click "Create GIF" after you're satisfied with the frames
2. In the output modal, you can:
    - Preview the animation
    - Adjust animation speed (0.5x, 1x, 2x)
    - Save the GIF using either:
        - Quick Save: Saves to an 'animated' folder in the source directory
        - Save As: Choose your save location

### 4. Additional Controls

-   **Reset**: Start over with a new image (top-right corner)
-   **Upload Another**: Load a new image after creating a GIF

## Troubleshooting

If you encounter issues:

1. **Frames not detecting properly:**

    - Ensure your image has three distinct frames
    - Try adjusting the crop manually

2. **GIF creation fails:**

    - Check that all frames are properly cropped
    - Ensure you have sufficient disk space

3. **Application not starting:**
    - Verify Node.js is properly installed
    - Try reinstalling dependencies with `npm install`
    - Check console for error messages

## Dependencies

This project uses several key dependencies:

-   Electron
-   Sharp (for image processing)
-   FFmpeg (for GIF creation)
-   Cropper.js (for frame editing)
-   Tailwind CSS (for styling)

## License

MIT License

Copyright (c) 2024

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
