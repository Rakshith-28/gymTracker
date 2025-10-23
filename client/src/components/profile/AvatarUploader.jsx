import { useRef, useState } from 'react';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AvatarUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || '');

  const onPick = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const b64 = await fileToBase64(file);
    setPreview(b64);
    onChange?.(b64);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-18 h-18 rounded-full overflow-hidden border border-white/15 bg-white/5 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-300 font-bold text-sm">No Photo</span>
        )}
      </div>
      <div>
        <button type="button" onClick={onPick} className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200">Upload</button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
    </div>
  );
}
