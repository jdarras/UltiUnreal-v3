import { useEffect, useMemo, useState } from "react";
import { normalizeThumbCandidates } from "../../shared/helpers";

function ResourceThumbImage({ candidates = [], className = "", alt = "" }) {
  const list = useMemo(() => normalizeThumbCandidates(candidates), [candidates]);
  const signature = useMemo(() => list.join("||"), [list]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [signature]);

  if (list.length === 0 || index < 0) return null;
  const safeIndex = Math.min(index, list.length - 1);
  const src = list[safeIndex];
  if (!src) return null;

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => {
        setIndex((prev) => {
          if (prev + 1 < list.length) return prev + 1;
          return -1;
        });
      }}
    />
  );
}

export { ResourceThumbImage };
export default ResourceThumbImage;

