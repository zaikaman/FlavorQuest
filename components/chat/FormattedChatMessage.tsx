import { Fragment } from 'react';

interface FormattedChatMessageProps {
  content: string;
  className?: string;
}

function renderInlineFormatting(line: string) {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const isBoldSegment = part.startsWith('**') && part.endsWith('**') && part.length > 4;

    if (isBoldSegment) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export function FormattedChatMessage({
  content,
  className = 'whitespace-pre-wrap',
}: FormattedChatMessageProps) {
  const lines = content.split('\n');

  return (
    <p className={className}>
      {lines.map((line, lineIndex) => (
        <Fragment key={`${line}-${lineIndex}`}>
          {renderInlineFormatting(line)}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </p>
  );
}
