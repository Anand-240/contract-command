import { useRef, useState } from 'react';
import { FileText, Upload, Download, ShieldCheck } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { formatDate } from '@/utils';
import type { DocumentRef } from '@/types';
import { downloadDocument } from '@/services/documentService';

/** Versioned document custody list. Checksums are shown because the record is evidential. */
export function DocumentList({ documents }: { documents: DocumentRef[] }) {
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents on record"
        description="Agreements, inspection notes and correspondence attached to this record will appear here with their version and checksum."
      />
    );
  }

  return (
    <ul className="divide-y divide-line">
      {documents.map((doc) => (
        <li key={doc.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-faint">
            <FileText size={16} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] text-ink">{doc.name}</p>
            <p className="mt-0.5 text-[12px] text-ink-faint">
              Version {doc.version} · {doc.sizeKb} KB · Uploaded by {doc.uploadedBy} on {formatDate(doc.uploadedOn)}
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-[11.5px] text-ink-faint sm:flex" title="Content checksum">
            <ShieldCheck size={13} aria-hidden />
            <span className="code">{doc.checksum}</span>
          </span>
          <Button size="sm" variant="ghost" icon={Download} aria-label={`Download ${doc.name}`} onClick={() => {
            void downloadDocument(doc.id, doc.name).catch(() => window.alert('The document could not be downloaded.'));
          }}>
            Download
          </Button>
        </li>
      ))}
    </ul>
  );
}

export interface DocumentUploaderProps {
  onFiles?: (files: File[]) => void;
  hint?: string;
}

export function DocumentUploader({ onFiles, hint = 'PDF, DOCX or XLSX up to 25 MB. Each upload is versioned and checksummed.' }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queued, setQueued] = useState<string[]>([]);

  const accept = (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    setQueued((current) => [...current, ...files.map((file) => file.name)]);
    onFiles?.(files);
  };

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-md border border-dashed px-4 py-7 text-center transition-colors duration-150 ${
          dragging ? 'border-brand bg-brand-tint' : 'border-line-strong bg-surface-muted'
        }`}
      >
        <Upload size={18} className="text-ink-faint" aria-hidden />
        <p className="mt-2 text-[13px] text-ink">Drag files here, or</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => inputRef.current?.click()}>
          Select files
        </Button>
        <p className="mt-2 text-[11.5px] text-ink-faint">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => accept(event.target.files)}
        />
      </div>

      {queued.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {queued.map((name) => (
            <li key={name} className="flex items-center gap-2 text-[12.5px] text-ink-muted">
              <FileText size={13} className="text-ink-faint" aria-hidden />
              {name}
              <span className="text-[11.5px] text-ink-faint">queued for upload</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
