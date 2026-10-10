import { getAccessToken } from './firebase';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  iconLink?: string;
  webViewLink?: string;
}

/**
 * List files from user's Google Drive using the cached OAuth token.
 */
export async function listGoogleDriveFiles(query = ""): Promise<GoogleDriveFile[]> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("يجب تسجيل الدخول بحساب Google للوصول إلى Google Drive");
  }

  // Filter for educational files: pdf, text, docs, sheets, presentations
  let q = "trashed = false";
  if (query.trim()) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&q=${encodeURIComponent(q)}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("انتهت صلاحية جلسة Google Drive. يرجى تسجيل الدخول مجددًا.");
    }
    const errText = await response.text();
    throw new Error(`خطأ في الوصول إلى Google Drive (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return (data.files || []) as GoogleDriveFile[];
}

/**
 * Download a file from Google Drive and return binary data or text.
 */
export async function downloadGoogleDriveFile(file: GoogleDriveFile): Promise<{
  content: string;
  blob?: Blob;
  mimeType: string;
  name: string;
}> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("رمز الوصول لـ Google Drive غير متوفر");
  }

  // Use the backend server proxy to fetch and convert if necessary
  const response = await fetch("/api/drive/fetch-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fileId: file.id }),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `فشل تحميل الملف من Google Drive`);
  }

  const data = await response.json();
  const binaryString = atob(data.dataBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: data.mimeType });
  let content = "";

  if (data.mimeType === "text/plain" || data.mimeType.includes("text")) {
    content = new TextDecoder("utf-8").decode(bytes);
  } else {
    // For PDF or binaries, text will be extracted by the PDF parser
    content = `[ملف تم استيراده من Google Drive: ${data.name}]`;
  }

  return {
    content,
    blob,
    mimeType: data.mimeType,
    name: data.name,
  };
}

/**
 * Save note or summary directly to user's Google Drive.
 * Requires user confirmation before creating or updating.
 */
export async function saveTextToGoogleDrive(
  title: string,
  content: string
): Promise<{ success: boolean; fileId: string }> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("يجب تسجيل الدخول للوصول إلى Google Drive");
  }

  const metadata = {
    name: `${title}.txt`,
    mimeType: "text/plain",
  };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("file", new Blob([content], { type: "text/plain" }));

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل حفظ الملف في Google Drive: ${errText}`);
  }

  const data = await res.json();
  return { success: true, fileId: data.id };
}
