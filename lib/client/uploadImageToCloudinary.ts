export type UploadedCloudinaryImage = {
  publicId: string;
  secureUrl: string;
};

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export async function uploadImageToCloudinary(file: File, kind: 'listing' | 'digital-product'): Promise<UploadedCloudinaryImage> {
  const signatureResponse = await fetch('/api/media/signature', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind }),
  });
  const signatureBody: unknown = await signatureResponse.json();
  if (!signatureResponse.ok) {
    const error = signatureBody && typeof signatureBody === 'object' && 'error' in signatureBody
      ? String(signatureBody.error)
      : 'Unable to authorize the image upload.';
    throw new Error(error);
  }
  if (
    !signatureBody || typeof signatureBody !== 'object'
    || !('cloudName' in signatureBody) || typeof signatureBody.cloudName !== 'string'
    || !('apiKey' in signatureBody) || typeof signatureBody.apiKey !== 'string'
    || !('timestamp' in signatureBody) || typeof signatureBody.timestamp !== 'number'
    || !('folder' in signatureBody) || typeof signatureBody.folder !== 'string'
    || !('signature' in signatureBody) || typeof signatureBody.signature !== 'string'
  ) {
    throw new Error('The image upload authorization response was invalid.');
  }
  const signature = signatureBody as UploadSignature;
  const data = new FormData();
  data.set('file', file);
  data.set('api_key', signature.apiKey);
  data.set('timestamp', String(signature.timestamp));
  data.set('folder', signature.folder);
  data.set('signature', signature.signature);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
    { method: 'POST', body: data },
  );
  const uploadBody: unknown = await uploadResponse.json();
  if (!uploadResponse.ok) {
    const uploadError = uploadBody && typeof uploadBody === 'object' && 'error' in uploadBody
      && uploadBody.error && typeof uploadBody.error === 'object' && 'message' in uploadBody.error
      ? String(uploadBody.error.message)
      : 'Cloudinary rejected the image upload.';
    throw new Error(uploadError);
  }
  if (
    !uploadBody || typeof uploadBody !== 'object'
    || !('public_id' in uploadBody) || typeof uploadBody.public_id !== 'string'
    || !('secure_url' in uploadBody) || typeof uploadBody.secure_url !== 'string'
    || !uploadBody.secure_url.startsWith('https://res.cloudinary.com/')
  ) {
    throw new Error('The image service returned an invalid upload result.');
  }
  return { publicId: uploadBody.public_id, secureUrl: uploadBody.secure_url };
}

export async function deleteCloudinaryImage(publicId: string) {
  const response = await fetch('/api/media/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ publicId }),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = result && typeof result === 'object' && 'error' in result
      ? String(result.error)
      : 'Unable to remove the uploaded photo.';
    throw new Error(error);
  }
}
