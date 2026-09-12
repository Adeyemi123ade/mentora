import { useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import type { TutorProfileDto } from '@mentora/shared';
import { apiRequest, apiUpload, ApiError } from '../lib/api';
import { CheckIcon, UploadCloudIcon } from './Icons';

type Kind = 'photo' | 'idFront' | 'idBack' | 'certificate' | 'supportingDoc';

export function DocumentUploader({
  label,
  hint,
  fileUrl,
  kind,
  onChange,
  icon,
  invalid,
  invalidMessage,
  required,
}: {
  label: string;
  hint: string;
  fileUrl: string | null;
  kind: Kind;
  onChange: (profile: TutorProfileDto) => void;
  icon?: ReactNode;
  invalid?: boolean;
  invalidMessage?: string;
  required?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);
      const res = await apiUpload<{ profile: TutorProfileDto }>('/api/tutor-profile/me/documents', formData);
      if (res.data?.profile) onChange(res.data.profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ profile: TutorProfileDto }>(`/api/tutor-profile/me/documents/${kind}`, { method: 'DELETE' });
      if (res.data?.profile) onChange(res.data.profile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove file. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tutor-upload-wrap">
      <button
        type="button"
        className={fileUrl ? 'tutor-upload-box done' : `tutor-upload-box${invalid ? ' invalid' : ''}`}
        onClick={() => !busy && inputRef.current?.click()}
        disabled={busy}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" hidden onChange={handleFile} />
        {fileUrl ? (
          kind === 'photo' ? (
            <>
              <img src={fileUrl} alt="" className="tutor-upload-photo-preview" />
              <span className="tutor-upload-remove" onClick={handleRemove}>Remove &amp; replace</span>
            </>
          ) : (
            <>
              <CheckIcon className="tutor-upload-check" />
              <strong>{label} uploaded</strong>
              <span className="tutor-upload-remove" onClick={handleRemove}>Remove &amp; replace</span>
            </>
          )
        ) : (
          <>
            {icon ?? <UploadCloudIcon />}
            <strong>{busy ? 'Uploading…' : <>{label}{required && <span className="req" aria-hidden="true">*</span>}</>}</strong>
            <span>{hint}</span>
          </>
        )}
      </button>
      {error && <p className="photo-uploader-error">{error}</p>}
      {invalid && !fileUrl && <span className="tutor-onb-error-text" role="alert">{invalidMessage ?? 'This is required.'}</span>}
    </div>
  );
}
