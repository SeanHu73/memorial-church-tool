'use client';

/**
 * Shared component that renders text interleaved with photos using
 * [photo:N] markers. Used by SeedCard, NoticeCard, and RevealCard.
 */

interface Photo {
  url: string;
  caption: string | null;
}

interface Props {
  text: string;
  photos: Photo[];
  /** Legacy single photo — merged as photo 0 before the array */
  legacyPhotoUrl?: string | null;
  legacyPhotoCaption?: string | null;
  /** CSS class for text blocks */
  textClass?: string;
  /** Optional left border on text blocks */
  borderColor?: string;
}

export default function PhotoContent({
  text,
  photos,
  legacyPhotoUrl,
  legacyPhotoCaption,
  textClass = 'text-[17px] leading-relaxed font-serif text-[#2C2418]',
  borderColor,
}: Props) {
  // Build full photo list: legacy + array
  const allPhotos: Photo[] = [
    ...(legacyPhotoUrl ? [{ url: legacyPhotoUrl, caption: legacyPhotoCaption ?? null }] : []),
    ...photos,
  ].filter((p) => p.url);

  // If no markers in text, render text then all photos
  if (!/\[photo:\d+\]/i.test(text)) {
    return (
      <div className="space-y-5">
        {text.trim() && (
          <div className={borderColor ? `border-l-4 pl-4` : ''} style={borderColor ? { borderColor } : undefined}>
            <p className={textClass}>{text}</p>
          </div>
        )}
        {allPhotos.map((photo, i) => (
          <PhotoBlock key={i} photo={photo} />
        ))}
      </div>
    );
  }

  // Split on [photo:N] markers
  const parts = text.split(/\[photo:(\d+)\]/gi);
  const usedIndices = new Set<number>();

  return (
    <div className="space-y-5">
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const idx = parseInt(part, 10) - 1;
          if (idx >= 0 && idx < allPhotos.length) {
            usedIndices.add(idx);
            return <PhotoBlock key={`p-${i}`} photo={allPhotos[idx]} />;
          }
          return null;
        }
        const trimmed = part.trim();
        if (!trimmed) return null;
        return (
          <div
            key={`t-${i}`}
            className={borderColor ? `border-l-4 pl-4` : ''}
            style={borderColor ? { borderColor } : undefined}
          >
            <p className={textClass}>{trimmed}</p>
          </div>
        );
      })}

      {/* Remaining photos not placed by markers */}
      {allPhotos.map((photo, i) => {
        if (usedIndices.has(i)) return null;
        return <PhotoBlock key={`r-${i}`} photo={photo} />;
      })}
    </div>
  );
}

function PhotoBlock({ photo }: { photo: Photo }) {
  return (
    <div className="rounded-lg overflow-hidden shadow-md border border-[#D4BFA0] my-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || ''}
        className="w-full h-40 object-cover"
      />
      {photo.caption && (
        <p className="text-xs text-[#6B5D4F] px-3 py-1.5 bg-[#F0E0C8]/50 italic">
          {photo.caption}
        </p>
      )}
    </div>
  );
}
