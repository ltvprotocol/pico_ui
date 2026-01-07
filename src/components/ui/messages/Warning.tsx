import { MessageIcon, MessageBase, MessageProps} from "@/components/ui";

export function WarningMessage({ text, className }: MessageProps) {
  return (
    <MessageBase
      text={text}
      className={`bg-yellow-50 border border-yellow-200 text-yellow-800 ${className ?? ""}`}
      icon={<MessageIcon variant="warning" />}
    />
  );
}
