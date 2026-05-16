export function MessageText({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="min-w-0 flex-1 space-y-2 text-sm leading-6">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-2" />;
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.+)/);
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
        const checklistMatch = trimmed.match(/^[-*]\s+\[( |x|X)\]\s+(.+)/);
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)/);

        if (headingMatch) {
          const sizeClass = headingMatch[1].length === 1 ? 'text-base' : 'text-sm';
          return (
            <p key={index} className={`${sizeClass} pt-1 font-bold`}>
              {headingMatch[2]}
            </p>
          );
        }

        if (checklistMatch) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border border-current text-[10px] opacity-70">
                {checklistMatch[1].toLowerCase() === 'x' ? 'x' : ''}
              </span>
              <span>{checklistMatch[2]}</span>
            </div>
          );
        }

        if (numberedMatch) {
          return (
            <div key={index} className="flex gap-2">
              <span className="min-w-5 text-right font-semibold opacity-70">{numberedMatch[1]}.</span>
              <span>{numberedMatch[2]}</span>
            </div>
          );
        }

        if (bulletMatch) {
          return (
            <div key={index} className="flex gap-2">
              <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
              <span>{bulletMatch[1]}</span>
            </div>
          );
        }

        return <p key={index}>{trimmed}</p>;
      })}
    </div>
  );
}
