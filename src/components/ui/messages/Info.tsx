import { MessageIcon, MessageBase, MessageProps} from "@/components/ui";

export function InfoMessage({ text, className }: MessageProps) {
  return (
    <MessageBase
      text={text}
      className={`bg-blue-50 border border-blue-200 text-blue-700 ${className ?? ""}`}
      icon={<MessageIcon variant="info" />}
    />
  );
}
