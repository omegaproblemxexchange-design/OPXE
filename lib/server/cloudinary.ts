import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary server credentials are not configured.');
  }
  return { cloudName, apiKey, apiSecret };
}

export function createCloudinaryUploadSignature(folder: string) {
  const config = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder, timestamp },
    config.apiSecret,
  );
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    folder,
    signature,
  };
}

export async function verifyCloudinaryImage(publicId: string, expectedFolder: string) {
  getCloudinaryConfig();
  if (!publicId.startsWith(`${expectedFolder}/`)) {
    throw new Error('The uploaded image does not belong to this account or upload type.');
  }
  const resource = await cloudinary.api.resource(publicId, { resource_type: 'image' });
  if (
    resource.resource_type !== 'image'
    || !resource.secure_url?.startsWith('https://res.cloudinary.com/')
    || !['jpg', 'jpeg', 'png', 'webp'].includes(String(resource.format).toLowerCase())
    || resource.bytes > 8 * 1024 * 1024
    || resource.width < 1
    || resource.height < 1
  ) {
    throw new Error('The uploaded file is not an allowed image or is larger than 8 MB.');
  }
  return {
    publicId: resource.public_id as string,
    secureUrl: resource.secure_url as string,
    contentType: resource.format === 'png' ? 'image/png' : resource.format === 'webp' ? 'image/webp' : 'image/jpeg',
    byteSize: resource.bytes as number,
    width: resource.width as number,
    height: resource.height as number,
  };
}
