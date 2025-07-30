// backend/config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer'; // This line was missing
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'relay_profiles',
    allowed_formats: ['jpeg', 'jpg', 'png', 'webp'],
    transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }]
  },
});

export const parser = multer({ storage: storage });
