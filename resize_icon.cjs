const Jimp = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('public/buddsapp.png');
    // The Gemini watermark is usually bottom right.
    // Crop it by 10% from the bottom and right, then make it square.
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // We'll crop 10% from the right and bottom, leaving a top-left square
    const newSize = Math.min(width, height) * 0.90;
    
    image.crop(0, 0, newSize, newSize);
    
    // Resize to 512x512
    const img512 = image.clone().resize(512, 512);
    await img512.writeAsync('public/icon-512.png');
    
    // Resize to 192x192
    const img192 = image.clone().resize(192, 192);
    await img192.writeAsync('public/icon-192.png');
    
    console.log('Images successfully processed and saved!');
  } catch (error) {
    console.error('Error processing image:', error);
  }
}

processImage();
